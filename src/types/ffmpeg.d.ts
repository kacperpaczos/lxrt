declare module '@ffmpeg/ffmpeg' {
  export interface FFmpeg {
    load(): Promise<void>;
    FS(method: 'writeFile', path: string, data: Uint8Array): void;
    FS(method: 'readFile', path: string): Uint8Array;
    FS(method: 'unlink', path: string): void;
    run(...args: string[]): Promise<void>;
  }

  export function createFFmpeg(options?: {
    log?: boolean;
    progress?: (info: { ratio: number }) => void;
  }): FFmpeg;

  export function fetchFile(
    source: string | ArrayBuffer | Uint8Array | Blob | File
  ): Promise<Uint8Array>;
}
