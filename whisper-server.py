#!/usr/bin/env python3
"""
MLX Whisper Transcription Server
A lightweight Flask server that provides OpenAI-compatible transcription endpoints
using the mlx-whisper package with whisper-large-v3-turbo model.
"""

import os
import tempfile
import time
import wave
import struct
import subprocess
from flask import Flask, request, jsonify
from flask_cors import CORS
import mlx_whisper
import numpy as np
import soundfile as sf

# VAD imports (import conditionally to handle missing dependency)
try:
    import webrtcvad
    VAD_AVAILABLE = True
except ImportError:
    VAD_AVAILABLE = False
    print("⚠️ webrtcvad not available - VAD features disabled")

app = Flask(__name__)
CORS(app)  # Enable CORS for browser requests

# Configuration from environment variables
MODEL_NAME = os.getenv("WHISPER_MODEL", "mlx-community/whisper-large-v3-turbo")
PORT = 8001
HOST = 'localhost'

# Whisper processing configuration
WHISPER_NO_CONTEXT = int(os.getenv("WHISPER_NO_CONTEXT", "1"))
WHISPER_TEMPERATURE = float(os.getenv("WHISPER_TEMPERATURE", "0.2"))
WHISPER_NO_SPEECH_TH = float(os.getenv("WHISPER_NO_SPEECH_TH", "0.65"))
WHISPER_COMP_RATIO_TH = float(os.getenv("WHISPER_COMP_RATIO_TH", "2.2"))
WHISPER_LOGPROB_TH = float(os.getenv("WHISPER_LOGPROB_TH", "-0.5"))

# VAD configuration
VAD_ENABLED = int(os.getenv("VAD_ENABLED", "1"))
VAD_MODE = int(os.getenv("VAD_MODE", "2"))
VAD_FRAME_MS = int(os.getenv("VAD_FRAME_MS", "30"))
VAD_MIN_SIL_MS = int(os.getenv("VAD_MIN_SIL_MS", "200"))

# Repetition guard configuration
REPEAT_NGRAM = int(os.getenv("REPEAT_NGRAM", "2"))
REPEAT_LIMIT = int(os.getenv("REPEAT_LIMIT", "6"))

# Global model status tracking
model_loaded = False
model_path = MODEL_NAME

