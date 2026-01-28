
import { OCRModel } from '../../../src/models/OCRModel';

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

describe('OCRModel', () => {
    it('should initialize with config', () => {
        const config = { model: 'Xenova/trocr-small-printed', device: 'cpu' as const };
        const model = new OCRModel(config);
        expect(model).toBeDefined();
    });
});
