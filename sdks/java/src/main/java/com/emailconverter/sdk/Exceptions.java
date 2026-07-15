package com.emailconverter.sdk;

public class EmailConverterException extends Exception {
    private final int statusCode;

    public EmailConverterException(String message, int statusCode) {
        super(message);
        this.statusCode = statusCode;
    }

    public int getStatusCode() { return statusCode; }
}

public class AuthenticationException extends EmailConverterException {
    public AuthenticationException() { super("Invalid API key", 401); }
}

public class RateLimitException extends EmailConverterException {
    private final int retryAfter;
    public RateLimitException(int retryAfter) { super("Rate limit exceeded", 429); this.retryAfter = retryAfter; }
    public int getRetryAfter() { return retryAfter; }
}