def vad_preprocess(audio_path):
    """
    Preprocess audio with Voice Activity Detection (VAD) to remove silence/noise.
    Returns path to processed audio file or None if no speech detected.
    """
    if not VAD_AVAILABLE or not VAD_ENABLED:
        print("🔇 VAD disabled or unavailable, using original audio")
        return audio_path
    
    try:
        print(f"🎙️ VAD preprocessing: {audio_path}")
        
        # Load audio using soundfile
        audio_data, sample_rate = sf.read(audio_path)
        
        # Convert to mono if stereo
        if len(audio_data.shape) > 1:
            audio_data = np.mean(audio_data, axis=1)
            print(f"🔄 Converted stereo to mono")
        
        # Resample to 16kHz for WebRTC VAD (required)
        if sample_rate != 16000:
            print(f"🔄 Resampling from {sample_rate}Hz to 16000Hz")
            # Simple resampling - for production, consider using librosa.resample
            resample_ratio = 16000 / sample_rate
            audio_data = np.interp(
                np.linspace(0, len(audio_data), int(len(audio_data) * resample_ratio)),
                np.arange(len(audio_data)),
                audio_data
            )
            sample_rate = 16000
        
        # Convert to 16-bit integers (WebRTC VAD requirement)
        audio_int16 = (audio_data * 32767).astype(np.int16)
        
        # Initialize VAD
        vad = webrtcvad.Vad(VAD_MODE)
        
        # Frame size for VAD (10, 20, or 30ms at 16kHz)
        frame_duration = VAD_FRAME_MS / 1000.0  # Convert to seconds
        frame_size = int(16000 * frame_duration)  # Number of samples per frame
        
        print(f"🎤 VAD settings: Mode={VAD_MODE}, Frame={VAD_FRAME_MS}ms ({frame_size} samples)")
        
        # Process audio in frames
        speech_frames = []
        total_frames = 0
        speech_frame_count = 0
        
        for i in range(0, len(audio_int16), frame_size):
            frame = audio_int16[i:i+frame_size]
            
            # Pad last frame if necessary
            if len(frame) < frame_size:
                frame = np.pad(frame, (0, frame_size - len(frame)), 'constant')
            
            total_frames += 1
            
            # VAD requires bytes
            frame_bytes = frame.tobytes()
            
            # Check if frame contains speech
            is_speech = vad.is_speech(frame_bytes, 16000)
            
            if is_speech:
                speech_frame_count += 1
                
            speech_frames.append((frame, is_speech))
        
        print(f"📊 VAD analysis: {speech_frame_count}/{total_frames} frames contain speech ({speech_frame_count/total_frames*100:.1f}%)")
        
        # If no speech detected, return None
        if speech_frame_count == 0:
            print("🔇 No speech detected, returning empty result")
            return None
        
        # Concatenate speech segments, handling small gaps
        output_frames = []
        in_speech_segment = False
        silence_gap_frames = 0
        max_silence_frames = int((VAD_MIN_SIL_MS / 1000.0) / frame_duration)
        
        for frame, is_speech in speech_frames:
            if is_speech:
                # Add any buffered silence if we were in a gap
                if silence_gap_frames > 0 and in_speech_segment:
                    # Add the silence frames we buffered
                    for _ in range(min(silence_gap_frames, max_silence_frames)):
                        output_frames.append(np.zeros(frame_size, dtype=np.int16))
                
                output_frames.append(frame)
                in_speech_segment = True
                silence_gap_frames = 0
            else:
                if in_speech_segment:
                    silence_gap_frames += 1
                    # If silence gap is too long, end the segment
                    if silence_gap_frames > max_silence_frames:
                        in_speech_segment = False
                        silence_gap_frames = 0
        
        if len(output_frames) == 0:
            print("🔇 No speech segments after gap filtering")
            return None
        
        # Concatenate all speech frames
        processed_audio = np.concatenate(output_frames)
        
        # Convert back to float for saving
        processed_audio_float = processed_audio.astype(np.float32) / 32767.0
        
        # Save processed audio
        output_path = tempfile.mktemp(suffix='_vad.wav')
        sf.write(output_path, processed_audio_float, 16000)
        
        original_duration = len(audio_data) / sample_rate
        processed_duration = len(processed_audio_float) / 16000
        compression_ratio = processed_duration / original_duration if original_duration > 0 else 0
        
        print(f"✅ VAD completed: {original_duration:.2f}s → {processed_duration:.2f}s (compression: {compression_ratio:.2f})")
        
        return output_path
        
    except Exception as e:
        print(f"❌ VAD preprocessing failed: {e}")
        print("🔄 Falling back to original audio")
        return audio_path

def validate_transcription_quality(text, audio_duration=0):
    """
    Validate transcription quality and detect common false positive patterns.
    Returns filtered text or None if transcription appears to be false positive.
    """
    if not text or len(text.strip()) == 0:
        return ""
    
    text_clean = text.strip().lower()
    
    # Common false positive patterns (often transcribed from silence)
    false_positives = [
        "thank you", "thanks", "thank you.", "thanks.",
        "goodbye", "good bye", "bye", "okay", "ok",
        "hello", "hi", "hey", "um", "uh", "hmm"
    ]
    
    # If transcription is very short and matches common false positives
    if len(text_clean.split()) <= 3:
        for false_positive in false_positives:
            if text_clean == false_positive or text_clean.endswith(false_positive):
                print(f"🚨 Detected likely false positive: '{text}' (common silence transcription)")
                # If audio was very short, likely false positive
                if audio_duration > 0 and audio_duration < 2:
                    print(f"   Audio duration was only {audio_duration:.1f}s - likely silence")
                    return ""
                else:
                    print(f"   Audio duration {audio_duration:.1f}s - flagging for review")
                    return f"[FLAGGED: Possible false transcription] {text}"
    
    # Check for extremely repetitive single words
    words = text_clean.split()
    if len(words) >= 5:
        word_counts = {}
        for word in words:
            word_counts[word] = word_counts.get(word, 0) + 1
        
        # If any single word appears more than 70% of the time, likely false
        max_word_count = max(word_counts.values())
        if max_word_count / len(words) > 0.7:
            print(f"🚨 Detected excessive word repetition in transcription")
            return f"[FLAGGED: Excessive repetition] {text[:100]}..."
    
    return text

