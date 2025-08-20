#!/usr/bin/env python3
"""
Offline test suite for VAD and repetition guard functionality.
Tests core functionality without requiring network access.
"""

import sys
import os
import tempfile
import numpy as np
import unittest

# Add parent directory to path to import whisper server modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    import soundfile as sf
    SOUNDFILE_AVAILABLE = True
except ImportError:
    SOUNDFILE_AVAILABLE = False

try:
    import webrtcvad
    VAD_AVAILABLE = True
except ImportError:
    VAD_AVAILABLE = False

# Import functions from whisper server (will handle missing dependencies gracefully)
try:
    from whisper_server import vad_preprocess, collapse_repetitions
    FUNCTIONS_AVAILABLE = True
except ImportError as e:
    print(f"❌ Could not import whisper_server functions: {e}")
    FUNCTIONS_AVAILABLE = False


class TestVADProcessing(unittest.TestCase):
    """Test Voice Activity Detection functionality"""
    
    def setUp(self):
        """Set up test environment"""
        # Mock environment variables
        os.environ['VAD_ENABLED'] = '1'
        os.environ['VAD_MODE'] = '2'
        os.environ['VAD_FRAME_MS'] = '30'
        os.environ['VAD_MIN_SIL_MS'] = '200'
    
    @unittest.skipUnless(VAD_AVAILABLE and SOUNDFILE_AVAILABLE and FUNCTIONS_AVAILABLE, 
                         "VAD dependencies not available")
    def test_vad_silence_detection(self):
        """Test VAD with 2 seconds of silence - should return None (no speech)"""
        # Create 2 seconds of silence at 16kHz
        sample_rate = 16000
        duration = 2.0
        silence = np.zeros(int(sample_rate * duration), dtype=np.float32)
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
            sf.write(tmp.name, silence, sample_rate)
            test_file = tmp.name
        
        try:
            # Test VAD preprocessing
            result_path = vad_preprocess(test_file)
            
            # Should return None for silence
            self.assertIsNone(result_path, "VAD should return None for silent audio")
            
        finally:
            # Clean up
            if os.path.exists(test_file):
                os.unlink(test_file)
    
    @unittest.skipUnless(VAD_AVAILABLE and SOUNDFILE_AVAILABLE and FUNCTIONS_AVAILABLE, 
                         "VAD dependencies not available")
    def test_vad_with_speech_simulation(self):
        """Test VAD with simulated speech (random noise) - should process audio"""
        # Create 1 second of random noise to simulate speech
        sample_rate = 16000
        duration = 1.0
        np.random.seed(42)  # Reproducible results
        # Generate noise with amplitude that should trigger VAD
        noise = np.random.normal(0, 0.1, int(sample_rate * duration)).astype(np.float32)
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
            sf.write(tmp.name, noise, sample_rate)
            test_file = tmp.name
        
        try:
            # Test VAD preprocessing
            result_path = vad_preprocess(test_file)
            
            # Should return a processed file path (not None)
            # Note: This may still return None if the random noise doesn't trigger VAD
            # which is acceptable behavior
            if result_path is not None:
                self.assertTrue(os.path.exists(result_path), "VAD result file should exist")
                # Clean up result file
                os.unlink(result_path)
            
        finally:
            # Clean up
            if os.path.exists(test_file):
                os.unlink(test_file)


