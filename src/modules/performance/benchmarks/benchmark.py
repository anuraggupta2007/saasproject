#!/usr/bin/env python3
"""
Performance Benchmark Suite
Measures throughput, latency, and resource usage for core operations.
"""

import asyncio
import time
import statistics
import json
import os
from typing import Callable, Any
from dataclasses import dataclass, field
from datetime import datetime

import aiohttp
import psutil


@dataclass
class BenchmarkResult:
    name: str
    duration_seconds: float
    iterations: int
    avg_time_ms: float
    min_time_ms: float
    max_time_ms: float
    p50_time_ms: float
    p95_time_ms: float
    p99_time_ms: float
    ops_per_second: float
    memory_peak_mb: float
    cpu_avg_percent: float
    errors: int = 0
    error_rate: float = 0.0


class PerformanceBenchmark:
    def __init__(self, base_url: str = "http://localhost:8000"):
        self._base_url = base_url
        self._results: list[BenchmarkResult] = []
        self._process = psutil.Process()

    async def run_benchmark(
        self,
        name: str,
        func: Callable,
        iterations: int = 1000,
        concurrency: int = 10,
        warmup: int = 50,
    ) -> BenchmarkResult:
        print(f"\n{'='*60}")
        print(f"Benchmark: {name}")
        print(f"Iterations: {iterations}, Concurrency: {concurrency}")
        print(f"{'='*60}")

        for _ in range(warmup):
            await func()

        latencies = []
        errors = 0
        start_time = time.perf_counter()
        self._process.cpu_percent()
        peak_memory = self._process.memory_info().rss / (1024 * 1024)

        semaphore = asyncio.Semaphore(concurrency)

        async def run_one():
            nonlocal errors, peak_memory
            async with semaphore:
                try:
                    start = time.perf_counter()
                    await func()
                    latency = (time.perf_counter() - start) * 1000
                    latencies.append(latency)
                    current_memory = self._process.memory_info().rss / (1024 * 1024)
                    peak_memory = max(peak_memory, current_memory)
                except Exception:
                    errors += 1

        tasks = [run_one() for _ in range(iterations)]
        await asyncio.gather(*tasks)

        total_duration = time.perf_counter() - start_time
        cpu_avg = self._process.cpu_percent()

        sorted_latencies = sorted(latencies)
        n = len(sorted_latencies)

        result = BenchmarkResult(
            name=name,
            duration_seconds=round(total_duration, 3),
            iterations=iterations,
            avg_time_ms=round(statistics.mean(latencies), 3) if latencies else 0,
            min_time_ms=round(min(latencies), 3) if latencies else 0,
            max_time_ms=round(max(latencies), 3) if latencies else 0,
            p50_time_ms=round(sorted_latencies[n // 2], 3) if n > 0 else 0,
            p95_time_ms=round(sorted_latencies[int(n * 0.95)], 3) if n > 1 else 0,
            p99_time_ms=round(sorted_latencies[int(n * 0.99)], 3) if n > 1 else 0,
            ops_per_second=round(iterations / total_duration, 2) if total_duration > 0 else 0,
            memory_peak_mb=round(peak_memory, 2),
            cpu_avg_percent=round(cpu_avg, 2),
            errors=errors,
            error_rate=round(errors / iterations * 100, 2) if iterations > 0 else 0,
        )

        self._results.append(result)
        self._print_result(result)
        return result

    def _print_result(self, result: BenchmarkResult):
        print(f"\nResults for: {result.name}")
        print(f"  Duration:    {result.duration_seconds}s")
        print(f"  Iterations:  {result.iterations}")
        print(f"  Avg:         {result.avg_time_ms}ms")
        print(f"  Min:         {result.min_time_ms}ms")
        print(f"  Max:         {result.max_time_ms}ms")
        print(f"  P50:         {result.p50_time_ms}ms")
        print(f"  P95:         {result.p95_time_ms}ms")
        print(f"  P99:         {result.p99_time_ms}ms")
        print(f"  Ops/sec:     {result.ops_per_second}")
        print(f"  Memory peak: {result.memory_peak_mb}MB")
        print(f"  Errors:      {result.errors} ({result.error_rate}%)")

    def save_results(self, filename: str = None):
        if not filename:
            filename = f"benchmark_results_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
        data = {
            "timestamp": datetime.utcnow().isoformat(),
            "results": [
                {
                    "name": r.name,
                    "duration_seconds": r.duration_seconds,
                    "iterations": r.iterations,
                    "avg_time_ms": r.avg_time_ms,
                    "min_time_ms": r.min_time_ms,
                    "max_time_ms": r.max_time_ms,
                    "p50_time_ms": r.p50_time_ms,
                    "p95_time_ms": r.p95_time_ms,
                    "p99_time_ms": r.p99_time_ms,
                    "ops_per_second": r.ops_per_second,
                    "memory_peak_mb": r.memory_peak_mb,
                    "cpu_avg_percent": r.cpu_avg_percent,
                    "errors": r.errors,
                    "error_rate": r.error_rate,
                }
                for r in self._results
            ],
        }
        with open(filename, "w") as f:
            json.dump(data, f, indent=2)
        print(f"\nResults saved to {filename}")


async def bench_http_get(benchmark: PerformanceBenchmark, url: str, name: str):
    async with aiohttp.ClientSession() as session:
        async def do_request():
            async with session.get(url) as resp:
                await resp.read()
                if resp.status >= 400:
                    raise Exception(f"HTTP {resp.status}")
        await benchmark.run_benchmark(name, do_request, iterations=500, concurrency=20)


async def bench_json_serialization(benchmark: PerformanceBenchmark):
    import orjson
    data = {"users": [{"id": i, "name": f"user_{i}", "email": f"user_{i}@test.com"} for i in range(100)]}

    async def serialize():
        orjson.dumps(data)

    await benchmark.run_benchmark("JSON Serialization (orjson)", serialize, iterations=10000, concurrency=1)


async def bench_hash_computation(benchmark: PerformanceBenchmark):
    import hashlib
    data = b"x" * (1024 * 1024)

    async def compute_hash():
        hashlib.sha256(data).hexdigest()

    await benchmark.run_benchmark("SHA-256 Hash (1MB)", compute_hash, iterations=1000, concurrency=1)


async def bench_compression(benchmark: PerformanceBenchmark):
    import gzip
    data = b"x" * (1024 * 1024)

    async def compress():
        gzip.compress(data, compresslevel=6)

    await benchmark.run_benchmark("Gzip Compression (1MB)", compress, iterations=500, concurrency=1)


async def main():
    benchmark = PerformanceBenchmark()

    print("Email Converter SaaS - Performance Benchmark Suite")
    print(f"Started at: {datetime.utcnow().isoformat()}")

    await bench_json_serialization(benchmark)
    await bench_hash_computation(benchmark)
    await bench_compression(benchmark)

    try:
        await bench_http_get(benchmark, "http://localhost:8000/health", "HTTP GET /health")
        await bench_http_get(benchmark, "http://localhost:8000/api/v1/health", "HTTP GET /api/v1/health")
    except Exception as e:
        print(f"HTTP benchmarks skipped (server not running): {e}")

    benchmark.save_results()

    print(f"\n{'='*60}")
    print("Benchmark Summary")
    print(f"{'='*60}")
    for r in benchmark._results:
        print(f"  {r.name}: {r.ops_per_second} ops/s, P95={r.p95_time_ms}ms")


if __name__ == "__main__":
    asyncio.run(main())
