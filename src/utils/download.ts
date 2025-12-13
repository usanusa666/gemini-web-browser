import type { Download } from '../interfaces';

export class DownloadManager {
  static async startDownload(url: string, onProgress?: (progress: number) => void): Promise<Blob> {
    const controller = new AbortController();
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      if (!response.body) throw new Error('No response body');

      const contentLength = Number(response.headers.get('Content-Length'));
      const reader = response.body.getReader();
      let receivedLength = 0;
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        receivedLength += value.length;
        if (contentLength > 0 && onProgress) {
          const progress = Math.round((receivedLength / contentLength) * 100);
          onProgress(progress);
        }
      }

      return new Blob(chunks);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Download cancelled');
      }
      throw error;
    }
  }

  static getFilenameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.split('/').pop() || 'download';
    } catch {
      return 'download';
    }
  }

  static createBlobUrl(blob: Blob): string {
    return URL.createObjectURL(blob);
  }

  static revokeBlobUrl(blobUrl: string): void {
    URL.revokeObjectURL(blobUrl);
  }
}
