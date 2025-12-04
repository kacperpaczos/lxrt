# Testy jednostkowe

Ten katalog zawiera **prawdziwe testy jednostkowe** - testy które używają mocków i nie ładują rzeczywistych modeli AI.

## Zasady

- ✅ **Używaj mocków** zamiast prawdziwych modeli
- ✅ **Testuj logikę biznesową** bez zależności od ONNX/transformers
- ✅ **Szybkie wykonanie** - testy powinny działać w < 1s
- ✅ **Izolacja** - każdy test jest niezależny

## Obecne testy jednostkowe

- `progress-tracker.test.ts` - testy ProgressTracker (bez modeli)
- `backend-selector.test.ts` - testy BackendSelector (bez modeli)
- `audio.adapter.test.ts` - testy AudioEmbeddingAdapter (z mockami)
- `image.adapter.test.ts` - testy ImageEmbeddingAdapter (z mockami)

## Placeholder pliki do implementacji

Następujące moduły powinny mieć unit testy (z mockami):

- `errors.test.ts` - testy błędów domenowych (`src/domain/errors`)
- `state.test.ts` - testy rejestru modeli (`src/app/state`)
- `init.test.ts` - testy inicjalizacji (`src/app/init`)
- `logger.test.ts` - testy loggera (`src/domain/logging/Logger`)
- `config.test.ts` - testy konfiguracji (`src/domain/config/Config`)
- `autoscaler.test.ts` - testy AutoScaler (`src/app/autoscaler/AutoScaler`)
- `vectorization-service.test.ts` - testy VectorizationService (`src/app/vectorization/VectorizationService`)
- `event-emitter.test.ts` - testy EventEmitter (`src/infra/events/EventEmitter`)
- `resource-usage-estimator.test.ts` - testy ResourceUsageEstimator (`src/infra/resource/ResourceUsageEstimator`)
- `vector-store.test.ts` - testy VectorStore (`src/infra/vectorstore/VectorStore`)
- `voice-profile-registry.test.ts` - testy VoiceProfileRegistry (`src/core/VoiceProfileRegistry`)

## Testy integracyjne

Testy które używają prawdziwych modeli zostały przeniesione do:
- `tests/node/integration/models/` - testy modeli (TTS, STT, LLM, OCR, Embeddings)
- `tests/node/integration/adapters/` - testy adapterów (OpenAI, LangChain)
- `tests/node/integration/` - testy lifecycle, cache, flow

