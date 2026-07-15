import apiClient from '@/lib/apiClient';

interface DownloadOptions {
  filename?: string;
  onProgress?: (loaded: number, total: number) => void;
  onComplete?: (blob: Blob) => void;
  onError?: (error: string) => void;
}

export async function downloadFile(
  url: string,
  options: DownloadOptions = {}
): Promise<Blob> {
  const { filename, onProgress, onComplete, onError } = options;

  try {
    const response = await apiClient.get(url, {
      responseType: 'blob',
      onDownloadProgress: (progressEvent) => {
        if (progressEvent.total) {
          onProgress?.(progressEvent.loaded, progressEvent.total);
        }
      },
    });

    const blob = response.data as Blob;
    onComplete?.(blob);

    // Trigger download
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename ?? url.split('/').pop() ?? 'download';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    return blob;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Download failed';
    onError?.(msg);
    throw new Error(msg);
  }
}

export async function downloadWithProgress(
  endpoint: string,
  filename: string,
  onProgress?: (pct: number) => void
): Promise<void> {
  await downloadFile(endpoint, {
    filename,
    onProgress: (loaded, total) => {
      onProgress?.(Math.round((loaded / total) * 100));
    },
  });
}

export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export function downloadDataAsJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  triggerBlobDownload(blob, filename);
}

export function downloadDataAsCsv(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(','),
    ...data.map((row) => headers.map((h) => JSON.stringify(row[h] ?? '')).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  triggerBlobDownload(blob, filename);
}
