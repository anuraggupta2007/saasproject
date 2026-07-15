import asyncio
import uuid
import email
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from src.core.config import settings
from src.core.dependencies import get_db
from src.db.session import Base
from src.main import app
from src.models.base import User, Role
from src.modules.mime.models.base import (
    MimeMessage,
    MimePart,
    MimeBody,
    MimeAttachment,
    ParseStatus,
)
from src.services.auth.password import hash_password


TEST_DATABASE_URL = "sqlite+aiosqlite:///./test_mime.db"


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def db_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(db_engine):
    session_factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture(scope="function")
async def client(db_engine):
    session_factory = async_sessionmaker(db_engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_db():
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_role(db_session):
    role = Role(
        name="user",
        description="Default user role",
        is_default=True,
        is_system=True,
    )
    db_session.add(role)
    await db_session.commit()
    return role


@pytest_asyncio.fixture
async def test_user(db_session, test_role):
    user = User(
        email="test@example.com",
        hashed_password=hash_password("TestPassword123!"),
        full_name="Test User",
        is_active=True,
        is_verified=True,
    )
    db_session.add(user)
    await db_session.commit()

    from src.models.base import user_roles
    await db_session.execute(
        user_roles.insert().values(user_id=user.id, role_id=test_role.id)
    )
    await db_session.commit()

    return user


def create_test_email(
    subject: str = "Test Email",
    from_addr: str = "sender@example.com",
    to_addr: str = "recipient@example.com",
    body: str = "Hello, this is a test email.",
    html_body: str | None = None,
    attachments: list[dict] | None = None,
) -> str:
    msg = MIMEMultipart()
    msg["Subject"] = subject
    msg["From"] = from_addr
    msg["To"] = to_addr

    if html_body:
        msg.attach(MIMEText(body, "plain"))
        msg.attach(MIMEText(html_body, "html"))
    else:
        msg.attach(MIMEText(body, "plain"))

    if attachments:
        for att in attachments:
            part = MIMEBase("application", "octet-stream")
            part.set_payload(att.get("content", b"test attachment"))
            encoders.encode_base64(part)
            part.add_header(
                "Content-Disposition",
                f'attachment; filename="{att.get("filename", "test.txt")}"',
            )
            msg.attach(part)

    return msg.as_string()


class TestMimeParser:
    def test_parse_simple_email(self):
        from src.modules.mime.services.parser import MimeParser

        parser = MimeParser()
        raw_content = create_test_email()

        result = parser.parse(raw_content)

        assert result["success"] is True
        assert result["message"] is not None
        assert result["message"]["content_type"] == "multipart/mixed"

    def test_parse_email_with_html(self):
        from src.modules.mime.services.parser import MimeParser

        parser = MimeParser()
        html = "<html><body><h1>Hello</h1><p>World</p></body></html>"
        raw_content = create_test_email(html_body=html)

        result = parser.parse(raw_content)

        assert result["success"] is True
        assert len(result["parts"]) > 0

    def test_parse_email_with_attachment(self):
        from src.modules.mime.services.parser import MimeParser

        parser = MimeParser()
        attachments = [{"filename": "test.txt", "content": b"test content"}]
        raw_content = create_test_email(attachments=attachments)

        result = parser.parse(raw_content)

        assert result["success"] is True
        assert len(result["parts"]) > 1

    def test_parse_malformed_email(self):
        from src.modules.mime.services.parser import MimeParser

        parser = MimeParser()
        raw_content = "This is not a valid email"

        result = parser.parse(raw_content)

        assert result["success"] is True


class TestContentDecoder:
    def test_decode_base64(self):
        import base64
        from src.modules.mime.services.decoder import ContentDecoder

        decoder = ContentDecoder()
        original = "Hello, World!"
        encoded = base64.b64encode(original.encode()).decode()

        result = decoder.decode_text(encoded, "base64", "utf-8")

        assert result == original

    def test_decode_quoted_printable(self):
        import quopri
        from src.modules.mime.services.decoder import ContentDecoder

        decoder = ContentDecoder()
        original = "Hello, World!"
        encoded = quopri.encodestring(original.encode()).decode()

        result = decoder.decode_text(encoded, "quoted-printable", "utf-8")

        assert result == original

    def test_decode_utf8(self):
        from src.modules.mime.services.decoder import ContentDecoder

        decoder = ContentDecoder()
        text = "Hello, 世界！"

        result = decoder.decode_text(text.encode("utf-8"), "8bit", "utf-8")

        assert result == text

    def test_decode_shift_jis(self):
        from src.modules.mime.services.decoder import ContentDecoder

        decoder = ContentDecoder()
        text = "こんにちは世界"

        encoded = text.encode("shift_jis")
        result = decoder.decode_text(encoded, "8bit", "shift_jis")

        assert result == text

    def test_detect_encoding(self):
        from src.modules.mime.services.decoder import ContentDecoder

        decoder = ContentDecoder()

        ascii_data = b"Hello, World!"
        assert decoder._detect_encoding(ascii_data) == "7bit"

        unicode_data = "Hello, 世界！".encode("utf-8")
        assert decoder._detect_encoding(unicode_data) == "8bit"

    def test_normalize_charset(self):
        from src.modules.mime.services.decoder import ContentDecoder

        decoder = ContentDecoder()

        assert decoder._normalize_charset("utf8") == "utf-8"
        assert decoder._normalize_charset("latin-1") == "iso-8859-1"
        assert decoder._normalize_charset("cp1252") == "windows-1252"


class TestHtmlProcessor:
    def test_process_simple_html(self):
        from src.modules.mime.services.html_processor import HtmlProcessor

        processor = HtmlProcessor()
        html = "<html><body><h1>Hello</h1><p>World</p></body></html>"

        result = processor.process(html)

        assert result["html"] == html
        assert result["sanitized"] is True
        assert result["link_count"] == 0

    def test_sanitize_html(self):
        from src.modules.mime.services.html_processor import HtmlProcessor

        processor = HtmlProcessor()
        html = '<html><body><script>alert("xss")</script><p>Hello</p></body></html>'

        result = processor.process(html, sanitize=True)

        assert "script" not in result["html"]
        assert "Hello" in result["html"]

    def test_rewrite_cid_images(self):
        from src.modules.mime.services.html_processor import HtmlProcessor

        processor = HtmlProcessor()
        html = '<html><body><img src="cid:image001.jpg"></body></html>'
        cid_images = {"image001.jpg": "/attachments/image001.jpg"}

        result = processor.process(html, cid_images=cid_images)

        assert "cid:image001.jpg" not in result["html"]
        assert "/attachments/image001.jpg" in result["html"]

    def test_detect_tracking_pixels(self):
        from src.modules.mime.services.html_processor import HtmlProcessor

        processor = HtmlProcessor()
        html = '<html><body><img src="pixel.gif" width="1" height="1"></body></html>'

        result = processor.process(html)

        assert result["has_tracking_pixels"] is True

    def test_count_links(self):
        from src.modules.mime.services.html_processor import HtmlProcessor

        processor = HtmlProcessor()
        html = '<html><body><a href="http://example.com">Link 1</a><a href="http://test.com">Link 2</a></body></html>'

        result = processor.process(html)

        assert result["link_count"] == 2

    def test_extract_text_from_html(self):
        from src.modules.mime.services.html_processor import HtmlProcessor

        processor = HtmlProcessor()
        html = "<html><body><h1>Hello</h1><p>World</p></body></html>"

        text = processor.extract_text_from_html(html)

        assert "Hello" in text
        assert "World" in text


class TestTextProcessor:
    def test_process_simple_text(self):
        from src.modules.mime.services.text_processor import TextProcessor

        processor = TextProcessor()
        text = "Hello, World!\nThis is a test email."

        result = processor.process(text)

        assert result["text"] == text
        assert result["word_count"] == 7
        assert result["line_count"] == 2

    def test_normalize_line_endings(self):
        from src.modules.mime.services.text_processor import TextProcessor

        processor = TextProcessor()
        text = "Hello\r\nWorld\rTest"

        result = processor.process(text)

        assert "\r" not in result["text"]
        assert "\n" in result["text"]

    def test_generate_preview(self):
        from src.modules.mime.services.text_processor import TextProcessor

        processor = TextProcessor()
        text = "A" * 1000

        result = processor.process(text, preview_length=100)

        assert len(result["preview"]) <= 110

    def test_extract_urls(self):
        from src.modules.mime.services.text_processor import TextProcessor

        processor = TextProcessor()
        text = "Visit http://example.com and https://test.com for more info."

        urls = processor.extract_urls(text)

        assert len(urls) == 2
        assert "http://example.com" in urls
        assert "https://test.com" in urls

    def test_extract_email_addresses(self):
        from src.modules.mime.services.text_processor import TextProcessor

        processor = TextProcessor()
        text = "Contact john@example.com or jane@test.com for help."

        emails = processor.extract_email_addresses(text)

        assert len(emails) == 2
        assert "john@example.com" in emails
        assert "jane@test.com" in emails


class TestAttachmentExtractor:
    def test_extract_attachment(self):
        from src.modules.mime.services.attachment_extractor import AttachmentExtractor

        extractor = AttachmentExtractor()
        content = b"This is test content"
        content_type = "text/plain"

        result = extractor.extract(
            content_type=content_type,
            filename="test.txt",
            content_id=None,
            content_disposition="attachment",
            payload=content,
        )

        assert result["filename"] == "test.txt"
        assert result["content_type"] == content_type
        assert result["file_size"] == len(content)
        assert result["is_safe"] is True

    def test_sanitize_filename(self):
        from src.modules.mime.services.attachment_extractor import AttachmentExtractor

        extractor = AttachmentExtractor()

        safe = extractor._sanitize_filename("../../../etc/passwd.txt")
        assert ".." not in safe
        assert "/" not in safe

    def test_check_security_dangerous(self):
        from src.modules.mime.services.attachment_extractor import AttachmentExtractor

        extractor = AttachmentExtractor()

        result = extractor._check_security(
            "malware.exe",
            ".exe",
            b"MZ",
        )

        assert result["is_safe"] is False
        assert result["flag"] == "dangerous"

    def test_check_security_suspicious(self):
        from src.modules.mime.services.attachment_extractor import AttachmentExtractor

        extractor = AttachmentExtractor()

        result = extractor._check_security(
            "document.docm",
            ".docm",
            b"PK",
        )

        assert result["flag"] == "suspicious"

    def test_calculate_hash(self):
        from src.modules.mime.services.attachment_extractor import AttachmentExtractor

        extractor = AttachmentExtractor()
        content = b"test content"

        hash_result = extractor._calculate_hash(content)

        import hashlib
        expected = hashlib.sha256(content).hexdigest()
        assert hash_result == expected


class TestSecurityValidator:
    def test_validate_message_safe(self):
        from src.modules.mime.security.validator import SecurityValidator

        validator = SecurityValidator()

        result = validator.validate_message(
            message_size=1000,
            part_count=5,
            nesting_depth=2,
        )

        assert result["is_safe"] is True
        assert result["flag"] == "none"

    def test_validate_message_oversized(self):
        from src.modules.mime.security.validator import SecurityValidator

        validator = SecurityValidator()

        result = validator.validate_message(
            message_size=200 * 1024 * 1024,
            part_count=5,
            nesting_depth=2,
        )

        assert result["is_safe"] is False
        assert "oversized" in result["flags"]

    def test_validate_part_safe(self):
        from src.modules.mime.security.validator import SecurityValidator

        validator = SecurityValidator()

        result = validator.validate_part(
            content_type="text/plain",
            content_disposition="attachment",
            filename="document.txt",
            content_id=None,
        )

        assert result["is_safe"] is True

    def test_validate_part_dangerous(self):
        from src.modules.mime.security.validator import SecurityValidator

        validator = SecurityValidator()

        result = validator.validate_part(
            content_type="application/x-msdownload",
            content_disposition="attachment",
            filename="malware.exe",
            content_id=None,
        )

        assert result["is_safe"] is False
        assert "dangerous_content_type" in result["flags"]

    def test_validate_filename_path_traversal(self):
        from src.modules.mime.security.validator import SecurityValidator

        validator = SecurityValidator()

        result = validator._validate_filename("../../../etc/passwd.txt")

        assert "path_traversal" in result["flags"]

    def test_scan_html_safe(self):
        from src.modules.mime.security.validator import SecurityValidator

        validator = SecurityValidator()

        result = validator.scan_html_content("<html><body>Hello</body></html>")

        assert result["is_safe"] is True

    def test_scan_html_xss(self):
        from src.modules.mime.security.validator import SecurityValidator

        validator = SecurityValidator()

        result = validator.scan_html_content(
            '<html><body><script>alert("xss")</script></body></html>'
        )

        assert result["is_safe"] is False