def collapse_repetitions(text):
    """
    Post-process transcribed text to collapse repetitive patterns.
    Detects when the same n-gram repeats more than REPEAT_LIMIT times.
    """
    if not text or len(text.strip()) == 0:
        return text
    
    try:
        words = text.strip().split()
        if len(words) < REPEAT_NGRAM * 2:
            return text
        
        # Look for repetitive n-grams
        output_words = []
        i = 0
        
        while i < len(words):
            if i + REPEAT_NGRAM * 2 >= len(words):
                # Not enough words left for a repetitive pattern
                output_words.extend(words[i:])
                break
            
            # Check if we have a repetitive pattern starting at position i
            ngram = words[i:i+REPEAT_NGRAM]
            repetition_count = 1
            
            # Count consecutive repetitions
            pos = i + REPEAT_NGRAM
            while pos + REPEAT_NGRAM <= len(words):
                next_ngram = words[pos:pos+REPEAT_NGRAM]
                if next_ngram == ngram:
                    repetition_count += 1
                    pos += REPEAT_NGRAM
                else:
                    break
            
            if repetition_count > REPEAT_LIMIT:
                print(f"🔄 Collapsed repetition: '{' '.join(ngram)}' x {repetition_count} → x {REPEAT_LIMIT}")
                # Add the n-gram only REPEAT_LIMIT times
                for _ in range(REPEAT_LIMIT):
                    output_words.extend(ngram)
                i = pos  # Skip past all the repetitions
            else:
                # No repetitive pattern, add the current word
                output_words.append(words[i])
                i += 1
        
        result = ' '.join(output_words)
        
        if len(result) < len(text) * 0.8:  # Significant reduction
            print(f"📝 Text length after repetition collapse: {len(text)} → {len(result)} chars")
        
        return result
        
    except Exception as e:
        print(f"❌ Repetition collapse failed: {e}")
        return text

def transcribe_with_guards(audio_path, language=None):
    """
    Enhanced transcription function with VAD preprocessing and configurable options.
    """
    try:
        # Step 1: VAD preprocessing
        processed_audio_path = vad_preprocess(audio_path)
        
        if processed_audio_path is None:
            print("🔇 VAD detected no speech - returning empty transcript")
            return {
                "text": "",
                "language": "unknown",
                "segments": []
            }
        
        # Step 2: MLX Whisper transcription with enhanced configuration
        print(f"🤖 Transcribing with MLX Whisper...")
        print(f"   - condition_on_previous_text: {not bool(WHISPER_NO_CONTEXT)}")
        print(f"   - temperature: {WHISPER_TEMPERATURE}")
        print(f"   - no_speech_threshold: {WHISPER_NO_SPEECH_TH}")
        print(f"   - compression_ratio_threshold: {WHISPER_COMP_RATIO_TH}")
        print(f"   - logprob_threshold: {WHISPER_LOGPROB_TH}")
        
        result = mlx_whisper.transcribe(
            processed_audio_path,
            path_or_hf_repo=MODEL_NAME,
            language=language,
            condition_on_previous_text=not bool(WHISPER_NO_CONTEXT),
            temperature=WHISPER_TEMPERATURE,
            no_speech_threshold=WHISPER_NO_SPEECH_TH,
            compression_ratio_threshold=WHISPER_COMP_RATIO_TH,
            logprob_threshold=WHISPER_LOGPROB_TH
        )
        
        # Step 3: Validate transcription quality and post-process text
        if "text" in result:
            original_text = result["text"].strip()
            
            # Calculate audio duration if we have the file
            audio_duration = 0
            try:
                if processed_audio_path and os.path.exists(processed_audio_path):
                    import soundfile as sf
                    audio_data, sample_rate = sf.read(processed_audio_path)
                    audio_duration = len(audio_data) / sample_rate
            except:
                pass
            
            # Validate transcription quality (detect false positives)
            validated_text = validate_transcription_quality(original_text, audio_duration)
            
            # Apply repetition collapse to validated text
            processed_text = collapse_repetitions(validated_text)
            result["text"] = processed_text
        
        # Clean up VAD processed file if different from original
        if processed_audio_path != audio_path and os.path.exists(processed_audio_path):
            os.unlink(processed_audio_path)
        
        return result
        
    except Exception as e:
        # Clean up on error
        if processed_audio_path and processed_audio_path != audio_path and os.path.exists(processed_audio_path):
            os.unlink(processed_audio_path)
        raise e

