import apiClient from '@/lib/apiClient'

export const conversionApi = {
  // Upload
  uploadFile: (formData: FormData, onProgress?: (p: number) => void) =>
    apiClient.post('/api/v1/uploads/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded * 100) / e.total))
        }
      },
    }),

  // Conversion jobs
  createJob: (data: {
    upload_id: string
    output_format: string
    options?: Record<string, unknown>
  }) => apiClient.post('/api/v1/conversion/jobs', data),

  listJobs: (params?: { page?: number; limit?: number; status?: string }) =>
    apiClient.get('/api/v1/conversion/jobs', { params }),

  getJob: (jobId: string) =>
    apiClient.get(`/api/v1/conversion/jobs/${jobId}`),

  cancelJob: (jobId: string) =>
    apiClient.post(`/api/v1/conversion/jobs/${jobId}/cancel`),

  downloadResult: (jobId: string) =>
    apiClient.get(`/api/v1/conversion/jobs/${jobId}/download`, {
      responseType: 'blob',
    }),

  getSupportedFormats: () =>
    apiClient.get('/api/v1/conversion/formats'),

  // Batch
  createBatch: (data: { jobs: Array<{ upload_id: string; output_format: string }> }) =>
    apiClient.post('/api/v1/conversion/batch', data),
}
