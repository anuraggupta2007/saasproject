package emailconverter

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type Client struct {
	APIKey     string
	BaseURL    string
	HTTPClient *http.Client
	MaxRetries int
}

type Conversion struct {
	ID             string  `json:"id"`
	UploadID       string  `json:"upload_id"`
	Status         string  `json:"status"`
	Progress       int     `json:"progress"`
	SourceFormat   string  `json:"source_format"`
	TargetFormat   string  `json:"target_format"`
	InputSizeBytes int64   `json:"input_size_bytes"`
	OutputSizeBytes *int64 `json:"output_size_bytes"`
	DownloadURL    *string `json:"download_url"`
	ErrorMessage   *string `json:"error_message"`
	CreatedAt      string  `json:"created_at"`
}

type ConversionListResponse struct {
	Items    []Conversion `json:"items"`
	Total    int          `json:"total"`
	Page     int          `json:"page"`
	PageSize int          `json:"page_size"`
	HasMore  bool         `json:"has_more"`
}

type Upload struct {
	ID          string `json:"id"`
	Filename    string `json:"filename"`
	Status      string `json:"status"`
	FileSize    int64  `json:"file_size"`
	UploadURL   string `json:"upload_url,omitempty"`
	ChunkSize   int    `json:"chunk_size,omitempty"`
	TotalChunks int    `json:"total_chunks,omitempty"`
	CreatedAt   string `json:"created_at"`
}

type Webhook struct {
	ID          string   `json:"id"`
	URL         string   `json:"url"`
	Events      []string `json:"events"`
	IsActive    bool     `json:"is_active"`
	Description *string  `json:"description"`
	Secret      string   `json:"secret"`
	CreatedAt   string   `json:"created_at"`
}

type SearchResult struct {
	ID         string   `json:"id"`
	Subject    string   `json:"subject"`
	Sender     string   `json:"sender"`
	Recipients []string `json:"recipients"`
	Date       string   `json:"date"`
	Snippet    string   `json:"snippet"`
	Score      float64  `json:"score"`
}

type SearchResponse struct {
	Query         string         `json:"query"`
	TotalResults  int            `json:"total_results"`
	Page          int            `json:"page"`
	PageSize      int            `json:"page_size"`
	Results       []SearchResult `json:"results"`
	TookMs        int            `json:"took_ms"`
}

type RateLimitStatus struct {
	Tier               string `json:"tier"`
	RequestsPerMinute  int    `json:"requests_per_minute"`
	RequestsPerHour    int    `json:"requests_per_hour"`
	RequestsPerDay     int    `json:"requests_per_day"`
	BurstLimit         int    `json:"burst_limit"`
	CurrentMinuteUsage int    `json:"current_minute_usage"`
	CurrentHourUsage   int    `json:"current_hour_usage"`
	CurrentDayUsage    int    `json:"current_day_usage"`
}

func NewClient(apiKey string) *Client {
	return &Client{
		APIKey:  apiKey,
		BaseURL: "https://api.emailconverter.com",
		HTTPClient: &http.Client{
			Timeout: 30 * time.Second,
		},
		MaxRetries: 3,
	}
}

func (c *Client) doRequest(method, path string, body interface{}) ([]byte, error) {
	var bodyReader io.Reader
	if body != nil {
		jsonBytes, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		bodyReader = bytes.NewReader(jsonBytes)
	}

	req, err := http.NewRequest(method, c.BaseURL+path, bodyReader)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.APIKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-API-Version", "1")

	var resp *http.Response
	for i := 0; i <= c.MaxRetries; i++ {
		resp, err = c.HTTPClient.Do(req)
		if err != nil {
			if i < c.MaxRetries {
				time.Sleep(time.Duration(1<<uint(i)) * time.Second)
				continue
			}
			return nil, err
		}
		break
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("API error %d: %s", resp.StatusCode, string(respBody))
	}
	return respBody, nil
}

func (c *Client) GetProfile() (map[string]interface{}, error) {
	data, err := c.doRequest("GET", "/api/public/v1/users/me", nil)
	if err != nil {
		return nil, err
	}
	var result map[string]interface{}
	json.Unmarshal(data, &result)
	return result, nil
}

func (c *Client) CreateUpload(filename string, fileSize int64) (*Upload, error) {
	data, err := c.doRequest("POST", "/api/public/v1/uploads", map[string]interface{}{
		"filename":  filename,
		"file_size": fileSize,
	})
	if err != nil {
		return nil, err
	}
	var upload Upload
	json.Unmarshal(data, &upload)
	return &upload, nil
}

func (c *Client) CreateConversion(uploadID, targetFormat string) (*Conversion, error) {
	data, err := c.doRequest("POST", "/api/public/v1/conversions", map[string]interface{}{
		"upload_id":     uploadID,
		"target_format": targetFormat,
	})
	if err != nil {
		return nil, err
	}
	var conv Conversion
	json.Unmarshal(data, &conv)
	return &conv, nil
}

func (c *Client) GetConversion(conversionID string) (*Conversion, error) {
	data, err := c.doRequest("GET", "/api/public/v1/conversions/"+conversionID, nil)
	if err != nil {
		return nil, err
	}
	var conv Conversion
	json.Unmarshal(data, &conv)
	return &conv, nil
}

func (c *Client) ListConversions(page, pageSize int) (*ConversionListResponse, error) {
	data, err := c.doRequest("GET", fmt.Sprintf("/api/public/v1/conversions?page=%d&page_size=%d", page, pageSize), nil)
	if err != nil {
		return nil, err
	}
	var result ConversionListResponse
	json.Unmarshal(data, &result)
	return &result, nil
}

func (c *Client) Search(query string, page, pageSize int) (*SearchResponse, error) {
	data, err := c.doRequest("POST", "/api/public/v1/search", map[string]interface{}{
		"query":      query,
		"page":       page,
		"page_size":  pageSize,
	})
	if err != nil {
		return nil, err
	}
	var result SearchResponse
	json.Unmarshal(data, &result)
	return &result, nil
}

func (c *Client) CreateWebhook(url string, events []string) (*Webhook, error) {
	data, err := c.doRequest("POST", "/api/public/v1/webhooks", map[string]interface{}{
		"url":    url,
		"events": events,
	})
	if err != nil {
		return nil, err
	}
	var wh Webhook
	json.Unmarshal(data, &wh)
	return &wh, nil
}

func (c *Client) ListWebhooks() ([]Webhook, error) {
	data, err := c.doRequest("GET", "/api/public/v1/webhooks", nil)
	if err != nil {
		return nil, err
	}
	var whs []Webhook
	json.Unmarshal(data, &whs)
	return whs, nil
}

func (c *Client) GetRateLimitStatus() (*RateLimitStatus, error) {
	data, err := c.doRequest("GET", "/api/public/v1/rate-limit/status", nil)
	if err != nil {
		return nil, err
	}
	var status RateLimitStatus
	json.Unmarshal(data, &status)
	return &status, nil
}

func (c *Client) HealthCheck() (map[string]interface{}, error) {
	data, err := c.doRequest("GET", "/api/public/v1/health", nil)
	if err != nil {
		return nil, err
	}
	var result map[string]interface{}
	json.Unmarshal(data, &result)
	return result, nil
}

func VerifyWebhookSignature(payload []byte, signature, secret string) bool {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(signature))
}
