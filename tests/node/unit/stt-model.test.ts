
import { STTModel } from '../../../src/models/STTModel';

// Mock BaseModel to avoid actual loading logic if needed, 
// though STTModel extends it. 
// If we want to test load() we should mock transformers.
jest.mock('../../../src/models/BaseModel', () => {
    return {
        BaseModel: class MockBaseModel {
            config: any;
            constructor(modality: any, config: any) {
                this.config = config;
            }
            async ensureLoaded() { }
        }
    }
});

describe('STTModel', () => {
    it('should initialize with config', () => {
        const config = { model: 'Xenova/whisper-tiny', device: 'cpu' as const };
        const model = new STTModel(config);
        expect(model).toBeDefined();
        // Since we mocked BaseModel, this.config should be set
        expect((model as any).config).toEqual(config);
    });

    // Add more tests if specific logic exists in constructor or pure methods
});
