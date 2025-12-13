export interface Download {
  id: string;
  url: string;
  filename: string;
  status: 'downloading' | 'completed' | 'failed' | 'cancelled' | 'paused';
  progress: number;
  controller?: AbortController;
  blobUrl?: string;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}