def load_model():
    """Pre-warm the Whisper model by running a dummy transcription"""
    global model_loaded
    
    if not model_loaded:
        print(f"🔄 Pre-warming Whisper model: {MODEL_NAME}")
        print("📝 This may take a few minutes on first run...")
        start_time = time.time()
        
        try:
            # Create a tiny dummy audio file to warm up the model (1 second of silence)
            dummy_file = tempfile.mktemp(suffix='.wav')
            
            # Create a simple WAV file with 1 second of silence
            with wave.open(dummy_file, 'w') as wav_file:
                wav_file.setnchannels(1)  # Mono
                wav_file.setsampwidth(2)  # 16-bit
                wav_file.setframerate(16000)  # 16kHz
                
                # Write 1 second of silence (16000 samples of value 0)
                silence = struct.pack('<' + 'h' * 16000, *([0] * 16000))
                wav_file.writeframes(silence)
            
            # Run dummy transcription to load model into memory
            result = mlx_whisper.transcribe(
                dummy_file,
                path_or_hf_repo=MODEL_NAME,
                language=None
            )
            
            # Clean up dummy file
            os.unlink(dummy_file)
            
            load_time = time.time() - start_time
            print(f"✅ Model pre-warmed in {load_time:.2f} seconds")
            model_loaded = True
            
        except Exception as e:
            print(f"⚠️ Model pre-warming failed: {e}")
            print("🔄 Model will load on first transcription request")
            # Don't set model_loaded = True, let it load on first request
    
    return model_loaded

def convert_audio_to_wav(input_file):
    """Convert audio file to WAV format using ffmpeg"""
    output_file = tempfile.mktemp(suffix='.wav')
    
    try:
        # Use ffmpeg to convert to WAV (16kHz, mono)
        cmd = [
            'ffmpeg', '-i', input_file,
            '-acodec', 'pcm_s16le',  # 16-bit PCM
            '-ac', '1',              # Mono
            '-ar', '16000',          # 16kHz sample rate
            '-y',                    # Overwrite output file
            output_file
        ]
        
        print(f"🔄 Converting audio: {' '.join(cmd)}")
        result = subprocess.run(cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"❌ FFmpeg conversion failed: {result.stderr}")
            return None
            
        print(f"✅ Audio converted successfully: {output_file}")
        print(f"📊 Output file size: {os.path.getsize(output_file)} bytes")
        return output_file
        
    except FileNotFoundError:
        print("❌ FFmpeg not found. Please install ffmpeg for audio conversion.")
        print("   brew install ffmpeg")
        return None
    except Exception as e:
        print(f"❌ Audio conversion error: {e}")
        return None

