#!/usr/bin/env python3
"""Email Converter CLI - Command-line interface for the Email Converter API."""

import argparse
import json
import sys
from datetime import datetime

import requests


class EmailConverterCLI:
    def __init__(self, api_key: str, base_url: str = "https://api.emailconverter.com"):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "X-API-Version": "1",
        })

    def _request(self, method: str, path: str, **kwargs) -> dict:
        url = f"{self.base_url}{path}"
        resp = self.session.request(method, url, **kwargs)
        if resp.status_code >= 400:
            print(f"Error {resp.status_code}: {resp.text}", file=sys.stderr)
            sys.exit(1)
        return resp.json()

    def health(self):
        data = self._request("GET", "/api/public/v1/health")
        print(json.dumps(data, indent=2))

    def profile(self):
        data = self._request("GET", "/api/public/v1/users/me")
        print(json.dumps(data, indent=2))

    def upload(self, filename: str):
        import os
        file_size = os.path.getsize(filename)
        data = self._request("POST", "/api/public/v1/uploads", json={
            "filename": os.path.basename(filename),
            "file_size": file_size,
        })
        print(f"Upload created: {data['id']}")
        print(f"Upload URL: {data.get('upload_url', 'N/A')}")
        return data

    def convert(self, upload_id: str, target_format: str):
        data = self._request("POST", "/api/public/v1/conversions", json={
            "upload_id": upload_id,
            "target_format": target_format,
        })
        print(f"Conversion created: {data['id']}")
        print(f"Status: {data['status']}")
        return data

    def conversion_status(self, conversion_id: str):
        data = self._request("GET", f"/api/public/v1/conversions/{conversion_id}")
        print(json.dumps(data, indent=2))

    def list_conversions(self, page: int = 1, page_size: int = 20):
        data = self._request("GET", "/api/public/v1/conversions", params={
            "page": page,
            "page_size": page_size,
        })
        print(json.dumps(data, indent=2))

    def search(self, query: str, page: int = 1, page_size: int = 20):
        data = self._request("POST", "/api/public/v1/search", json={
            "query": query,
            "page": page,
            "page_size": page_size,
        })
        print(json.dumps(data, indent=2))

    def list_webhooks(self):
        data = self._request("GET", "/api/public/v1/webhooks")
        print(json.dumps(data, indent=2))

    def create_webhook(self, url: str, events: list):
        data = self._request("POST", "/api/public/v1/webhooks", json={
            "url": url,
            "events": events,
        })
        print(json.dumps(data, indent=2))

    def rate_limit(self):
        data = self._request("GET", "/api/public/v1/rate-limit/status")
        print(json.dumps(data, indent=2))

    def create_api_key(self, name: str, scopes: list):
        data = self._request("POST", "/api/public/v1/auth/keys", json={
            "name": name,
            "scopes": scopes,
        })
        print(f"API Key: {data.get('api_key', 'N/A')}")
        print(f"Key Prefix: {data.get('key_prefix', 'N/A')}")
        print("IMPORTANT: Store the API key securely. It will not be shown again.")


def main():
    parser = argparse.ArgumentParser(description="Email Converter CLI")
    parser.add_argument("--api-key", required=True, help="API key")
    parser.add_argument("--base-url", default="https://api.emailconverter.com", help="Base URL")

    subparsers = parser.add_subparsers(dest="command", help="Command")

    subparsers.add_parser("health", help="Health check")
    subparsers.add_parser("profile", help="Get user profile")

    upload_parser = subparsers.add_parser("upload", help="Create upload")
    upload_parser.add_argument("filename", help="File to upload")

    convert_parser = subparsers.add_parser("convert", help="Start conversion")
    convert_parser.add_argument("upload_id", help="Upload ID")
    convert_parser.add_argument("target_format", help="Target format (pdf, html, pst, etc.)")

    status_parser = subparsers.add_parser("status", help="Get conversion status")
    status_parser.add_argument("conversion_id", help="Conversion ID")

    list_parser = subparsers.add_parser("list", help="List conversions")
    list_parser.add_argument("--page", type=int, default=1)
    list_parser.add_argument("--page-size", type=int, default=20)

    search_parser = subparsers.add_parser("search", help="Search emails")
    search_parser.add_argument("query", help="Search query")
    search_parser.add_argument("--page", type=int, default=1)
    search_parser.add_argument("--page-size", type=int, default=20)

    subparsers.add_parser("webhooks", help="List webhooks")

    webhook_parser = subparsers.add_parser("create-webhook", help="Create webhook")
    webhook_parser.add_argument("url", help="Webhook URL")
    webhook_parser.add_argument("--events", nargs="+", default=["conversion.completed"], help="Events")

    subparsers.add_parser("rate-limit", help="Rate limit status")

    key_parser = subparsers.add_parser("create-key", help="Create API key")
    key_parser.add_argument("name", help="Key name")
    key_parser.add_argument("--scopes", nargs="+", default=["read", "write"], help="Scopes")

    args = parser.parse_args()
    if not args.command:
        parser.print_help()
        sys.exit(1)

    cli = EmailConverterCLI(args.api_key, args.base_url)

    commands = {
        "health": lambda: cli.health(),
        "profile": lambda: cli.profile(),
        "upload": lambda: cli.upload(args.filename),
        "convert": lambda: cli.convert(args.upload_id, args.target_format),
        "status": lambda: cli.conversion_status(args.conversion_id),
        "list": lambda: cli.list_conversions(args.page, args.page_size),
        "search": lambda: cli.search(args.query, args.page, args.page_size),
        "webhooks": lambda: cli.list_webhooks(),
        "create-webhook": lambda: cli.create_webhook(args.url, args.events),
        "rate-limit": lambda: cli.rate_limit(),
        "create-key": lambda: cli.create_api_key(args.name, args.scopes),
    }

    commands[args.command]()


if __name__ == "__main__":
    main()
