import base64
import binascii
import quopri
import codecs
from typing import Any

from src.core.logging import get_logger

logger = get_logger(__name__)


class ContentDecoder:
    def __init__(self):
        self.supported_encodings = {
            "base64",
            "quoted-printable",
            "7bit",
            "8bit",
            "binary",
            "uuencode",
            "x-uuencode",
            "x-uue",
        }

        self.charset_aliases = {
            "utf8": "utf-8",
            "utf-8": "utf-8",
            "utf-16": "utf-16",
            "utf-16-le": "utf-16-le",
            "utf-16-be": "utf-16-be",
            "utf-32": "utf-32",
            "iso-8859-1": "iso-8859-1",
            "iso8859-1": "iso-8859-1",
            "latin-1": "iso-8859-1",
            "latin1": "iso-8859-1",
            "windows-1252": "windows-1252",
            "cp1252": "windows-1252",
            "shift_jis": "shift_jis",
            "shift-jis": "shift_jis",
            "shiftjis": "shift_jis",
            "sjis": "shift_jis",
            "gb18030": "gb18030",
            "gb2312": "gb2312",
            "gbk": "gbk",
            "euc-kr": "euc-kr",
            "euckr": "euc-kr",
            "big5": "big5",
            "big-5": "big5",
            "iso-2022-jp": "iso-2022-jp",
            "iso-2022-kr": "iso-2022-kr",
            "us-ascii": "us-ascii",
            "ascii": "us-ascii",
            "us_ascii": "us-ascii",
        }

    def decode(
        self,
        data: str | bytes,
        encoding: str | None = None,
        charset: str | None = None,
    ) -> tuple[bytes, str | None]:
        if isinstance(data, str):
            data = data.encode("utf-8", errors="replace")

        if not encoding:
            encoding = self._detect_encoding(data)

        decoded = self._decode_transfer_encoding(data, encoding)

        detected_charset = None
        if charset:
            detected_charset = self._normalize_charset(charset)

        return decoded, detected_charset

    def decode_text(
        self,
        data: str | bytes,
        encoding: str | None = None,
        charset: str | None = None,
    ) -> str:
        decoded_bytes, detected_charset = self.decode(data, encoding, charset)

        final_charset = detected_charset or charset or "utf-8"
        final_charset = self._normalize_charset(final_charset)

        try:
            return decoded_bytes.decode(final_charset, errors="replace")
        except (LookupError, UnicodeDecodeError) as e:
            logger.warning(
                "charset_decode_failed",
                charset=final_charset,
                error=str(e),
                fallback="utf-8",
            )
            return decoded_bytes.decode("utf-8", errors="replace")

    def _detect_encoding(self, data: bytes) -> str:
        if len(data) == 0:
            return "7bit"

        non_ascii_count = sum(1 for byte in data if byte > 127)
        total_count = len(data)

        if total_count == 0:
            return "7bit"

        non_ascii_ratio = non_ascii_count / total_count

        if non_ascii_ratio == 0:
            return "7bit"
        elif non_ascii_ratio > 0.3:
            return "8bit"

        if self._looks_like_base64(data):
            return "base64"

        if self._looks_like_quoted_printable(data):
            return "quoted-printable"

        return "8bit"

    def _looks_like_base64(self, data: bytes) -> bool:
        try:
            if len(data) % 4 != 0:
                return False

            sample = data[:1024]
            base64.b64decode(sample, validate=True)
            return True
        except (binascii.Error, ValueError):
            return False

    def _looks_like_quoted_printable(self, data: bytes) -> bool:
        sample = data[:1024]
        eq_count = sample.count(b"=")
        return eq_count > 0 and eq_count / len(sample) > 0.01

    def _decode_transfer_encoding(
        self,
        data: bytes,
        encoding: str,
    ) -> bytes:
        encoding = encoding.lower().strip()

        if encoding == "base64":
            try:
                return base64.b64decode(data)
            except (binascii.Error, ValueError) as e:
                logger.warning("base64_decode_failed", error=str(e))
                try:
                    padded = data + b"=" * (4 - len(data) % 4)
                    return base64.b64decode(padded)
                except Exception:
                    return data

        elif encoding == "quoted-printable":
            try:
                return quopri.decodestring(data)
            except Exception as e:
                logger.warning("quoted_printable_decode_failed", error=str(e))
                return data

        elif encoding in ("7bit", "ascii"):
            return data

        elif encoding in ("8bit", "binary"):
            return data

        elif encoding in ("uuencode", "x-uuencode", "x-uue"):
            try:
                import binascii
                return binascii.a2b_uu(data.decode("ascii", errors="replace"))
            except Exception as e:
                logger.warning("uuencode_decode_failed", error=str(e))
                return data

        else:
            logger.warning("unknown_encoding", encoding=encoding)
            return data

    def _normalize_charset(self, charset: str) -> str:
        charset = charset.lower().strip()
        charset = charset.replace("iso-", "iso")

        normalized = self.charset_aliases.get(charset)

        if not normalized:
            try:
                codec = codecs.lookup(charset)
                return codec.name
            except LookupError:
                logger.warning("unknown_charset", charset=charset, fallback="utf-8")
                return "utf-8"

        return normalized

    def is_supported_encoding(self, encoding: str) -> bool:
        return encoding.lower().strip() in self.supported_encodings

    def get_charset_aliases(self, charset: str) -> list[str]:
        charset = charset.lower().strip()
        aliases = [charset]

        for alias, normalized in self.charset_aliases.items():
            if normalized == charset and alias not in aliases:
                aliases.append(alias)

        return aliases
