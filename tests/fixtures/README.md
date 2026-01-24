# Test Fixtures

This directory contains deterministic test data for Integration Tests.
**DO NOT** commit large files (>10MB).

## Structure
*   `audio/`: WAV/MP3 files. Standard format: 16kHz WAV mono.
*   `images/`: PNG/JPG files for OCR/Multimodal.
*   `text/`: JSON files containing input prompts and expected outputs.

## Usage
Use `FixtureLoader` to access files in tests:

```typescript
import { FixtureLoader } from '../utils/FixtureLoader';

const audio = await FixtureLoader.getAudio('sample_16k.wav');
```
