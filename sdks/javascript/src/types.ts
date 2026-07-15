export interface Conversion {
  id: string;
  upload_id: string;
  status: 'pending' | 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  source_format: string;
  target_format: string;
  input_size_bytes: number;
  output_size_bytes: number | null;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  download_url: string | null;
  created_at: string;
}

export interface ConversionListResponse {
  items: Conversion[];
  total: number;
  page: number;
  page_size: number;
  has_more: boolean;
}

export interface Upload {
  id: string;
  filename: string;
  status: string;
  file_size: number;
  upload_url: string | null;
  chunk_size: number | null;
  total_chunks: number | null;
  created_at: string;
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  description: string | null;
  secret: string;
  created_at: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_type: string;
  status_code: number | null;
  response_body: string | null;
  attempts: number;
  created_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  tier: string;
  api_keys_count: number;
  conversions_today: number;
  conversions_limit: number;
  storage_used_bytes: number;
  storage_limit_bytes: number;
  created_at: string;
}

export interface RateLimitStatus {
  tier: string;
  requests_per_minute: number;
  requests_per_hour: number;
  requests_per_day: number;
  burst_limit: number;
  current_minute_usage: number;
  current_hour_usage: number;
  current_day_usage: number;
  reset_at: string;
}

export interface SearchResponse {
  query: string;
  total_results: number;
  page: number;
  page_size: number;
  results: SearchResult[];
  took_ms: number;
}

export interface SearchResult {
  id: string;
  subject: string;
  sender: string;
  recipients: string[];
  date: string;
  snippet: string;
  score: number;
  highlights: Record<string, string>;
}

export interface EmailConverterConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}
