import pytest


class TestMimeCompliance:
    def test_parse_rfc822_headers(self):
        from src.modules.mime.services.parser import MimeParser

        parser = MimeParser()
        raw_content = (
            "From: sender@example.com\r\n"
            "To: recipient@example.com\r\n"
            "Subject: Test\r\n"
            "Date: Mon, 01 Jan 2024 12:00:00 +0000\r\n"
            "Message-ID: <test123@example.com>\r\n"
            "\r\n"
            "Hello, World!"
        )

        result = parser.parse(raw_content)

        assert result["success"] is True
        headers = result["message"]["headers"]
        assert headers.get("From") == "sender@example.com"
        assert headers.get("To") == "recipient@example.com"
        assert headers.get("Subject") == "Test"

    def test_parse_multipart_alternative(self):
        from src.modules.mime.services.parser import MimeParser
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText

        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Test"
        msg["From"] = "sender@example.com"
        msg["To"] = "recipient@example.com"

        text_part = MIMEText("Plain text version", "plain")
        html_part = MIMEText("<html><body>HTML version</body></html>", "html")

        msg.attach(text_part)
        msg.attach(html_part)

        parser = MimeParser()
        result = parser.parse(msg.as_string())

        assert result["success"] is True
        assert len(result["parts"]) >= 2

    def test_parse_multipart_related(self):
        from src.modules.mime.services.parser import MimeParser
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText
        from email.mime.image import MIMEImage

        msg = MIMEMultipart("related")
        msg["Subject"] = "Test"
        msg["From"] = "sender@example.com"
        msg["To"] = "recipient@example.com"

        html_part = MIMEText(
            '<html><body><img src="cid:image001"></body></html>',
            "html",
        )
        msg.attach(html_part)

        img_data = b"\x89PNG\r\n\x1a\n" + b"\x00" * 100
        img_part = MIMEImage(img_data, _subtype="png")
        img_part.add_header("Content-ID", "<image001>")
        msg.attach(img_part)

        parser = MimeParser()
        result = parser.parse(msg.as_string())

        assert result["success"] is True

    def test_parse_nested_multipart(self):
        from src.modules.mime.services.parser import MimeParser
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText

        outer = MIMEMultipart("mixed")
        outer["Subject"] = "Test"
        outer["From"] = "sender@example.com"
        outer["To"] = "recipient@example.com"

        inner = MIMEMultipart("alternative")
        text_part = MIMEText("Plain text", "plain")
        html_part = MIMEText("<html><body>HTML</body></html>", "html")
        inner.attach(text_part)
        inner.attach(html_part)

        outer.attach(inner)

        attachment = MIMEText("Attachment content", "plain")
        attachment.add_header(
            "Content-Disposition",
            'attachment; filename="attachment.txt"',
        )
        outer.attach(attachment)

        parser = MimeParser()
        result = parser.parse(outer.as_string())

        assert result["success"] is True

    def test_parse_message_rfc822(self):
        from src.modules.mime.services.parser import MimeParser
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText

        inner_msg = MIMEText("Inner message content", "plain")
        inner_msg["Subject"] = "Inner"
        inner_msg["From"] = "inner@example.com"
        inner_msg["To"] = "outer@example.com"

        outer = MIMEMultipart("mixed")
        outer["Subject"] = "Forwarded"
        outer["From"] = "forwarder@example.com"
        outer["To"] = "recipient@example.com"

        forward_part = MIMEText(inner_msg.as_string(), "plain")
        forward_part.add_header("Content-Type", "message/rfc822")
        outer.attach(forward_part)

        parser = MimeParser()
        result = parser.parse(outer.as_string())

        assert result["success"] is True


class TestNestedMime:
    def test_deep_nesting(self):
        from src.modules.mime.services.parser import MimeParser

        parser = MimeParser()

        current = "Final content"
        for i in range(10):
            current = (
                f"Content-Type: multipart/mixed; boundary=\"part{i}\"\r\n"
                f"\r\n"
                f"--part{i}\r\n"
                f"Content-Type: text/plain\r\n"
                f"\r\n"
                f"Level {i}\r\n"
                f"--part{i}\r\n"
                f"Content-Type: text/plain\r\n"
                f"\r\n"
                f"{current}\r\n"
                f"--part{i}--\r\n"
            )

        result = parser.parse(current)

        assert result["success"] is True

    def test_mixed_content_types(self):
        from src.modules.mime.services.parser import MimeParser
        from email.mime.multipart import MIMEMultipart
        from email.mime.text import MIMEText
        from email.mime.base import MIMEBase
        from email import encoders

        msg = MIMEMultipart("mixed")
        msg["Subject"] = "Mixed"
        msg["From"] = "sender@example.com"
        msg["To"] = "recipient@example.com"

        text = MIMEText("Plain text", "plain")
        msg.attach(text)

        html = MIMEText("<html><body>HTML</body></html>", "html")
        msg.attach(html)

        pdf = MIMEBase("application", "pdf")
        pdf.set_payload(b"%PDF-1.4 test content")
        encoders.encode_base64(pdf)
        pdf.add_header("Content-Disposition", 'attachment; filename="doc.pdf"')
        msg.attach(pdf)

        parser = MimeParser()
        result = parser.parse(msg.as_string())

        assert result["success"] is True


class TestEncodingCompliance:
    def test_base64_encoding(self):
        import base64
        from src.modules.mime.services.decoder import ContentDecoder

        decoder = ContentDecoder()
        original = "Hello, World! こんにちは"
        encoded = base64.b64encode(original.encode("utf-8")).decode()

        result = decoder.decode_text(encoded, "base64", "utf-8")

        assert result == original

    def test_quoted_printable_encoding(self):
        import quopri
        from src.modules.mime.services.decoder import ContentDecoder

        decoder = ContentDecoder()
        original = "Hello, World! こんにちは"
        encoded = quopri.encodestring(original.encode("utf-8")).decode()

        result = decoder.decode_text(encoded, "quoted-printable", "utf-8")

        assert result == original

    def test_8bit_encoding(self):
        from src.modules.mime.services.decoder import ContentDecoder

        decoder = ContentDecoder()
        original = "Hello, 世界！"

        result = decoder.decode_text(original.encode("utf-8"), "8bit", "utf-8")

        assert result == original

    def test_charset_fallback(self):
        from src.modules.mime.services.decoder import ContentDecoder

        decoder = ContentDecoder()

        data = "Hello, World!".encode("utf-8")
        result = decoder.decode_text(data, "7bit", "nonexistent-charset")

        assert result == "Hello, World!"
