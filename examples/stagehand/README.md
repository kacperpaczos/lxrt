# Stagehand + LXRT Integration

This example demonstrates how to use [Stagehand](https://github.com/browserbase/stagehand) with a local LLM running via **LXRT**.

## Prerequisites

- Node.js >= 22 (as per Stagehand requirements, though LXRT recommends 24)
- A browser installed (Playwright will handle this usually, or Chrome)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. (Optional) Configure environment variables in `.env` (not needed for local execution with LXRT default config).

## Running

```bash
npm start
```

This will:
1. Initialize LXRT using a quantization-friendly local model (e.g. `Xenova/Qwen1.5-0.5B-Chat`).
2. Launch a browser using Stagehand via Playwright.
3. Use the local attributes to analyze the DOM.
4. Extract title and description from `example.com`.

## How it works

The core integration is provided by `LxrtLLMProvider`, which bridges Stagehand's `LLMClient` abstract class with LXRT's `AIProvider`.

```typescript
const stagehand = new Stagehand({
    llmClient: new LxrtLLMProvider(provider)
});
```
