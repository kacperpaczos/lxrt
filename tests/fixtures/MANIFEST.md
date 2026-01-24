# Test Data Manifest

This document maps the required fixture files to the test scenarios they support.
**Replace the placeholder files with your real data to verify full system capabilities.**

## 1. Audio (STT & Multimodal)
**Target Directory:** `tests/fixtures/audio/`

| Filename | Description | Used By | Expected Content |
|----------|-------------|---------|------------------|
| `test.wav` | Spoken command (16kHz WAV Mono) | `multimodal.flow.test.ts`, `stt.model.test.ts` | Speech (e.g., "Hello computer") |

**Requirements:**
*   Format: WAV (Linear PCM), 16kHz sample rate, Mono channel.
*   Duration: 1-10 seconds is sufficient.

## 2. Images (OCR)
**Target Directory:** `tests/fixtures/images/`

| Filename | Description | Used By | Expected Content |
|----------|-------------|---------|------------------|
| `test.png` | Document screenshot or photo | `ocr.model.test.ts` | Readable text (English preferred) |

**Requirements:**
*   Format: PNG or JPG.
*   Resolution: Clear enough for Tesseract/TrOCR (min 300px width).

## 3. Text (LLM & Logic)
**Target Directory:** `tests/fixtures/text/`

| Filename | Description | Used By | Expected Content |
|----------|-------------|---------|------------------|
| `prompts.json` | JSON with inputs | `llm.model.test.ts` (Planned) | JSON Array of objects `{ input: "...", expected: "..." }` |

## How to Verify
1.  Replace the files above with your real data.
2.  Run integration tests:
    ```bash
    npm run test:node:integration
    ```
3.  Check the logs (`test-logs/*.log`) to see the actual transcription from STT and recognized text from OCR.
