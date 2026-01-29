# LXRT - Development Roadmap

**Version:** `0.7.1` (Upcoming)
**Status:** Planning / Active Development

---

## 📅 v0.7.1 Goals

### 1. OCR Model Improvements
**Priority:** High
**Status:** Planned

The current OCR model needs refinement to provide more rich metadata similar to the other modalities.
- [ ] **Metadata Extraction:** Enhance `recognize()` to return per-word confidence scores and bounding boxes (`bbox`) instead of placeholders.
- [ ] **Backend Integration:** Fully integrate `BackendSelector` into `OCRModel` for better device management (WebGPU/WASM/Node).
- [ ] **Types:** Ensure strict typing for new metadata fields.

### 2. Test Coverage Expansion
**Priority:** High
**Status:** Planned

Increase test coverage to ensure stability of the newly added features (JSON Mode, Tools).
- [ ] **JSON Mode Edge Cases:** Verify handling of malformed JSON responses and recovery.
- [ ] **Tool Calling Scenarios:** Test complex multi-tool scenarios.
- [ ] **OCR Metadata:** Add tests for new bbox/confidence outputs.

---

## 🔮 Future Work (v0.8.0 candidate)

### 3. Agentic & UI Features
**Priority:** Medium/High
**Status:** Backlog

To support more advanced use cases like autonomous agents and easy implementations.

- [ ] **Agentic Examples:** Create robust examples demonstrating "Long-term Memory" (using Vector Store) and multi-step reasoning.
- [ ] **UI Library:** Develop a set of ready-to-use React/Vue components (e.g., `<ChatWindow />`, `<AudioVisualizer />`) to speed up frontend integration.

---

## ✅ Completed (Archived)

Detailed history of completed features can be found in `CHANGELOG.md`.
- **v0.7.0 Features:** Abort/Cancel, JSON Mode, Function Calling, WebGPU Backend.
