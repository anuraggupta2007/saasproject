import pytest

from src.modules.uploads.validators.file_validator import FileValidator, VirusScanner


class TestFileValidator:
    def test_validate_extension_mbox(self):
        ext = FileValidator.validate_extension("test.mbox")
        assert ext == ".mbox"

    def test_validate_extension_mbx(self):
        ext = FileValidator.validate_extension("test.mbx")
        assert ext == ".mbx"

    def test_validate_extension_eml(self):
        ext = FileValidator.validate_extension("test.eml")
        assert ext == ".eml"

    def test_validate_extension_pst(self):
        ext = FileValidator.validate_extension("test.pst")
        assert ext == ".pst"

    def test_validate_extension_txt_fails(self):
        from src.core.exceptions import BadRequestException
        with pytest.raises(BadRequestException):
            FileValidator.validate_extension("test.txt")

    def test_validate_extension_pdf_fails(self):
        from src.core.exceptions import BadRequestException
        with pytest.raises(BadRequestException):
            FileValidator.validate_extension("test.pdf")

    def test_validate_file_size_too_small(self):
        from src.core.exceptions import BadRequestException
        with pytest.raises(BadRequestException):
            FileValidator.validate_file_size(50)

    def test_validate_file_size_too_large(self):
        from src.core.exceptions import BadRequestException
        with pytest.raises(BadRequestException):
            FileValidator.validate_file_size(20 * 1024 * 1024 * 1024)

    def test_validate_file_size_valid(self):
        FileValidator.validate_file_size(1024 * 1024)

    def test_sanitize_filename_normal(self):
        safe = FileValidator.sanitize_filename("test.mbox")
        assert safe == "test.mbox"

    def test_sanitize_filename_dangerous(self):
        safe = FileValidator.sanitize_filename("../../../etc/passwd.mbox")
        assert ".." not in safe
        assert "/" not in safe

    def test_sanitize_filename_special_chars(self):
        safe = FileValidator.sanitize_filename("test file (1).mbox")
        assert "(" not in safe
        assert ")" not in safe

    def test_sanitize_filename_empty(self):
        safe = FileValidator.sanitize_filename("....mbox")
        assert safe.startswith("upload")

    def test_calculate_sha256(self):
        import io
        data = b"test data for hashing"
        file_obj = io.BytesIO(data)

        result = FileValidator.calculate_sha256(file_obj)

        import hashlib
        expected = hashlib.sha256(data).hexdigest()
        assert result == expected


class TestVirusScanner:
    @pytest.mark.asyncio
    async def test_scan_file_hook(self):
        result = await VirusScanner.scan_file("/tmp/test.mbox")
        assert result["is_clean"] is True
        assert result["scanner"] == "hook"

    @pytest.mark.asyncio
    async def test_scan_bytes_hook(self):
        result = await VirusScanner.scan_bytes(b"test data")
        assert result["is_clean"] is True
        assert result["scanner"] == "hook"
