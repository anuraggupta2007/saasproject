<?php

namespace EmailConverter;

class Client
{
    private string $apiKey;
    private string $baseUrl;
    private int $timeout;
    private int $maxRetries;

    public function __construct(string $apiKey, string $baseUrl = 'https://api.emailconverter.com', int $timeout = 30, int $maxRetries = 3)
    {
        $this->apiKey = $apiKey;
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->timeout = $timeout;
        $this->maxRetries = $maxRetries;
    }

    private function request(string $method, string $path, ?array $body = null): array
    {
        $url = $this->baseUrl . $path;
        $headers = [
            'Authorization: Bearer ' . $this->apiKey,
            'Content-Type: application/json',
            'X-API-Version: 1',
        ];

        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $url,
            CURLOPT_HTTPHEADER => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $this->timeout,
            CURLOPT_CUSTOMREQUEST => $method,
        ]);

        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode >= 400) {
            throw new \RuntimeException("API error $httpCode: $response");
        }

        return json_decode($response, true);
    }

    public function getProfile(): array
    {
        return $this->request('GET', '/api/public/v1/users/me');
    }

    public function createUpload(string $filename, int $fileSize): array
    {
        return $this->request('POST', '/api/public/v1/uploads', [
            'filename' => $filename,
            'file_size' => $fileSize,
        ]);
    }

    public function createConversion(string $uploadId, string $targetFormat): array
    {
        return $this->request('POST', '/api/public/v1/conversions', [
            'upload_id' => $uploadId,
            'target_format' => $targetFormat,
        ]);
    }

    public function getConversion(string $conversionId): array
    {
        return $this->request('GET', "/api/public/v1/conversions/$conversionId");
    }

    public function listConversions(int $page = 1, int $pageSize = 20): array
    {
        return $this->request('GET', "/api/public/v1/conversions?page=$page&page_size=$pageSize");
    }

    public function search(string $query, int $page = 1, int $pageSize = 20): array
    {
        return $this->request('POST', '/api/public/v1/search', [
            'query' => $query,
            'page' => $page,
            'page_size' => $pageSize,
        ]);
    }

    public function createWebhook(string $url, array $events): array
    {
        return $this->request('POST', '/api/public/v1/webhooks', [
            'url' => $url,
            'events' => $events,
        ]);
    }

    public function listWebhooks(): array
    {
        return $this->request('GET', '/api/public/v1/webhooks');
    }

    public function healthCheck(): array
    {
        return $this->request('GET', '/api/public/v1/health');
    }

    public static function verifyWebhookSignature(string $payload, string $signature, string $secret): bool
    {
        $expected = hash_hmac('sha256', $payload, $secret);
        return hash_equals($expected, $signature);
    }
}
