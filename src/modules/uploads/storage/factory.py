from src.modules.uploads.storage.base import StorageProvider, StorageConfig
from src.modules.uploads.storage.local import LocalStorage
from src.modules.uploads.storage.s3 import S3Storage
from src.modules.uploads.storage.minio import MinIOStorage


def create_storage_provider(config: StorageConfig) -> StorageProvider:
    providers = {
        "local": LocalStorage,
        "s3": S3Storage,
        "minio": MinIOStorage,
    }

    provider_class = providers.get(config.provider)

    if not provider_class:
        raise ValueError(
            f"Unsupported storage provider: {config.provider}. "
            f"Supported providers: {list(providers.keys())}"
        )

    return provider_class(config)
