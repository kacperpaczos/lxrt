
import * as fs from 'fs';
import * as path from 'path';

/**
 * Helper class to load test fixtures from tests/fixtures
 */
export class FixtureLoader {
    private static readonly FIXTURES_DIR = path.resolve(__dirname, '../fixtures');

    /**
     * Get absolute path to a fixture
     */
    static getPath(category: 'audio' | 'images' | 'text', filename: string): string {
        const filePath = path.join(this.FIXTURES_DIR, category, filename);
        if (!fs.existsSync(filePath)) {
            throw new Error(`Fixture not found: ${filePath}\nPlease check tests/fixtures/README.md`);
        }
        return filePath;
    }

    /**
     * Check if fixture exists (useful for skipping tests)
     */
    static exists(category: 'audio' | 'images' | 'text', filename: string): boolean {
        const filePath = path.join(this.FIXTURES_DIR, category, filename);
        return fs.existsSync(filePath);
    }

    /**
     * Load audio file as Buffer
     */
    static getAudioBuffer(filename: string): Buffer {
        return fs.readFileSync(this.getPath('audio', filename));
    }

    /**
     * Load audio file as Float32Array (simulating AudioContext decoded data)
     * Note: This is a simplistic WAV parser for standard 16-bit PCM WAVs.
     * For complex formats, consider a real decoder library.
     */
    static getAudioFloat32(filename: string): Float32Array {
        const buffer = this.getAudioBuffer(filename);

        // Skip WAV header (simplification: assume 44 byte header for standard PCM)
        // In production test setup, use a proper WAV parser or consistent ffmpeg generated inputs
        const headerSize = 44;
        const data = new Int16Array(
            buffer.buffer,
            buffer.byteOffset + headerSize,
            (buffer.byteLength - headerSize) / 2
        );

        const float32 = new Float32Array(data.length);
        for (let i = 0; i < data.length; i++) {
            // Convert valid 16-bit PCM to float [-1, 1]
            float32[i] = data[i] / 32768.0;
        }
        return float32;
    }

    /**
     * Load text fixture (JSON or plain text)
     */
    static getJson<T>(filename: string): T {
        const content = fs.readFileSync(this.getPath('text', filename), 'utf-8');
        return JSON.parse(content);
    }
}
