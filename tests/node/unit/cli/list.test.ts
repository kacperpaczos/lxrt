import { listCommand } from '../../../../src/cli/commands/list';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs
jest.mock('fs');
const mockReaddirSync = fs.readdirSync as jest.Mock;
const mockStatSync = fs.statSync as jest.Mock;
const mockExistsSync = fs.existsSync as jest.Mock;

const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => { });
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => { });
const mockExit = jest.spyOn(process, 'exit').mockImplementation((() => { }) as any);

describe('CLI: listCommand', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockExistsSync.mockReturnValue(true);
    });

    it('should list models from cache directory', async () => {
        mockReaddirSync.mockReturnValue(['models--Xenova--test-model', 'other-file']);
        mockStatSync.mockReturnValue({
            isDirectory: () => true,
            size: 1024,
            mtime: new Date('2023-01-01'),
        });

        await listCommand({ cacheDir: '/tmp/cache' });

        expect(mockReaddirSync).toHaveBeenCalledWith('/tmp/cache');
        expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Xenova/test-model'));
    });

    it('should handle empty cache directory', async () => {
        mockReaddirSync.mockReturnValue([]);

        await listCommand({ cacheDir: '/tmp/cache' });

        expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('No cached models found'));
    });

    it('should handle missing cache directory', async () => {
        mockExistsSync.mockReturnValue(false);

        await listCommand({ cacheDir: '/tmp/missing' });

        expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('No cached models found'));
    });

    it('should handle errors', async () => {
        mockReaddirSync.mockImplementation(() => { throw new Error('Access denied'); });

        await listCommand({ cacheDir: '/tmp/cache' });

        expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Failed to list models'));
        expect(mockExit).toHaveBeenCalledWith(1);
    });
});
