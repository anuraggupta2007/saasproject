import logging
import sys


def setup_logging(log_level: str = "INFO", log_format: str = "json") -> None:
    level = getattr(logging, log_level.upper(), logging.INFO)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)

    if log_format == "json":
        try:
            import structlog
            formatter = structlog.processors.JSONRenderer()
        except Exception:
            formatter = logging.Formatter("%(message)s")
    else:
        formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")

    handler.setFormatter(formatter)

    logging.basicConfig(
        level=level,
        handlers=[handler],
        format="%(message)s",
    )


def get_logger(name: str | None = None) -> logging.Logger:
    return logging.getLogger(name)
