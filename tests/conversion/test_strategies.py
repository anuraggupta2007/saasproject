import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone

from src.modules.conversion.strategies.base import ConversionContext, ConversionResult
from src.modules.conversion.strategies.eml_strategy import EmlConversionStrategy
from src.modules.conversion.strategies.html_strategy import HtmlConversionStrategy
from src.modules.conversion.strategies.txt_strategy import TxtConversionStrategy
from src.modules.conversion.strategies.json_strategy import JsonConversionStrategy
from src.modules.conversion.strategies.csv_strategy import CsvConversionStrategy
from src.modules.conversion.strategies.markdown_strategy import MarkdownConversionStrategy
from src.modules.conversion.strategies.xml_strategy import XmlConversionStrategy
from src.modules.conversion.strategies.mhtml_strategy import MhtmlConversionStrategy
from src.modules.conversion.strategies.pdf_strategy import PdfConversionStrategy
from src.modules.conversion.strategies.factory import ConversionStrategyFactory


@pytest.fixture
def sample_context():
    return ConversionContext(
        message_id="test-message-id",
        subject="Test Subject",
        from_address="sender@example.com",
        to_addresses=["recipient@example.com"],
        cc_addresses=[],
        date="2024-01-15T10:30:00Z",
        html_body="<p>Hello World</p>",
        text_body="Hello World",
        attachments=[],
    )


class TestEmlStrategy:
    def test_get_format(self):
        strategy = EmlConversionStrategy()
        assert strategy.get_format() == "eml"

    def test_get_content_type(self):
        strategy = EmlConversionStrategy()
        assert strategy.get_content_type() == "message/rfc822"

    def test_get_file_extension(self):
        strategy = EmlConversionStrategy()
        assert strategy.get_file_extension() == ".eml"

    @pytest.mark.asyncio
    async def test_convert_basic(self, sample_context):
        strategy = EmlConversionStrategy()
        result = await strategy.convert(sample_context)
        assert result.success is True
        assert result.content is not None
        assert result.filename.endswith(".eml")


class TestHtmlStrategy:
    def test_get_format(self):
        strategy = HtmlConversionStrategy()
        assert strategy.get_format() == "html"

    def test_get_content_type(self):
        strategy = HtmlConversionStrategy()
        assert strategy.get_content_type() == "text/html"

    @pytest.mark.asyncio
    async def test_convert_basic(self, sample_context):
        strategy = HtmlConversionStrategy()
        result = await strategy.convert(sample_context)
        assert result.success is True
        assert result.content is not None
        assert result.filename.endswith(".html")


class TestTxtStrategy:
    def test_get_format(self):
        strategy = TxtConversionStrategy()
        assert strategy.get_format() == "txt"

    def test_get_content_type(self):
        strategy = TxtConversionStrategy()
        assert strategy.get_content_type() == "text/plain"

    @pytest.mark.asyncio
    async def test_convert_basic(self, sample_context):
        strategy = TxtConversionStrategy()
        result = await strategy.convert(sample_context)
        assert result.success is True
        assert result.content is not None
        assert result.filename.endswith(".txt")


class TestJsonStrategy:
    def test_get_format(self):
        strategy = JsonConversionStrategy()
        assert strategy.get_format() == "json"

    def test_get_content_type(self):
        strategy = JsonConversionStrategy()
        assert strategy.get_content_type() == "application/json"

    @pytest.mark.asyncio
    async def test_convert_basic(self, sample_context):
        strategy = JsonConversionStrategy()
        result = await strategy.convert(sample_context)
        assert result.success is True
        assert result.content is not None
        assert result.filename.endswith(".json")


class TestCsvStrategy:
    def test_get_format(self):
        strategy = CsvConversionStrategy()
        assert strategy.get_format() == "csv"

    def test_get_content_type(self):
        strategy = CsvConversionStrategy()
        assert strategy.get_content_type() == "text/csv"

    @pytest.mark.asyncio
    async def test_convert_basic(self, sample_context):
        strategy = CsvConversionStrategy()
        result = await strategy.convert(sample_context)
        assert result.success is True
        assert result.content is not None
        assert result.filename.endswith(".csv")