@app.route('/v1/audio/transcriptions', methods=['POST'])
def transcribe_audio():
    """OpenAI-compatible transcription endpoint"""
    try:
        # Check if file is in request
        if 'file' not in request.files:
            return jsonify({
                'error': {
                    'message': 'No audio file provided',
                    'type': 'invalid_request_error'
                }
            }), 400
        
        audio_file = request.files['file']
        
        if audio_file.filename == '':
            return jsonify({
                'error': {
                    'message': 'No audio file selected',
                    'type': 'invalid_request_error'
                }
            }), 400
        
        # Get optional parameters
        model = request.form.get('model', MODEL_NAME)
        response_format = request.form.get('response_format', 'json')
        language = request.form.get('language', None)  # Auto-detect if None
        
        print(f"🎤 Transcribing audio file: {audio_file.filename}")
        print(f"📝 Model: {model}")
        print(f"🌍 Language: {language or 'auto-detect'}")
        
        # Ensure model is loaded (will pre-warm if needed)
        if not model_loaded:
            print("🔄 Model not pre-warmed, loading now...")
            load_model()
        
        # Save uploaded file temporarily and convert if needed
        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as temp_file:
            audio_file.save(temp_file.name)
            temp_filename = temp_file.name
        
        print(f"📁 Temporary file: {temp_filename}")
        print(f"📊 File size: {os.path.getsize(temp_filename)} bytes")
        
        # Additional file validation
        if os.path.getsize(temp_filename) < 100:
            print(f"⚠️ WARNING: File very small ({os.path.getsize(temp_filename)} bytes) - may be empty or corrupted")
        
        # Try to read file header to validate it's actually an audio file
        try:
            with open(temp_filename, 'rb') as f:
                header = f.read(12)
                print(f"📋 File header: {header[:12].hex() if len(header) >= 12 else 'insufficient data'}")
                
                # Check for common audio file signatures
                if header.startswith(b'RIFF'):
                    print("✅ Detected WAV file signature")
                elif b'webm' in header.lower():
                    print("✅ Detected WebM file signature")
                elif header.startswith(b'ID3') or header[0:2] == b'\xff\xfb':
                    print("✅ Detected MP3 file signature")
                else:
                    print("⚠️ Unknown file signature - may not be valid audio")
        except Exception as header_error:
            print(f"⚠️ Could not read file header: {header_error}")
        
        # Convert WebM to WAV for better compatibility
        wav_filename = convert_audio_to_wav(temp_filename)
        if wav_filename is None:
            # If conversion fails, try original file
            print("⚠️ Using original WebM file (conversion failed)")
            wav_filename = temp_filename
        
        try:
            # Transcribe using MLX Whisper
            start_time = time.time()
            
            print(f"🔄 Starting MLX Whisper transcription on: {wav_filename}")
            
            # Log audio file details before transcription
            try:
                audio_stats = os.stat(wav_filename)
                print(f"📊 Audio file stats - Size: {audio_stats.st_size} bytes, Modified: {time.ctime(audio_stats.st_mtime)}")
                
                # If it's a WAV file, try to get more details
                if wav_filename.endswith('.wav'):
                    try:
                        with wave.open(wav_filename, 'rb') as wav_info:
                            frames = wav_info.getnframes()
                            sample_rate = wav_info.getframerate()
                            channels = wav_info.getnchannels()
                            duration = frames / sample_rate if sample_rate > 0 else 0
                            print(f"🎵 WAV details - Duration: {duration:.2f}s, Sample Rate: {sample_rate}Hz, Channels: {channels}, Frames: {frames}")
                            
                            if duration < 0.5:
                                print("⚠️ WARNING: Audio duration very short - may result in poor transcription")
                            if sample_rate != 16000:
                                print(f"ℹ️ Sample rate {sample_rate}Hz (Whisper prefers 16000Hz)")
                    except Exception as wav_error:
                        print(f"⚠️ Could not read WAV details: {wav_error}")
            except Exception as stat_error:
                print(f"⚠️ Could not get file stats: {stat_error}")
            
            result = transcribe_with_guards(
                wav_filename,
                language=language  # None for auto-detection
            )
            
            print(f"📝 Raw transcription result type: {type(result)}")
            print(f"📝 Raw transcription result keys: {list(result.keys()) if isinstance(result, dict) else 'not a dict'}")
            print(f"📝 Full raw result: {result}")
            
            transcription_time = time.time() - start_time
            
            # Extract transcription text with additional validation
            transcribed_text = result.get("text", "").strip()
            
            # Additional result analysis
            if isinstance(result, dict):
                language_detected = result.get("language", "unknown")
                segments = result.get("segments", [])
                print(f"🌍 Detected language: {language_detected}")
                print(f"📍 Number of segments: {len(segments) if isinstance(segments, list) else 'not available'}")
                
                if isinstance(segments, list) and len(segments) > 0:
                    print("📋 Segment details:")
                    for i, segment in enumerate(segments[:3]):  # Show first 3 segments
                        if isinstance(segment, dict):
                            start = segment.get('start', 'unknown')
                            end = segment.get('end', 'unknown')
                            text = segment.get('text', 'unknown')
                            print(f"   Segment {i+1}: {start}-{end}s: '{text}'")
            
            # Check for common problematic outputs
            if transcribed_text.lower() in ['thank you', 'thanks', 'thank you.', '']:
                print(f"🚨 ALERT: Suspicious transcription result: '{transcribed_text}'")
                print("💡 This might indicate:")
                print("   - Audio too short or quiet")
                print("   - File corruption during upload")
                print("   - Model defaulting to common phrases")
                print("   - Audio format conversion issues")
            
            # Clean up temp files
            os.unlink(temp_filename)
            if wav_filename != temp_filename and os.path.exists(wav_filename):
                os.unlink(wav_filename)
            
            print(f"✅ Transcription completed in {transcription_time:.2f} seconds")
            print(f"📄 Final result: '{transcribed_text}' (length: {len(transcribed_text)} chars)")
            print(f"📊 Performance: {len(transcribed_text)/transcription_time:.1f} chars/second" if transcription_time > 0 else "")
            
            # Return in OpenAI format
            if response_format == 'text':
                return transcribed_text, 200, {'Content-Type': 'text/plain'}
            else:
                return jsonify({
                    "text": transcribed_text,
                    "duration": transcription_time,
                    "model": model
                })
                
        except Exception as transcription_error:
            # Clean up temp files on error
            if os.path.exists(temp_filename):
                os.unlink(temp_filename)
            if wav_filename != temp_filename and os.path.exists(wav_filename):
                os.unlink(wav_filename)
            
            print(f"❌ Transcription error: {transcription_error}")
            return jsonify({
                'error': {
                    'message': f'Transcription failed: {str(transcription_error)}',
                    'type': 'transcription_error'
                }
            }), 500
            
    except Exception as e:
        print(f"❌ Server error: {e}")
        return jsonify({
            'error': {
                'message': f'Server error: {str(e)}',
                'type': 'server_error'
            }
        }), 500

