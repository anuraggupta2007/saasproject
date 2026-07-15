from src.modules.conversion.strategies.base import ConversionStrategy
from src.modules.conversion.strategies.eml_strategy import EmlConversionStrategy
from src.modules.conversion.strategies.html_strategy import HtmlConversionStrategy
from src.modules.conversion.strategies.txt_strategy import TxtConversionStrategy
from src.modules.conversion.strategies.json_strategy import JsonConversionStrategy
from src.modules.conversion.strategies.csv_strategy import CsvConversionStrategy
from src.modules.conversion.strategies.markdown_strategy import MarkdownConversionStrategy
from src.modules.conversion.strategies.xml_strategy import XmlConversionStrategy
from src.modules.conversion.strategies.mhtml_strategy import MhtmlConversionStrategy
from src.modules.conversion.strategies.pdf_strategy import PdfConversionStrategy


class ConversionStrategyFactory:
    _strategies: dict[str, type[ConversionStrategy]] = {}

    @classmethod
    def register(cls, format_name: str, strategy_class: type[ConversionStrategy]) -> None:
        cls._strategies[format_name] = strategy_class

    @classmethod
    def get_strategy(cls, format_name: str) -> ConversionStrategy:
        if format_name not in cls._strategies:
            raise ValueError(f"Unsupported output format: {format_name}")
        return cls._strategies[format_name]()

    @classmethod
    def get_supported_formats(cls) -> list[str]:
        return list(cls._strategies.keys())

    @classmethod
    def is_supported(cls, format_name: str) -> bool:
        return format_name in cls._strategies

    @classmethod
    def get_format_info(cls, format_name: str) -> dict:
        strategy = cls.get_strategy(format_name)
        return {
            "format": strategy.get_format(),
            "content_type": strategy.get_content_type(),
            "extension": strategy.get_file_extension(),
        }


def register_default_strategies() -> None:
    ConversionStrategyFactory.register("eml", EmlConversionStrategy)
    ConversionStrategyFactory.register("html", HtmlConversionStrategy)
    ConversionStrategyFactory.register("txt", TxtConversionStrategy)
    ConversionStrategyFactory.register("json", JsonConversionStrategy)
    ConversionStrategyFactory.register("csv", CsvConversionStrategy)
    ConversionStrategyFactory.register("markdown", MarkdownConversionStrategy)
    ConversionStrategyFactory.register("xml", XmlConversionStrategy)
    ConversionStrategyFactory.register("mhtml", MhtmlConversionStrategy)
    ConversionStrategyFactory.register("pdf", PdfConversionStrategy)


register_default_strategies()
