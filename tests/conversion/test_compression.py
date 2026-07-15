import pytest

from src.modules.conversion.services.compression_service import CompressionService


@pytest.fixture
def compression_service():
    return CompressionService()


class TestCompressionService:
    @pytest.mark.asyncio
    async def test_compress_single_file(self, compression_service):
        content = "Hello World! This is test content for compression. " * 50

        compressed, size = await compression_service.compress_single_file(
            filename="test.txt",
            content=content.encode("utf-8"),
        )

        assert compressed is not None
        assert size > 0
        assert size <= len(content.encode("utf-8"))

    @pytest.mark.asyncio
    async def test_compress_multiple_files(self, compression_service):
        files = [
            {"filename": "file1.txt", "content": "Content 1"},
            {"filename": "file2.txt", "content": "Content 2"},
        ]

        compressed, size = await compression_service.compress_files(files)

        assert compressed is not None
        assert size > 0

    @pytest.mark.asyncio
    async def test_compress_with_folder_structure(self, compression_service):
        files = [
            {"filename": "file1.txt", "content": "Content 1", "folder": "emails"},
            {"filename": "file2.txt", "content": "Content 2", "folder": "attachments"},
        ]

        compressed, size = await compression_service.compress_files(
            files,
            preserve_structure=True,
        )

        assert compressed is not None
        assert size > 0

    @pytest.mark.asyncio
    async def test_compress_from_dict(self, compression_service):
        files = {
            "test.html": "<p>Hello</p>",
            "test.txt": "Hello",
        }

        compressed, size = await compression_service.create_zip_from_dict(files)

        assert compressed is not None
        assert size > 0

    @pytest.mark.asyncio
    async def test_compress_string_content(self, compression_service):
        files = [
            {"filename": "test.html", "content": "<html><body>Test</body></html>"},
        ]

        compressed, size = await compression_service.compress_files(files)

        assert compressed is not None

    def test_compression_ratio(self, compression_service):
        original = 1000
        compressed = 500

        ratio = compression_service.get_compression_ratio(original, compressed)

        assert ratio == 0.5

    def test_compression_ratio_zero_original(self, compression_service):
        ratio = compression_service.get_compression_ratio(0, 100)
        assert ratio == 0.0

    @pytest.mark.asyncio
    async def test_calculate_hash(self, compression_service):
        data = b"test data"
        hash_value = await compression_service.calculate_hash(data)

        assert hash_value is not None
        assert len(hash_value) == 64

    @pytest.mark.asyncio
    async def test_compress_empty_files(self, compression_service):
        compressed, size = await compression_service.compress_files([])

        assert compressed is not None
        assert size >= 0

    @pytest.mark.asyncio
    async def test_compress_large_content(self, compression_service):
        large_content = "A" * 100000
        files = [{"filename": "large.txt", "content": large_content.encode("utf-8")}]

        compressed, size = await compression_service.compress_files(files)

        assert compressed is not None
        assert size > 0