@app.route('/v1/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        # Check actual model loading status
        model_status = "loaded" if model_loaded else "not_loaded"
        
        return jsonify({
            "status": "ok",
            "model": MODEL_NAME,
            "model_status": model_status,
            "server": "MLX Whisper Server",
            "version": "2.0.0",
            "timestamp": int(time.time()),
            "features": {
                "vad_enabled": VAD_ENABLED and VAD_AVAILABLE,
                "vad_available": VAD_AVAILABLE,
                "repetition_guard": True,
                "no_prior_context": bool(WHISPER_NO_CONTEXT)
            },
            "config": {
                "vad_mode": VAD_MODE,
                "vad_frame_ms": VAD_FRAME_MS,
                "temperature": WHISPER_TEMPERATURE,
                "no_speech_threshold": WHISPER_NO_SPEECH_TH,
                "repeat_limit": REPEAT_LIMIT
            }
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

@app.route('/test/vad', methods=['GET'])
def test_vad():
    """Test VAD functionality with a silent audio clip"""
    try:
        if not VAD_AVAILABLE:
            return jsonify({
                "status": "skipped", 
                "message": "VAD not available - webrtcvad not installed"
            })
        
        if not VAD_ENABLED:
            return jsonify({
                "status": "skipped", 
                "message": "VAD disabled via config"
            })
        
        # Create 2 seconds of silence at 16kHz
        print("🧪 Testing VAD with 2 seconds of silence...")
        sample_rate = 16000
        duration = 2.0
        silence = np.zeros(int(sample_rate * duration), dtype=np.float32)
        
        # Save to temporary file
        test_file = tempfile.mktemp(suffix='_vad_test.wav')
        sf.write(test_file, silence, sample_rate)
        
        # Test VAD preprocessing
        result_path = vad_preprocess(test_file)
        
        # Clean up
        os.unlink(test_file)
        
        if result_path is None:
            return jsonify({
                "status": "pass",
                "message": "VAD correctly detected no speech in silent audio"
            })
        else:
            # Clean up result file if created
            if os.path.exists(result_path):
                os.unlink(result_path)
            return jsonify({
                "status": "warning",
                "message": "VAD should have detected no speech in silent audio"
            })
            
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"VAD test failed: {str(e)}"
        }), 500

@app.route('/test/repetition', methods=['GET'])
def test_repetition_guard():
    """Test repetition guard with pathological text"""
    try:
        # Create a text with excessive repetition
        test_text = "here on my " * 40  # 120 words total
        
        print(f"🧪 Testing repetition guard with {len(test_text.split())} words...")
        result = collapse_repetitions(test_text)
        
        expected_max_length = REPEAT_LIMIT * REPEAT_NGRAM * len("here on my ")
        
        return jsonify({
            "status": "pass" if len(result) <= expected_max_length else "warning",
            "original_length": len(test_text),
            "processed_length": len(result),
            "original_word_count": len(test_text.split()),
            "processed_word_count": len(result.split()),
            "expected_max_words": REPEAT_LIMIT * REPEAT_NGRAM,
            "message": f"Collapsed from {len(test_text.split())} to {len(result.split())} words"
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Repetition test failed: {str(e)}"
        }), 500

@app.route('/v1/models', methods=['GET'])
def list_models():
    """List available models (OpenAI-compatible)"""
    return jsonify({
        "object": "list",
        "data": [
            {
                "id": MODEL_NAME,
                "object": "model",
                "created": int(time.time()),
                "owned_by": "mlx-community"
            }
        ]
    })

@app.route('/debug/test-audio', methods=['POST'])
def test_audio_upload():
    """Debug endpoint to test audio file upload without transcription"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        audio_file = request.files['file']
        if audio_file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Save file temporarily and analyze
        with tempfile.NamedTemporaryFile(delete=False, suffix='.webm') as temp_file:
            audio_file.save(temp_file.name)
            temp_filename = temp_file.name
        
        # Analyze file
        file_info = {
            'filename': audio_file.filename,
            'size': os.path.getsize(temp_filename),
            'content_type': audio_file.content_type
        }
        
        # Read file header
        with open(temp_filename, 'rb') as f:
            header = f.read(32)
            file_info['header_hex'] = header.hex()
            file_info['header_ascii'] = ''.join(chr(b) if 32 <= b <= 126 else '.' for b in header)
        
        # Try conversion
        wav_filename = convert_audio_to_wav(temp_filename)
        if wav_filename and wav_filename != temp_filename:
            file_info['conversion_success'] = True
            file_info['wav_size'] = os.path.getsize(wav_filename)
            
            # Get WAV details
            try:
                with wave.open(wav_filename, 'rb') as wav_info:
                    file_info['wav_details'] = {
                        'duration': wav_info.getnframes() / wav_info.getframerate(),
                        'sample_rate': wav_info.getframerate(),
                        'channels': wav_info.getnchannels(),
                        'frames': wav_info.getnframes()
                    }
            except:
                file_info['wav_details'] = 'Could not read WAV details'
                
            os.unlink(wav_filename)
        else:
            file_info['conversion_success'] = False
        
        # Clean up
        os.unlink(temp_filename)
        
        return jsonify({
            'status': 'success',
            'message': 'File analyzed successfully',
            'file_info': file_info
        })
        
    except Exception as e:
        return jsonify({'error': f'Test failed: {str(e)}'}), 500

@app.route('/', methods=['GET'])
def root():
    """Root endpoint with server info"""
    return jsonify({
        "message": "MLX Whisper Transcription Server with VAD + Repetition Guard",
        "model": MODEL_NAME,
        "version": "2.0.0",
        "endpoints": {
            "transcribe": "/v1/audio/transcriptions",
            "health": "/v1/health", 
            "models": "/v1/models",
            "debug_test": "/debug/test-audio",
            "test_vad": "/test/vad",
            "test_repetition": "/test/repetition"
        },
        "features": {
            "vad_enabled": VAD_ENABLED and VAD_AVAILABLE,
            "repetition_guard": True,
            "no_prior_context": bool(WHISPER_NO_CONTEXT),
            "offline_mode": True
        },
        "status": "running",
        "debug": {
            "test_command": "curl -X POST -F 'file=@audio.webm' http://localhost:8001/v1/audio/transcriptions",
            "vad_test": "curl http://localhost:8001/test/vad",
            "repetition_test": "curl http://localhost:8001/test/repetition"
        }
    })

if __name__ == '__main__':
    print("🚀 Starting MLX Whisper Transcription Server")
    print(f"📍 Server will run on http://{HOST}:{PORT}")
    print(f"🤖 Model: {MODEL_NAME}")
    print("🔗 Endpoints:")
    print(f"   - Transcription: http://{HOST}:{PORT}/v1/audio/transcriptions")
    print(f"   - Health Check: http://{HOST}:{PORT}/v1/health")
    print(f"   - Models List: http://{HOST}:{PORT}/v1/models")
    print("\n💡 Usage:")
    print("   curl -X POST -F 'file=@audio.webm' http://localhost:8001/v1/audio/transcriptions")
    print("\n🔧 To install dependencies:")
    print("   pip install mlx-whisper flask flask-cors")
    print("\n" + "="*60)
    
    # Pre-warm the model on startup for better performance
    print("\n🔥 Pre-warming model on startup...")
    load_model()
    
    try:
        app.run(host=HOST, port=PORT, debug=False)
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"\n❌ Server failed to start: {e}")
        print("💡 Make sure port 8001 is available and dependencies are installed")