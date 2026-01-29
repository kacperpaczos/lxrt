import { removeCommand } from '../../../../src/cli/commands/remove';
import * as fs from 'fs';
import * as readline from 'readline';

// Mock LogBus
jest.mock('../../../../src/core/logging/LogBus', () => ({
    createLogBus: jest.fn().mockReturnValue({
        info: jest.fn(),
        error: jest.fn(),
    }),
}));

// Mock fs
jest.mock('fs');
const mockExistsSync = fs.existsSync as jest.Mock;
const mockRmSync = fs.rmSync as jest.Mock;

// Mock readline
jest.mock('readline');

const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => { });
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => { });
const mockExit = jest.spyOn(process, 'exit').mockImplementation((() => { }) as any);

describe('CLI: removeCommand', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockExistsSync.mockReturnValue(true);
    });

    it('should remove model with force option', async () => {
        await removeCommand('Xenova/test-model', { force: true, cacheDir: '/tmp/cache' });

        expect(mockRmSync).toHaveBeenCalledWith(
            expect.stringContaining('models--Xenova--test-model'),
            expect.objectContaining({ recursive: true, force: true })
        );
        expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('removed successfully'));
    });

    it('should fail if model does not exist', async () => {
        mockExistsSync.mockReturnValue(false);

        await removeCommand('Xenova/missing', { force: true });

        expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Model not found'));
        expect(mockExit).toHaveBeenCalledWith(1);
        expect(mockRmSync).not.toHaveBeenCalled();
    });

    // Testing interactive confirmation is tricky with jest.mock('readline'), 
    // skipping interactive test for specific implementation details, focusing on force logic first.
});
