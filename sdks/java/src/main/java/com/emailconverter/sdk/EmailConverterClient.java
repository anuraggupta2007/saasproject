package com.emailconverter.sdk;

import java.util.Map;

public class EmailConverterClient {
    private final String apiKey;
    private final String baseUrl;
    private final int timeout;
    private final int maxRetries;

    private EmailConverterClient(Builder builder) {
        this.apiKey = builder.apiKey;
        this.baseUrl = builder.baseUrl;
        this.timeout = builder.timeout;
        this.maxRetries = builder.maxRetries;
    }

    public static class Builder {
        private final String apiKey;
        private String baseUrl = "https://api.emailconverter.com";
        private int timeout = 30000;
        private int maxRetries = 3;

        public Builder(String apiKey) { this.apiKey = apiKey; }
        public Builder baseUrl(String v) { this.baseUrl = v; return this; }
        public Builder timeout(int v) { this.timeout = v; return this; }
        public Builder maxRetries(int v) { this.maxRetries = v; return this; }
        public EmailConverterClient build() { return new EmailConverterClient(this); }
    }

    public Map<String, Object> getProfile() { return Map.of(); }
    public Map<String, Object> getUsage(String period) { return Map.of(); }
    public Map<String, Object> getSubscription() { return Map.of(); }

    public Map<String, Object> createApiKey(String name, String[] scopes) {
        return Map.of("name", name, "scopes", scopes);
    }

    public Map<String, Object> createUpload(String filename, long fileSize) {
        return Map.of("filename", filename, "file_size", fileSize);
    }

    public Map<String, Object> createConversion(String uploadId, String targetFormat) {
        return Map.of("upload_id", uploadId, "target_format", targetFormat);
    }

    public Map<String, Object> getConversion(String conversionId) {
        return Map.of("id", conversionId);
    }

    public Map<String, Object> listConversions(int page, int pageSize) {
        return Map.of("page", page, "page_size", pageSize);
    }

    public Map<String, Object> search(String query, int page, int pageSize) {
        return Map.of("query", query, "page", page, "page_size", pageSize);
    }

    public Map<String, Object> createWebhook(String url, String[] events) {
        return Map.of("url", url, "events", events);
    }

    public Map<String, Object> listWebhooks() { return Map.of(); }

    public Map<String, Object> healthCheck() { return Map.of("status", "healthy"); }

    public static boolean verifyWebhookSignature(byte[] payload, String signature, String secret) {
        try {
            javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
            mac.init(new javax.crypto.spec.SecretKeySpec(secret.getBytes(), "HmacSHA256"));
            byte[] expected = mac.doFinal(payload);
            return java.security.MessageDigest.isEqual(expected, hexToBytes(signature));
        } catch (Exception e) {
            return false;
        }
    }

    private static byte[] hexToBytes(String hex) {
        int len = hex.length();
        byte[] data = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            data[i / 2] = (byte) ((Character.digit(hex.charAt(i), 16) << 4) + Character.digit(hex.charAt(i + 1), 16));
        }
        return data;
    }
}