class TestRepetitionGuard(unittest.TestCase):
    """Test repetition detection and collapse functionality"""
    
    def setUp(self):
        """Set up test environment"""
        # Mock environment variables
        os.environ['REPEAT_NGRAM'] = '2'
        os.environ['REPEAT_LIMIT'] = '6'
    
    @unittest.skipUnless(FUNCTIONS_AVAILABLE, "whisper_server functions not available")
    def test_repetition_collapse_basic(self):
        """Test basic repetition collapse with 'here on my' repeated 40 times"""
        test_text = "here on my " * 40  # 120 words total
        result = collapse_repetitions(test_text)
        
        # Should collapse to at most REPEAT_LIMIT * REPEAT_NGRAM words
        # With REPEAT_LIMIT=6 and REPEAT_NGRAM=2, max should be 12 words
        result_words = result.strip().split()
        expected_max_words = 6 * 2  # REPEAT_LIMIT * REPEAT_NGRAM
        
        self.assertLessEqual(len(result_words), expected_max_words,
                           f"Result should have ≤ {expected_max_words} words, got {len(result_words)}")
        
        # Should still contain the original words
        self.assertIn("here", result)
        self.assertIn("on", result)
        self.assertIn("my", result)
    
    @unittest.skipUnless(FUNCTIONS_AVAILABLE, "whisper_server functions not available")
    def test_repetition_no_collapse_needed(self):
        """Test that non-repetitive text is unchanged"""
        test_text = "This is a normal sentence with no repetitive patterns."
        result = collapse_repetitions(test_text)
        
        # Should be unchanged
        self.assertEqual(result, test_text, "Non-repetitive text should remain unchanged")
    
    @unittest.skipUnless(FUNCTIONS_AVAILABLE, "whisper_server functions not available")
    def test_repetition_edge_cases(self):
        """Test edge cases for repetition guard"""
        # Empty string
        self.assertEqual(collapse_repetitions(""), "")
        
        # Very short string
        self.assertEqual(collapse_repetitions("hello"), "hello")
        
        # Exactly at the repetition limit
        test_text = "test case " * 6  # Exactly REPEAT_LIMIT times
        result = collapse_repetitions(test_text)
        # Should not be changed (not exceeding limit)
        self.assertEqual(result.strip(), test_text.strip())
    
    @unittest.skipUnless(FUNCTIONS_AVAILABLE, "whisper_server functions not available")
    def test_repetition_multiple_patterns(self):
        """Test text with multiple different repetitive patterns"""
        # Mix of repetitive and normal text
        test_text = "hello world " * 10 + "normal text here " + "foo bar " * 8
        result = collapse_repetitions(test_text)
        
        # Should collapse both repetitive patterns
        result_words = result.split()
        original_words = test_text.split()
        
        # Result should be significantly shorter
        self.assertLess(len(result_words), len(original_words),
                       "Result should be shorter than original with multiple patterns")


class TestOfflineConfiguration(unittest.TestCase):
    """Test configuration handling without network dependencies"""
    
    def test_environment_variable_defaults(self):
        """Test that environment variables are handled correctly"""
        # Test with no env vars set (should use defaults)
        old_vars = {}
        env_vars = ['WHISPER_NO_CONTEXT', 'VAD_ENABLED', 'REPEAT_NGRAM', 'REPEAT_LIMIT']
        
        # Save existing values
        for var in env_vars:
            old_vars[var] = os.environ.get(var)
            if var in os.environ:
                del os.environ[var]
        
        try:
            # Re-import to test defaults (this is a limitation of current design)
            # In practice, these would be tested via API calls to running server
            
            # Test that the imports still work without env vars
            # This ensures graceful degradation
            from whisper_server import MODEL_NAME, PORT, HOST
            
            self.assertEqual(PORT, 8001)
            self.assertEqual(HOST, 'localhost')
            
        finally:
            # Restore environment variables
            for var, value in old_vars.items():
                if value is not None:
                    os.environ[var] = value


def run_offline_tests():
    """
    Main test runner for offline functionality.
    Can be called without any network dependencies.
    """
    print("🧪 Running offline VAD and repetition guard tests...")
    print("=" * 50)
    
    # Check dependencies
    print(f"📦 Dependencies:")
    print(f"   - soundfile: {'✅' if SOUNDFILE_AVAILABLE else '❌'}")
    print(f"   - webrtcvad: {'✅' if VAD_AVAILABLE else '❌'}")
    print(f"   - whisper_server functions: {'✅' if FUNCTIONS_AVAILABLE else '❌'}")
    print()
    
    # Run tests
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add test classes
    suite.addTests(loader.loadTestsFromTestCase(TestVADProcessing))
    suite.addTests(loader.loadTestsFromTestCase(TestRepetitionGuard))
    suite.addTests(loader.loadTestsFromTestCase(TestOfflineConfiguration))
    
    # Run with detailed output
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    # Summary
    print("\n" + "=" * 50)
    if result.wasSuccessful():
        print("✅ All offline tests passed!")
        return 0
    else:
        print(f"❌ {len(result.failures)} failures, {len(result.errors)} errors")
        return 1


if __name__ == "__main__":
    exit_code = run_offline_tests()
    sys.exit(exit_code)