class TestMarkdownStrategy:
    def test_get_format(self):
        strategy = MarkdownConversionStrategy()
        assert strategy.get_format() == "markdown"

    def test_get_content_type(self):
        strategy = MarkdownConversionStrategy()
        assert strategy.get_content_type() == "text/markdown"

    @pytest.mark.asyncio
    async def test_convert_basic(self, sample_context):
        strategy = MarkdownConversionStrategy()
        result = await strategy.convert(sample_context)
        assert result.success is True
        assert result.content is not None
        assert result.filename.endswith(".md")


class TestXmlStrategy:
    def test_get_format(self):
        strategy = XmlConversionStrategy()
        assert strategy.get_format() == "xml"

    def test_get_content_type(self):
        strategy = XmlConversionStrategy()
        assert strategy.get_content_type() == "application/xml"

    @pytest.mark.asyncio
    async def test_convert_basic(self, sample_context):
        strategy = XmlConversionStrategy()
        result = await strategy.convert(sample_context)
        assert result.success is True
        assert result.content is not None
        assert result.filename.endswith(".xml")


class TestMhtmlStrategy:
    def test_get_format(self):
        strategy = MhtmlConversionStrategy()
        assert strategy.get_format() == "mhtml"

    def test_get_content_type(self):
        strategy = MhtmlConversionStrategy()
        assert strategy.get_content_type() == "multipart/related"

    @pytest.mark.asyncio
    async def test_convert_basic(self, sample_context):
        strategy = MhtmlConversionStrategy()
        result = await strategy.convert(sample_context)
        assert result.success is True
        assert result.content is not None
        assert result.filename.endswith(".mhtml")


class TestPdfStrategy:
    def test_get_format(self):
        strategy = PdfConversionStrategy()
        assert strategy.get_format() == "pdf"

    def test_get_content_type(self):
        strategy = PdfConversionStrategy()
        assert strategy.get_content_type() == "application/pdf"

    @pytest.mark.asyncio
    async def test_convert_basic(self, sample_context):
        strategy = PdfConversionStrategy()
        result = await strategy.convert(sample_context)
        assert result.success is True
        assert result.content is not None
        assert result.filename.endswith(".html")


class TestStrategyFactory:
    def test_get_supported_formats(self):
        formats = ConversionStrategyFactory.get_supported_formats()
        assert "eml" in formats
        assert "html" in formats
        assert "pdf" in formats
        assert "txt" in formats
        assert "json" in formats
        assert "csv" in formats
        assert "markdown" in formats
        assert "xml" in formats
        assert "mhtml" in formats

    def test_is_supported(self):
        assert ConversionStrategyFactory.is_supported("html") is True
        assert ConversionStrategyFactory.is_supported("invalid") is False

    def test_get_strategy(self):
        strategy = ConversionStrategyFactory.get_strategy("html")
        assert isinstance(strategy, HtmlConversionStrategy)

    def test_get_strategy_unsupported(self):
        with pytest.raises(ValueError, match="Unsupported output format"):
            ConversionStrategyFactory.get_strategy("invalid")

    def test_get_format_info(self):
        info = ConversionStrategyFactory.get_format_info("html")
        assert info["format"] == "html"
        assert info["content_type"] == "text/html"
        assert info["extension"] == ".html"

    def test_register_custom_strategy(self):
        class CustomStrategy:
            def get_format(self):
                return "custom"
            def get_content_type(self):
                return "text/custom"
            def get_file_extension(self):
                return ".custom"
            async def convert(self, context):
                return ConversionResult(success=True, content="", file_size=0)

        ConversionStrategyFactory.register("custom", CustomStrategy)
        assert ConversionStrategyFactory.is_supported("custom") is True
        assert ConversionStrategyFactory.get_format_info("custom")["format"] == "custom"
