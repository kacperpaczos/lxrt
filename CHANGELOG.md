# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0] - 2026-01-19

### Added
- **VectorizationService** - unified service for multimodal vectorization (text, audio, image)
- **TextEmbeddingAdapter** - adapter for text-to-embedding conversion with chunking support
- **AudioEmbeddingAdapter** - adapter for audio-to-embedding using CLAP or STT fallback
- **ImageEmbeddingAdapter** - adapter for image-to-embedding conversion
- **Default logger** - console-based logger fallback to prevent undefined errors
- **Integration tests** - real model loading tests with `Xenova/all-MiniLM-L6-v2`
- **Documentation** - API.md, ARCHITECTURE.md, EXAMPLES.md

### Changed
- **Node.js requirement** - updated to `>=24.13.0`
- **Package description** - improved for better discoverability
- **Package.json `files`** - removed `examples/` from npm package to reduce size

### Removed
- **Playwright** - removed browser testing framework and related configurations

### Fixed
- **ESM compatibility** - Jest configuration now properly transforms ESM modules
- **State initialization** - `setConfig` now ensures logger is always present

## [0.5.0] - 2026-01-10

### Added
- **EmbeddingModel** - core model for generating embeddings
- **VoiceProfileRegistry** - management of TTS voice profiles
- **Progress tracking** - detailed progress events for model loading
- **React hooks** - `useLxrt`, `useChat`, `useTTS`
- **Vue composables** - `useLxrt`, `useChat`, `useTTS`
- **Web Workers** - off-main-thread model execution

### Changed
- **API** - unified interface for all modalities (LLM, TTS, STT, Embedding, OCR)

## [0.4.0] - 2025-12-15

### Added
- **OCR support** - Tesseract.js integration with auto-language detection
- **Backend selector** - automatic CPU/WASM/WebGPU selection
- **Autoscaler** - dynamic resource management

### Fixed
- **Memory leaks** - proper cleanup of model resources

## [0.3.0] - 2025-11-20

### Added
- **TTS/STT** - text-to-speech and speech-to-text support
- **AIProvider** - unified provider for all AI operations
- **Event emitter** - type-safe event system

## [0.2.0] - 2025-10-15

### Added
- **LLM support** - chat and completion APIs
- **OpenAI compatibility** - compatible request/response format

## [0.1.0] - 2025-09-01

### Added
- Initial release
- **Transformers.js integration** - wrapper for Hugging Face models
- **TypeScript support** - full type definitions
