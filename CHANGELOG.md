# Changelog

All notable changes to **Transformers Router** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/specification/v2.0.0.html).

## [1.0.0] - 2025-12-05

### 🎉 Major Release

**Transformers Router** is now production-ready! This release marks the completion of Phase 3 development with comprehensive local AI infrastructure for agent frameworks.

### ✨ Added

#### Core AI Capabilities
- **LLM Support** - Text generation and chat with local language models
- **Text-to-Speech (TTS)** - Convert text to speech with voice profiles
- **Speech-to-Text (STT)** - Transcribe audio with Whisper models
- **Embeddings** - Generate text embeddings for RAG and semantic search
- **OCR Support** - Extract text from images using Tesseract.js

#### Vectorization & Multimodal Processing
- **Advanced Vectorization** - Process PDF, DOCX, MP3/WAV, MP4 files with progress tracking
- **Audio Processing** - CLAP embeddings or STT fallback for audio files
- **Video Processing** - Audio demuxing with optional frame analysis
- **Web Content Processing** - HTML to text extraction from URLs
- **Progress Tracking** - Real-time progress monitoring with AsyncGenerator API

#### Framework Integration
- **OpenAI Compatibility** - Drop-in replacement for OpenAI API
- **LangChain Integration** - Full compatibility with LangChain.js
- **React Hooks** - Easy React integration with `useAIProvider`, `useChat`, `useVectorization`
- **Vue Composables** - Seamless Vue 3 integration

#### Web Workers & Performance
- **Non-blocking AI** - Web Workers for performant AI processing
- **Worker Pool Management** - Automatic scaling and resource management
- **Multi-core Utilization** - Better performance on multi-core systems

#### Development Experience
- **TypeScript First** - Full type safety and IntelliSense support
- **Universal Support** - Works in Node.js and browsers
- **Comprehensive Testing** - 3-tier testing strategy (unit, integration, e2e)
- **Model Caching** - Automatic model management and caching
- **Progress Events** - Real-time loading progress notifications

#### Supported Models
- **LLM**: Qwen2.5, GPT-2, LaMini-Flan-T5
- **Embeddings**: all-MiniLM-L6-v2, all-mpnet-base-v2
- **Speech**: SpeechT5 TTS, Whisper Tiny/Base STT
- **OCR**: Tesseract.js with multiple language support

### 🔧 Technical Improvements

#### Backend & Infrastructure
- **ONNX Runtime Integration** - Optimized inference across platforms
- **Backend Selection** - Automatic optimization based on hardware
- **Resource Management** - Smart memory and CPU usage estimation
- **Model Quantization** - Support for q4, q8, fp16, fp32 precision

#### API Design
- **Unified Interface** - Single AIProvider for all modalities
- **Streaming Support** - Token-by-token streaming responses
- **Async Generators** - Real-time progress tracking
- **Event-driven Architecture** - Progress and status notifications

#### Testing & Quality
- **Unit Tests** - 43 fast unit tests with mocks
- **Browser Integration Tests** - Real AI models in browser environment
- **E2E Tests** - Full user workflows with Web Workers
- **Node.js Real Model Tests** - ONNX Runtime validation

### 📚 Documentation

- **Comprehensive README** - Installation, usage, and API reference
- **Code Examples** - Basic usage, RAG, multimodal, agent integration
- **Architecture Documentation** - Project structure and design decisions
- **Contributing Guide** - Development workflow and guidelines

### 🔄 Migration Notes

This is the first major release. For future updates, breaking changes will be clearly documented.

### 👥 Contributors

- **Kacper Paczos** - Lead Developer

### 📦 Installation

```bash
npm install transformers-router @huggingface/transformers
```

### 🎯 Roadmap Preview

Future versions will include:
- Advanced streaming (token-by-token to UI)
- Batch processing capabilities
- Vision model support
- Fine-tuning support
- Model compression utilities

---

## Development Phases

### ✅ Phase 1 (Completed)
- Core model management
- LLM support (chat, completion, streaming)
- TTS/STT support
- Embeddings with semantic search
- OpenAI adapter
- Progress tracking
- Model caching

### ✅ Phase 2 (Completed)
- Web Workers support
- Worker pool management
- React hooks
- Vue composables
- LangChain adapter
- Comprehensive testing suite
- Browser-based integration tests
- E2E testing with Playwright

### ✅ Phase 3 (Completed)
- ONNX Runtime integration for Node.js testing
- Real model tests without mocks
- Micro-model configuration for fast CI/CD
- Multimodal integration tests (STT → LLM → TTS)
- Environment-based test configuration
- Comprehensive Node.js test coverage

---

For more information, see the [README](README.md) and [Contributing Guide](CONTRIBUTING.md).