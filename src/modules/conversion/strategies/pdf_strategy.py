from src.modules.conversion.strategies.base import (
    ConversionStrategy,
    ConversionContext,
    ConversionResult,
)


class PdfConversionStrategy(ConversionStrategy):
    def get_format(self) -> str:
        return "pdf"

    def get_content_type(self) -> str:
        return "application/pdf"

    def get_file_extension(self) -> str:
        return ".pdf"

    def validate_context(self, context: ConversionContext) -> list[str]:
        return []

    def _get_html_filename(self, context: ConversionContext) -> str:
        """
        The strategy's advertised format is PDF (see get_format/
        get_content_type/get_file_extension, used for routing), but convert()
        currently returns an HTML template intended for a downstream PDF
        renderer rather than a real PDF. The filename should reflect the
        HTML content actually being returned.
        """
        subject = context.subject or "email"
        safe_subject = "".join(
            c if c.isalnum() or c in "-_ " else "_"
            for c in subject
        ).strip()[:100]
        return f"{safe_subject}.html"

    async def convert(self, context: ConversionContext) -> ConversionResult:
        errors = self.validate_context(context)
        if errors:
            return ConversionResult(success=False, errors=errors)

        try:
            html_content = self._generate_pdf_html(context)
            filename = self._get_html_filename(context)

            return ConversionResult(
                success=True,
                content=html_content,
                filename=filename,
                content_type="text/html",
                file_size=len(html_content.encode("utf-8")),
                metadata={
                    "format": "pdf",
                    "note": "HTML template for PDF conversion - use with PDF renderer",
                    "requires_renderer": True,
                },
            )

        except Exception as e:
            return ConversionResult(
                success=False,
                errors=[f"PDF conversion failed: {str(e)}"],
            )

    def _generate_pdf_html(self, context: ConversionContext) -> str:
        subject = self._escape_html(context.subject or "No Subject")
        from_addr = self._escape_html(context.from_address or "Unknown")
        to_addrs = ", ".join(context.to_addresses or [])
        to_addrs = self._escape_html(to_addrs)
        date = self._escape_html(self._format_date(context.date))

        body_content = context.html_body or ""
        if not body_content and context.text_body:
            body_content = f"<pre>{self._escape_html(context.text_body)}</pre>"
        elif not body_content:
            body_content = "<p>No content</p>"

        attachments_html = ""
        if context.attachments:
            attachments_list = ""
            for i, att in enumerate(context.attachments, 1):
                filename = self._escape_html(att.get("filename", "attachment"))
                size = att.get("file_size", 0)
                size_str = self._format_size(size)
                attachments_list += f"""
                <tr>
                    <td>{i}</td>
                    <td>{filename}</td>
                    <td>{size_str}</td>
                </tr>
                """
            attachments_html = f"""
            <div class="attachments">
                <h2>Attachments</h2>
                <table>
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Filename</th>
                            <th>Size</th>
                        </tr>
                    </thead>
                    <tbody>
                        {attachments_list}
                    </tbody>
                </table>
            </div>
            """

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{subject}</title>
    <style>
        @page {{
            size: A4;
            margin: 2cm;
        }}

        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 12pt;
            line-height: 1.6;
            color: #333;
            max-width: 100%;
        }}

        .header {{
            border-bottom: 2px solid #0066cc;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }}

        .header h1 {{
            font-size: 24pt;
            color: #1a1a1a;
            margin-bottom: 15px;
        }}

        .meta-table {{
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
        }}

        .meta-table td {{
            padding: 8px 12px;
            border-bottom: 1px solid #eee;
        }}

        .meta-table td:first-child {{
            font-weight: bold;
            width: 100px;
            color: #666;
        }}

        .body {{
            margin: 30px 0;
            padding: 20px;
            background: #fafafa;
            border-radius: 4px;
        }}

        .body h2 {{
            font-size: 14pt;
            color: #1a1a1a;
            margin-bottom: 15px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 10px;
        }}

        .attachments {{
            margin-top: 30px;
        }}

        .attachments h2 {{
            font-size: 14pt;
            color: #1a1a1a;
            margin-bottom: 15px;
        }}

        table {{
            width: 100%;
            border-collapse: collapse;
        }}

        th, td {{
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #ddd;
        }}

        th {{
            background: #f5f5f5;
            font-weight: bold;
        }}

        .footer {{
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 10pt;
            color: #999;
            text-align: center;
        }}

        .page-number {{
            text-align: center;
            font-size: 10pt;
            color: #999;
            margin-top: 20px;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>{subject}</h1>
        <table class="meta-table">
            <tr>
                <td>From:</td>
                <td>{from_addr}</td>
            </tr>
            <tr>
                <td>To:</td>
                <td>{to_addrs}</td>
            </tr>
            <tr>
                <td>Date:</td>
                <td>{date}</td>
            </tr>
            <tr>
                <td>Message ID:</td>
                <td>{context.message_id}</td>
            </tr>
        </table>
    </div>

    <div class="body">
        <h2>Email Content</h2>
        {body_content}
    </div>

    {attachments_html}

    <div class="footer">
        <p>Generated by Email Converter SaaS</p>
        <p>Page 1 of 1</p>
    </div>
</body>
</html>"""

    def _format_size(self, size: int) -> str:
        for unit in ["B", "KB", "MB", "GB"]:
            if size < 1024:
                return f"{size:.1f} {unit}"
            size /= 1024
        return f"{size:.1f} TB"
