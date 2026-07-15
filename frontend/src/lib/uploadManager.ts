import apiClient from '@/lib/apiClient';
import { useUploadQueueStore } from '@/store/uploadQueueStore';
import type { UploadProgress } from '@/types';

interface UploadOptions {
  endpoint?: string;
  maxRetries?: number;
  chunkSize?: number;
  onProgress?: (progress: UploadProgress) => void;
  onComplete?: (fileId: string, url: string) => void;
  onError?: (fileId: string, error: string) => void;
}

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB default

export async function uploadFile(
  file: File,
  options: UploadOptions = {}
): Promise<{ fileId: string; url: string }> {
  const {
    endpoint = '/api/v1/files/upload',
    maxRetries = 3,
    onProgress,
    onComplete,
    onError,
  } = options;

  const queue = useUploadQueueStore.getState();
  const fileId = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  queue.add(fileId, file.name, file.size);

  const formData = new FormData();
  formData.append('file', file);
  formData.append('file_id', fileId);

  let lastError: string | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await apiClient.post<{ id: string; url: string }>(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const loaded = progressEvent.loaded;
            queue.updateProgress(fileId, loaded);
            onProgress?.({
              fileId,
              fileName: file.name,
              loaded,
              total: progressEvent.total,
              percentage: Math.round((loaded / progressEvent.total) * 100),
              status: 'uploading',
            });
          }
        },
      });

      queue.complete(fileId);
      const result = { fileId: response.data.id, url: response.data.url };
      onComplete?.(result.fileId, result.url);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Upload failed';
      if (attempt === maxRetries) {
        queue.error(fileId, lastError);
        onError?.(fileId, lastError);
        throw new Error(lastError);
      }
      // Wait before retry
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
    }
  }

  throw new Error(lastError ?? 'Upload failed');
}

export async function uploadMultipleFiles(
  files: File[],
  options: UploadOptions = {}
): Promise<Array<{ fileId: string; url: string }>> {
  const results: Array<{ fileId: string; url: string }> = [];
  const maxConcurrent = 3;

  for (let i = 0; i < files.length; i += maxConcurrent) {
    const batch = files.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(
      batch.map((file) => uploadFile(file, options))
    );
    results.push(...batchResults);
  }

  return results;
}

export function cancelUpload(fileId: string) {
  useUploadQueueStore.getState().remove(fileId);
}

export function pauseUpload(fileId: string) {
  useUploadQueueStore.getState().pause(fileId);
}

export function resumeUpload(fileId: string) {
  useUploadQueueStore.getState().resume(fileId);
}
