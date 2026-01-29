import { pullCommand } from '../../../../src/cli/commands/pull';
import { createLogBus } from '../../../../src/core/logging/LogBus';

// Mock LogBus
jest.mock('../../../../src/core/logging/LogBus', () => ({
    createLogBus: jest.fn().mockReturnValue({
        info: jest.fn(),
        error: jest.fn(),
    }),
}));

// Mock process.exit and stdout
const mockExit = jest.spyOn(process, 'exit').mockImplementation((() => { }) as any);
const mockStdout = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => { });
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => { });

// Mock transformers
const mockPipeline = jest.fn().mockResolvedValue({});
const mockEnv = { cacheDir: '' };
jest.mock('@huggingface/transformers', () => ({
    pipeline: (...args: any[]) => mockPipeline(...args),
    env: mockEnv,
}), { virtual: true }); // virtual because it might not be installed in jest environment correctly or to ensure mock works

describe('CLI: pullCommand', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should download model successfully', async () => {
        await pullCommand('Xenova/test-model', { dtype: 'fp32' });

        expect(mockPipeline).toHaveBeenCalledWith(
            'text-generation', // Default type
            'Xenova/test-model',
            expect.objectContaining({
                dtype: 'fp32',
                progress_callback: expect.any(Function),
            })
        );
        expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Downloading model'));
        expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Model downloaded successfully'));
    });

    it('should set cache directory if provided', async () => {
        await pullCommand('Xenova/test-model', { dtype: 'q8', cacheDir: '/tmp/cache' });

        expect(mockEnv.cacheDir).toBe('/tmp/cache');
        expect(mockPipeline).toHaveBeenCalledWith(
            expect.any(String),
            'Xenova/test-model',
            expect.objectContaining({ dtype: 'q8' })
        );
    });

    it('should detect embedding models by name', async () => {
        await pullCommand('Xenova/all-MiniLM-L6-v2', { dtype: 'fp32' });

        expect(mockPipeline).toHaveBeenCalledWith(
            'feature-extraction',
            expect.any(String),
            expect.any(Object)
        );
    });

    it('should handle errors gracefully', async () => {
        mockPipeline.mockRejectedValueOnce(new Error('Network error'));

        await pullCommand('Xenova/fail-model', { dtype: 'fp32' });

        expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Failed to download model'));
        expect(mockExit).toHaveBeenCalledWith(1);
    });
});
