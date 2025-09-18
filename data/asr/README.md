# ASR Dynamic Corrections Data Directory

This directory contains dynamic ASR (Automatic Speech Recognition) corrections that are learned and applied at runtime, complementing the static corrections in `src/utils/ASRCorrections.ts`.

## File Structure

- `glossary.txt` - Medical terms for Whisper prompt seeding (one term per line)
- `user_rules.json` - Correction rules in JSON format: `[{"raw": "...", "fix": "..."}]`
- `uploaded_corrections.json` - Temporary storage for corrections uploaded from Chrome extension

## Usage Flow

1. Users make corrections during daily use → stored in Chrome extension storage
2. Corrections are uploaded to DSPy server via `/v1/asr/corrections` endpoint
3. Server analyzes patterns and proposes glossary terms and rules via `/v1/asr/preview`
4. User reviews and approves changes via UI
5. Approved changes are applied to `glossary.txt` and `user_rules.json` via `/v1/asr/apply`
6. Runtime merge logic combines static + dynamic corrections during transcription

## Data Formats

### glossary.txt
```
atorvastatin
metoprolol
frusemide
```

### user_rules.json
```json
[
  {"raw": "metroprolol", "fix": "metoprolol"},
  {"raw": "peruzumide", "fix": "frusemide"}
]
```

## Privacy & Security

- All files remain local-only (no cloud upload)
- Contains only correction patterns, not full transcripts
- Automatically cleaned up based on frequency and age
- Respects HIPAA compliance for healthcare usage

## Integration

- Static corrections: `src/utils/ASRCorrections.ts` (versioned, reviewed)
- Dynamic corrections: This directory (user-generated, runtime)
- Merge logic: Applied during transcription preprocessing
- Whisper prompt: Built from glossary terms (≤224 tokens)