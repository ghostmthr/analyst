/**
 * File System Access API (browser).
 * https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API
 */
interface FileSystemDirectoryHandle {
  getFileHandle(
    name: string,
    options?: { create?: boolean }
  ): Promise<FileSystemFileHandle>;
  getDirectoryHandle(
    name: string,
    options?: { create?: boolean }
  ): Promise<FileSystemDirectoryHandle>;
  readonly kind: "directory";
  readonly name: string;
}

interface FileSystemFileHandle {
  getFile(): Promise<File>;
  createWritable(options?: { keepExistingData?: boolean }): Promise<FileSystemWritableFileStream>;
  readonly kind: "file";
  readonly name: string;
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: BufferSource | Blob | string | WriteParams): Promise<void>;
  seek(position: number): Promise<void>;
  truncate(size: number): Promise<void>;
}

interface WriteParams {
  type: "write" | "seek" | "truncate";
  size?: number;
  position?: number;
  data?: BufferSource | Blob | string;
}

interface Window {
  showDirectoryPicker(options?: { id?: string; mode?: "read" | "readwrite"; startIn?: string }): Promise<FileSystemDirectoryHandle>;
}
