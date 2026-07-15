import html as html_module
from pathlib import Path

from src.modules.conversion.strategies.base import (
    ConversionStrategy,
    ConversionContext,
    ConversionResult,
)


class HtmlConversionStrategy(ConversionStrategy):
    def get_format(self) -> str:
        return "html"

    def get_content_type(self) -> str:
        return "text/html"

    def get_file_extension(self) -> str:
        return ".html"

    def validate_context(self, context: ConversionContext) -> list[str]:
        return []

    async def convert(self, context: ConversionContext) -> ConversionResult:
        errors = self.validate_context(context)
        if errors:
            return ConversionResult(success=False, errors=errors)

        try:
            html_content = self._generate_html(context)
            filename = self.get_default_filename(context)

            return ConversionResult(
                success=True,
                content=html_content,
                filename=filename,
                content_type=self.get_content_type(),
                file_size=len(html_content.encode("utf-8")),
                metadata={
                    "format": "html",
                    "responsive": True,
                    "dark_mode_compatible": True,
                },
            )

        except Exception as e:
            return ConversionResult(
                success=False,
                errors=[f"HTML conversion failed: {str(e)}"],
            )

    def _generate_html(self, context: ConversionContext) -> str:
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
            for att in context.attachments:
                filename = self._escape_html(att.get("filename", "attachment"))
                size = att.get("file_size", 0)
                size_str = self._format_size(size)
                attachments_list += f"""
                <div class="attachment">
                    <span class="attachment-icon">📎</span>
                    <span class="attachment-name">{filename}</span>
                    <span class="attachment-size">({size_str})</span>
                </div>
                """
            attachments_html = f"""
            <div class="attachments-section">
                <h3>Attachments ({len(context.attachments)})</h3>
                {attachments_list}
            </div>
            """

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{subject}</title>
    <style>
        :root {{
            --bg-primary: #ffffff;
            --bg-secondary: #f8f9fa;
            --text-primary: #1a1a1a;
            --text-secondary: #666666;
            --border-color: #e0e0e0;
            --accent-color: #0066cc;
        }}

        @media (prefers-color-scheme: dark) {{
            :root {{
                --bg-primary: #1a1a1a;
                --bg-secondary: #2d2d2d;
                --text-primary: #ffffff;
                --text-secondary: #b0b0b0;
                --border-color: #404040;
                --accent-color: #4da6ff;
            }}
        }}

        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}

        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background-color: var(--bg-secondary);
            color: var(--text-primary);
            line-height: 1.6;
            padding: 20px;
        }}

        .email-container {{
            max-width: 800px;
            margin: 0 auto;
            background: var(--bg-primary);
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }}

        .email-header {{
            background: var(--bg-secondary);
            padding: 20px;
            border-bottom: 1px solid var(--border-color);
        }}

        .email-header h1 {{
            font-size: 1.5rem;
            margin-bottom: 10px;
            color: var(--text-primary);
        }}

        .email-meta {{
            font-size: 0.9rem;
            color: var(--text-secondary);
        }}

        .email-meta div {{
            margin-bottom: 5px;
        }}

        .email-meta strong {{
            color: var(--text-primary);
        }}

        .email-body {{
            padding: 30px;
            min-height: 200px;
        }}

        .email-body img {{
            max-width: 100%;
            height: auto;
        }}

        .attachments-section {{
            background: var(--bg-secondary);
            padding: 20px;
            border-top: 1px solid var(--border-color);
        }}

        .attachments-section h3 {{
            font-size: 1rem;
            margin-bottom: 10px;
            color: var(--text-secondary);
        }}

        .attachment {{
            display: flex;
            align-items: center;
            padding: 10px;
            background: var(--bg-primary);
            border-radius: 4px;
            margin-bottom: 8px;
        }}

        .attachment-icon {{
            margin-right: 10px;
        }}

        .attachment-name {{
            flex: 1;
            font-weight: 500;
        }}

        .attachment-size {{
            color: var(--text-secondary);
            font-size: 0.85rem;
        }}

        .email-footer {{
            background: var(--bg-secondary);
            padding: 15px 20px;
            border-top: 1px solid var(--border-color);
            font-size: 0.8rem;
            color: var(--text-secondary);
            text-align: center;
        }}

        @media (max-width: 600px) {{
            body {{
                padding: 10px;
            }}

            .email-header h1 {{
                font-size: 1.2rem;
            }}

            .email-body {{
                padding: 15px;
            }}
        }}
    </style>
</head>
<body>
    <div class="email-container">
        <div class="email-header">
            <h1>{subject}</h1>
            <div class="email-meta">
                <div><strong>From:</strong> {from_addr}</div>
                <div><strong>To:</strong> {to_addrs}</div>
                <div><strong>Date:</strong> {date}</div>
            </div>
        </div>
        <div class="email-body">
            {body_content}
        </div>
        {attachments_html}
        <div class="email-footer">
            Generated by Email Converter SaaS
        </div>
    </div>
</body>
</html>"""

    def _format_size(self, size: int) -> str:
        for unit in ["B", "KB", "MB", "GB"]:
            if size < 1024:
                return f"{size:.1f} {unit}"
            size /= 1024
        return f"{size:.1f} TB"
