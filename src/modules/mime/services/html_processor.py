import re
from typing import Any
from urllib.parse import urlparse, urljoin

from src.core.logging import get_logger

logger = get_logger(__name__)


class HtmlProcessor:
    def __init__(self):
        self.tracking_pixel_patterns = [
            r'<img[^>]+(?:width|height)\s*=\s*["\']?[01]["\']?[^>]*>',
            r'<img[^>]+src\s*=\s*["\'][^"\']*\.(?:gif|png|jpg|jpeg|webp)\?[^"\']*["\']',
            r'<img[^>]+style\s*=\s*["\'][^"\']*(?:display\s*:\s*none|visibility\s*:\s*hidden|opacity\s*:\s*0)[^"\']*["\']',
            r'<pixel[^>]*>',
            r'<tracking[^>]*>',
        ]

        self.external_resource_patterns = [
            r'<(?:img|script|link|video|audio|source|iframe|embed|object)[^>]+src\s*=\s*["\']https?://[^"\']+["\']',
            r'<(?:img|script|link|video|audio|source|iframe|embed|object)[^>]+href\s*=\s*["\']https?://[^"\']+["\']',
            r'url\s*\(\s*["\']?https?://[^"\')\s]+',
        ]

        self.allowed_tags = {
            "a", "abbr", "acronym", "address", "area", "article", "aside",
            "b", "bdi", "bdo", "blockquote", "br", "caption", "cite",
            "code", "col", "colgroup", "dd", "del", "details", "dfn", "div",
            "dl", "dt", "em", "fieldset", "figcaption", "figure", "footer",
            "h1", "h2", "h3", "h4", "h5", "h6", "header", "hgroup", "hr",
            "i", "img", "ins", "kbd", "li", "main", "map", "mark", "nav",
            "ol", "p", "pre", "q", "rp", "rt", "ruby", "s", "samp",
            "section", "small", "span", "strong", "sub", "summary", "sup",
            "table", "tbody", "td", "tfoot", "th", "thead", "time", "tr",
            "u", "ul", "var", "wbr",
        }

        self.allowed_attributes = {
            "a": {"href", "title", "target", "rel"},
            "img": {"src", "alt", "title", "width", "height", "data-src"},
            "td": {"colspan", "rowspan", "align", "valign"},
            "th": {"colspan", "rowspan", "align", "valign", "scope"},
            "table": {"cellpadding", "cellspacing", "border", "width", "align"},
            "div": {"align", "dir"},
            "p": {"align", "dir"},
            "span": {"lang", "dir"},
            "*": {"class", "id", "lang", "dir", "style"},
        }

    def process(
        self,
        html: str,
        cid_images: dict[str, str] | None = None,
        base_url: str | None = None,
        sanitize: bool = True,
    ) -> dict[str, Any]:
        if not html:
            return {
                "html": "",
                "size": 0,
                "sanitized": False,
                "cid_images": {},
                "has_external_resources": False,
                "has_tracking_pixels": False,
                "link_count": 0,
                "embedded_count": 0,
            }

        if cid_images:
            html = self._rewrite_cid_images(html, cid_images)

        if base_url:
            html = self._rewrite_relative_urls(html, base_url)

        has_external = self._has_external_resources(html)
        has_tracking = self._has_tracking_pixels(html)
        link_count = self._count_links(html)
        embedded_count = self._count_embedded_resources(html)

        if sanitize:
            html = self._sanitize_html(html)

        html = self._normalize_html(html)

        return {
            "html": html,
            "size": len(html.encode("utf-8")),
            "sanitized": sanitize,
            "cid_images": cid_images or {},
            "has_external_resources": has_external,
            "has_tracking_pixels": has_tracking,
            "link_count": link_count,
            "embedded_count": embedded_count,
        }

    def _sanitize_html(self, html: str) -> str:
        html = self._remove_dangerous_tags(html)
        html = self._remove_dangerous_attributes(html)
        html = self._remove_javascript(html)
        html = self._remove_data_urls(html)
        return html

    def _remove_dangerous_tags(self, html: str) -> str:
        dangerous_tags = [
            "script", "iframe", "embed", "object", "applet",
            "form", "input", "button", "select", "textarea",
            "meta", "link", "style", "base",
        ]

        for tag in dangerous_tags:
            html = re.sub(
                rf"<{tag}[^>]*>.*?</{tag}>",
                "",
                html,
                flags=re.IGNORECASE | re.DOTALL,
            )
            html = re.sub(
                rf"<{tag}[^>]*/?>",
                "",
                html,
                flags=re.IGNORECASE,
            )

        return html

    def _remove_dangerous_attributes(self, html: str) -> str:
        dangerous_attrs = [
            "onclick", "ondblclick", "onmousedown", "onmouseup",
            "onmouseover", "onmousemove", "onmouseout", "onkeypress",
            "onkeydown", "onkeyup", "onfocus", "onblur", "onsubmit",
            "onreset", "onselect", "onchange", "onload", "onerror",
            "onabort", "onresize", "onscroll", "onunload",
            "formaction", "xlink:href",
        ]

        for attr in dangerous_attrs:
            html = re.sub(
                rf'\s*{attr}\s*=\s*["\'][^"\']*["\']',
                "",
                html,
                flags=re.IGNORECASE,
            )
            html = re.sub(
                rf'\s*{attr}\s*=\s*[^\s>]+',
                "",
                html,
                flags=re.IGNORECASE,
            )

        return html

    def _remove_javascript(self, html: str) -> str:
        html = re.sub(r"javascript\s*:", "", html, flags=re.IGNORECASE)
        html = re.sub(r"vbscript\s*:", "", html, flags=re.IGNORECASE)
        html = re.sub(r"data\s*:", "", html, flags=re.IGNORECASE)
        return html

    def _remove_data_urls(self, html: str) -> str:
        html = re.sub(
            r'<img[^>]+src\s*=\s*["\']data:image/[^"\']+["\']',
            "",
            html,
            flags=re.IGNORECASE,
        )
        return html

    def _rewrite_cid_images(
        self,
        html: str,
        cid_images: dict[str, str],
    ) -> str:
        def replace_cid(match: re.Match) -> str:
            cid = match.group(1)
            if cid in cid_images:
                return f'src="{cid_images[cid]}"'
            return match.group(0)

        html = re.sub(
            r'src\s*=\s*["\']cid:([^"\']+)["\']',
            replace_cid,
            html,
            flags=re.IGNORECASE,
        )

        return html

    def _rewrite_relative_urls(
        self,
        html: str,
        base_url: str,
    ) -> str:
        def rewrite_url(match: re.Match) -> str:
            attr = match.group(1)
            quote = match.group(2)
            url = match.group(3)

            if url.startswith(("http://", "https://", "cid:", "data:", "#")):
                return match.group(0)

            try:
                absolute_url = urljoin(base_url, url)
                return f'{attr}={quote}{absolute_url}{quote}'
            except Exception:
                return match.group(0)

        html = re.sub(
            r'((?:src|href|action)\s*=\s*)(["\'])([^"\']+)["\']',
            rewrite_url,
            html,
            flags=re.IGNORECASE,
        )

        return html

    def _has_external_resources(self, html: str) -> bool:
        for pattern in self.external_resource_patterns:
            if re.search(pattern, html, re.IGNORECASE):
                return True
        return False

    def _has_tracking_pixels(self, html: str) -> bool:
        for pattern in self.tracking_pixel_patterns:
            if re.search(pattern, html, re.IGNORECASE):
                return True
        return False

    def _count_links(self, html: str) -> int:
        links = re.findall(r'<a[^>]+href\s*=\s*["\']([^"\']+)["\']', html, re.IGNORECASE)
        return len(links)

    def _count_embedded_resources(self, html: str) -> int:
        count = 0
        patterns = [
            r'<img[^>]+src\s*=',
            r'<video[^>]+src\s*=',
            r'<audio[^>]+src\s*=',
            r'<source[^>]+src\s*=',
            r'<embed[^>]+src\s*=',
            r'<iframe[^>]+src\s*=',
        ]

        for pattern in patterns:
            count += len(re.findall(pattern, html, re.IGNORECASE))

        return count

    def _normalize_html(self, html: str) -> str:
        html = re.sub(r"\r\n", "\n", html)
        html = re.sub(r"\r", "\n", html)
        html = re.sub(r"\n{3,}", "\n\n", html)

        html = html.strip()

        return html

    def extract_text_from_html(self, html: str) -> str:
        text = re.sub(r"<[^>]+>", " ", html)
        text = re.sub(r"\s+", " ", text)
        text = text.strip()
        return text

    def extract_links(self, html: str) -> list[dict[str, str]]:
        links = []
        pattern = r'<a[^>]+href\s*=\s*["\']([^"\']+)["\'][^>]*>(.*?)</a>'

        for match in re.finditer(pattern, html, re.IGNORECASE | re.DOTALL):
            url = match.group(1)
            text = re.sub(r"<[^>]+>", "", match.group(2)).strip()
            links.append({"url": url, "text": text})

        return links

    def extract_images(self, html: str) -> list[dict[str, str]]:
        images = []
        pattern = r'<img[^>]+src\s*=\s*["\']([^"\']+)["\']'

        for match in re.finditer(pattern, html, re.IGNORECASE):
            src = match.group(1)
            alt_match = re.search(r'alt\s*=\s*["\']([^"\']*)["\']', match.group(0), re.IGNORECASE)
            alt = alt_match.group(1) if alt_match else ""

            images.append({"src": src, "alt": alt})

        return images
