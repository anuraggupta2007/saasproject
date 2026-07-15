using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace EmailConverterSdk
{
    public class EmailConverterClient : IDisposable
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;

        public EmailConverterClient(string apiKey, string baseUrl = "https://api.emailconverter.com")
        {
            _apiKey = apiKey;
            _httpClient = new HttpClient { BaseAddress = new Uri(baseUrl) };
            _httpClient.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", apiKey);
            _httpClient.DefaultRequestHeaders.Add("X-API-Version", "1");
        }

        public async Task<JsonElement> GetProfileAsync()
        {
            var response = await _httpClient.GetAsync("/api/public/v1/users/me");
            response.EnsureSuccessStatusCode();
            return await JsonSerializer.DeserializeAsync<JsonElement>(await response.Content.ReadAsStreamAsync());
        }

        public async Task<JsonElement> CreateUploadAsync(string filename, long fileSize)
        {
            var body = JsonSerializer.Serialize(new { filename, file_size = fileSize });
            var content = new StringContent(body, Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync("/api/public/v1/uploads", content);
            response.EnsureSuccessStatusCode();
            return await JsonSerializer.DeserializeAsync<JsonElement>(await response.Content.ReadAsStreamAsync());
        }

        public async Task<JsonElement> CreateConversionAsync(string uploadId, string targetFormat)
        {
            var body = JsonSerializer.Serialize(new { upload_id = uploadId, target_format = targetFormat });
            var content = new StringContent(body, Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync("/api/public/v1/conversions", content);
            response.EnsureSuccessStatusCode();
            return await JsonSerializer.DeserializeAsync<JsonElement>(await response.Content.ReadAsStreamAsync());
        }

        public async Task<JsonElement> GetConversionAsync(string conversionId)
        {
            var response = await _httpClient.GetAsync($"/api/public/v1/conversions/{conversionId}");
            response.EnsureSuccessStatusCode();
            return await JsonSerializer.DeserializeAsync<JsonElement>(await response.Content.ReadAsStreamAsync());
        }

        public async Task<JsonElement> ListConversionsAsync(int page = 1, int pageSize = 20)
        {
            var response = await _httpClient.GetAsync($"/api/public/v1/conversions?page={page}&page_size={pageSize}");
            response.EnsureSuccessStatusCode();
            return await JsonSerializer.DeserializeAsync<JsonElement>(await response.Content.ReadAsStreamAsync());
        }

        public async Task<JsonElement> SearchAsync(string query, int page = 1, int pageSize = 20)
        {
            var body = JsonSerializer.Serialize(new { query, page, page_size = pageSize });
            var content = new StringContent(body, Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync("/api/public/v1/search", content);
            response.EnsureSuccessStatusCode();
            return await JsonSerializer.DeserializeAsync<JsonElement>(await response.Content.ReadAsStreamAsync());
        }

        public async Task<JsonElement> CreateWebhookAsync(string url, List<string> events)
        {
            var body = JsonSerializer.Serialize(new { url, events });
            var content = new StringContent(body, Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync("/api/public/v1/webhooks", content);
            response.EnsureSuccessStatusCode();
            return await JsonSerializer.DeserializeAsync<JsonElement>(await response.Content.ReadAsStreamAsync());
        }

        public async Task<JsonElement> ListWebhooksAsync()
        {
            var response = await _httpClient.GetAsync("/api/public/v1/webhooks");
            response.EnsureSuccessStatusCode();
            return await JsonSerializer.DeserializeAsync<JsonElement>(await response.Content.ReadAsStreamAsync());
        }

        public async Task<JsonElement> HealthCheckAsync()
        {
            var response = await _httpClient.GetAsync("/api/public/v1/health");
            response.EnsureSuccessStatusCode();
            return await JsonSerializer.DeserializeAsync<JsonElement>(await response.Content.ReadAsStreamAsync());
        }

        public static bool VerifyWebhookSignature(byte[] payload, string signature, string secret)
        {
            using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
            var expected = Convert.ToHexString(hmac.ComputeHash(payload));
            return CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(expected),
                Encoding.UTF8.GetBytes(signature));
        }

        public void Dispose()
        {
            _httpClient?.Dispose();
        }
    }
}
