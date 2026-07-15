import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import * as crypto from 'crypto';
import {
  Conversion,
  ConversionListResponse,
  EmailConverterConfig,
  RateLimitStatus,
  SearchResponse,
  Upload,
  UserProfile,
  Webhook,
  WebhookDelivery,
} from './types';
import {
  AuthenticationError,
  EmailConverterError,
  NotFoundError,
  RateLimitError,
  ServerError,
  ValidationError,
} from './exceptions';

export class EmailConverterClient {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(config: EmailConverterConfig) {
    this.apiKey = config.apiKey;
    this.client = axios.create({
      baseURL: (config.baseUrl || 'https://api.emailconverter.com').replace(/\/$/, ''),
      timeout: config.timeout || 30000,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'X-API-Version': '1',
      },
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) throw new AuthenticationError();
        if (error.response?.status === 404) throw new NotFoundError();
        if (error.response?.status === 429) {
          const retryAfter = parseInt(error.response.headers['retry-after'] || '60', 10);
          throw new RateLimitError('Rate limit exceeded', retryAfter);
        }
        if (error.response?.status >= 500) throw new ServerError();
        if (error.response?.status >= 400) {
          throw new ValidationError(error.response.data?.detail || 'Validation error', error.response.status);
        }
        throw new EmailConverterError(error.message);
      }
    );
  }

  // User
  async getProfile(): Promise<UserProfile> {
    const { data } = await this.client.get('/api/public/v1/users/me');
    return data;
  }

  async getUsage(period = 'current'): Promise<any> {
    const { data } = await this.client.get('/api/public/v1/users/me/usage', { params: { period } });
    return data;
  }

  async getSubscription(): Promise<any> {
    const { data } = await this.client.get('/api/public/v1/users/me/subscription');
    return data;
  }

  // API Keys
  async createApiKey(name: string, scopes: string[], expiresInDays?: number): Promise<any> {
    const body: any = { name, scopes };
    if (expiresInDays !== undefined) body.expires_in_days = expiresInDays;
    const { data } = await this.client.post('/api/public/v1/auth/keys', body);
    return data;
  }

  async listApiKeys(): Promise<any[]> {
    const { data } = await this.client.get('/api/public/v1/auth/keys');
    return data;
  }

  async rotateApiKey(keyId: string): Promise<any> {
    const { data } = await this.client.post(`/api/public/v1/auth/keys/${keyId}/rotate`);
    return data;
  }

  async revokeApiKey(keyId: string): Promise<any> {
    const { data } = await this.client.delete(`/api/public/v1/auth/keys/${keyId}`);
    return data;
  }

  // Uploads
  async createUpload(filename: string, fileSize: number): Promise<Upload> {
    const { data } = await this.client.post('/api/public/v1/uploads', { filename, file_size: fileSize });
    return data;
  }

  async getUpload(uploadId: string): Promise<Upload> {
    const { data } = await this.client.get(`/api/public/v1/uploads/${uploadId}`);
    return data;
  }

  async uploadChunk(uploadId: string, chunkNumber: number, data: Buffer): Promise<any> {
    const formData = new FormData();
    formData.append('data', new Blob([data]), `chunk_${chunkNumber}`);
    const { data: result } = await this.client.post(
      `/api/public/v1/uploads/${uploadId}/chunks`,
      formData,
      { params: { chunk_number: chunkNumber }, headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return result;
  }

  async deleteUpload(uploadId: string): Promise<any> {
    const { data } = await this.client.delete(`/api/public/v1/uploads/${uploadId}`);
    return data;
  }

  // Conversions
  async createConversion(uploadId: string, targetFormat: string): Promise<Conversion> {
    const { data } = await this.client.post('/api/public/v1/conversions', {
      upload_id: uploadId,
      target_format: targetFormat,
    });
    return data;
  }

  async getConversion(conversionId: string): Promise<Conversion> {
    const { data } = await this.client.get(`/api/public/v1/conversions/${conversionId}`);
    return data;
  }

  async listConversions(page = 1, pageSize = 20, status?: string): Promise<ConversionListResponse> {
    const params: any = { page, page_size: pageSize };
    if (status) params.status = status;
    const { data } = await this.client.get('/api/public/v1/conversions', { params });
    return data;
  }

  async cancelConversion(conversionId: string): Promise<any> {
    const { data } = await this.client.post(`/api/public/v1/conversions/${conversionId}/cancel`);
    return data;
  }

  async downloadConversion(conversionId: string): Promise<any> {
    const { data } = await this.client.get(`/api/public/v1/conversions/${conversionId}/download`);
    return data;
  }

  async convertAndWait(uploadId: string, targetFormat: string, pollInterval = 2000, maxWait = 300000): Promise<Conversion> {
    let conversion = await this.createConversion(uploadId, targetFormat);
    const start = Date.now();
    while (Date.now() - start < maxWait) {
      conversion = await this.getConversion(conversion.id);
      if (conversion.status === 'completed' || conversion.status === 'failed') return conversion;
      await new Promise((r) => setTimeout(r, pollInterval));
    }
    throw new EmailConverterError('Conversion timed out');
  }

  // Search
  async search(query: string, page = 1, pageSize = 20): Promise<SearchResponse> {
    const { data } = await this.client.post('/api/public/v1/search', { query, page, page_size: pageSize });
    return data;
  }

  async searchSuggestions(query: string, limit = 10): Promise<string[]> {
    const { data } = await this.client.get('/api/public/v1/search/suggestions', { params: { q: query, limit } });
    return data.suggestions;
  }

  // Webhooks
  async createWebhook(url: string, events: string[], description?: string): Promise<Webhook> {
    const body: any = { url, events };
    if (description) body.description = description;
    const { data } = await this.client.post('/api/public/v1/webhooks', body);
    return data;
  }

  async listWebhooks(): Promise<Webhook[]> {
    const { data } = await this.client.get('/api/public/v1/webhooks');
    return data;
  }

  async deleteWebhook(webhookId: string): Promise<any> {
    const { data } = await this.client.delete(`/api/public/v1/webhooks/${webhookId}`);
    return data;
  }

  async testWebhook(webhookId: string): Promise<any> {
    const { data } = await this.client.post(`/api/public/v1/webhooks/${webhookId}/test`);
    return data;
  }

  async listWebhookDeliveries(webhookId: string, limit = 50): Promise<WebhookDelivery[]> {
    const { data } = await this.client.get(`/api/public/v1/webhooks/${webhookId}/deliveries`, { params: { limit } });
    return data;
  }

  static verifyWebhookSignature(payload: Buffer, signature: string, secret: string): boolean {
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  }

  // Rate Limit
  async getRateLimitStatus(): Promise<RateLimitStatus> {
    const { data } = await this.client.get('/api/public/v1/rate-limit/status');
    return data;
  }

  async listTiers(): Promise<any[]> {
    const { data } = await this.client.get('/api/public/v1/tiers');
    return data;
  }

  // Health
  async healthCheck(): Promise<any> {
    const { data } = await this.client.get('/api/public/v1/health');
    return data;
  }

  // OAuth
  static async getOAuthToken(clientId: string, clientSecret: string, baseUrl = 'https://api.emailconverter.com', scope?: string): Promise<any> {
    const body: any = { grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret };
    if (scope) body.scope = scope;
    const { data } = await axios.post(`${baseUrl}/api/public/v1/auth/oauth/token`, body);
    return data;
  }
}
