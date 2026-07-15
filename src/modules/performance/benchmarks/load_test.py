# Load Testing Suite for Email Converter SaaS
# Run with: locust -f load_test.py --host=https://api.emailconverter.com

import json
import random
import time
from locust import HttpUser, task, between, events
from locust.runners import MasterRunner


class EmailConverterUser(HttpUser):
    wait_time = between(0.5, 2.0)
    weight = 1

    def on_start(self):
        self.token = None
        self.user_id = None

    @task(10)
    def health_check(self):
        self.client.get("/health")

    @task(8)
    def api_health(self):
        self.client.get("/api/v1/health")

    @task(5)
    def get_conversions(self):
        headers = {}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        self.client.get(
            "/api/v1/conversions",
            headers=headers,
            name="/api/v1/conversions [GET]",
        )

    @task(3)
    def get_conversion_detail(self):
        headers = {}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        self.client.get(
            f"/api/v1/conversions/{random.randint(1, 1000)}",
            headers=headers,
            name="/api/v1/conversions/:id [GET]",
        )

    @task(2)
    def search_files(self):
        headers = {}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        queries = ["report", "invoice", "email", "attachment", "document"]
        self.client.get(
            f"/api/v1/search?q={random.choice(queries)}",
            headers=headers,
            name="/api/v1/search [GET]",
        )

    @task(2)
    def get_user_profile(self):
        headers = {}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        self.client.get(
            "/api/v1/auth/me",
            headers=headers,
            name="/api/v1/auth/me [GET]",
        )

    @task(1)
    def get_analytics_dashboard(self):
        headers = {}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        self.client.get(
            "/api/v1/analytics/dashboard",
            headers=headers,
            name="/api/v1/analytics/dashboard [GET]",
        )

    @task(1)
    def get_monitoring_health(self):
        self.client.get("/api/v1/monitoring/health")

    @task(1)
    def get_performance_overview(self):
        self.client.get("/api/v1/performance/overview")


class ConversionWorkerUser(HttpUser):
    wait_time = between(1, 5)
    weight = 2

    @task(5)
    def check_conversion_status(self):
        self.client.get(
            f"/api/v1/conversions/{random.randint(1, 1000)}/status",
            name="/api/v1/conversions/:id/status [GET]",
        )

    @task(3)
    def list_conversion_formats(self):
        self.client.get(
            "/api/v1/conversions/formats",
            name="/api/v1/conversions/formats [GET]",
        )

    @task(1)
    def get_conversion_history(self):
        self.client.get(
            "/api/v1/conversions?page=1&limit=20",
            name="/api/v1/conversions [GET] paginated",
        )


class AdminUser(HttpUser):
    wait_time = between(2, 5)
    weight = 1

    @task(3)
    def admin_dashboard(self):
        self.client.get(
            "/api/v1/admin/dashboard",
            name="/api/v1/admin/dashboard [GET]",
        )

    @task(2)
    def admin_users(self):
        self.client.get(
            "/api/v1/admin/users?page=1&limit=50",
            name="/api/v1/admin/users [GET]",
        )

    @task(1)
    def admin_system_events(self):
        self.client.get(
            "/api/v1/admin/events?limit=100",
            name="/api/v1/admin/events [GET]",
        )


class PerformanceTestUser(HttpUser):
    wait_time = between(1, 3)
    weight = 1

    @task(5)
    def performance_overview(self):
        self.client.get("/api/v1/performance/overview")

    @task(3)
    def cache_stats(self):
        self.client.get("/api/v1/performance/cache/stats")

    @task(2)
    def celery_queues(self):
        self.client.get("/api/v1/performance/celery/queues")

    @task(2)
    def system_resources(self):
        self.client.get("/api/v1/performance/system/resources")

    @task(1)
    def slow_queries(self):
        self.client.get("/api/v1/performance/database/slow-queries")

    @task(1)
    def health_check(self):
        self.client.get("/api/v1/performance/health")


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    if isinstance(environment.runner, MasterRunner):
        print("Starting distributed load test...")
    else:
        print("Starting load test...")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    print("Load test completed.")


@events.request.add_listener
def on_request(request_type, name, response_time, response_length, exception, **kwargs):
    if exception:
        print(f"Request failed: {name} - {exception}")
