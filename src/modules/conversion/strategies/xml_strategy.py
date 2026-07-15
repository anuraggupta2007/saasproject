import xml.etree.ElementTree as ET
from xml.dom import minidom

from src.modules.conversion.strategies.base import (
    ConversionStrategy,
    ConversionContext,
    ConversionResult,
)


class XmlConversionStrategy(ConversionStrategy):
    def get_format(self) -> str:
        return "xml"

    def get_content_type(self) -> str:
        return "application/xml"

    def get_file_extension(self) -> str:
        return ".xml"

    def validate_context(self, context: ConversionContext) -> list[str]:
        return []

    async def convert(self, context: ConversionContext) -> ConversionResult:
        errors = self.validate_context(context)
        if errors:
            return ConversionResult(success=False, errors=errors)

        try:
            xml_content = self._generate_xml(context)
            filename = self.get_default_filename(context)

            return ConversionResult(
                success=True,
                content=xml_content,
                filename=filename,
                content_type=self.get_content_type(),
                file_size=len(xml_content.encode("utf-8")),
                metadata={
                    "format": "xml",
                    "well_formed": True,
                },
            )

        except Exception as e:
            return ConversionResult(
                success=False,
                errors=[f"XML conversion failed: {str(e)}"],
            )

    def _generate_xml(self, context: ConversionContext) -> str:
        root = ET.Element("email")
        root.set("xmlns", "urn:emailconverter:schema:1.0")

        metadata = ET.SubElement(root, "metadata")
        ET.SubElement(metadata, "format").text = "xml"
        ET.SubElement(metadata, "version").text = "1.0"
        ET.SubElement(metadata, "generator").text = "Email Converter SaaS"

        headers = ET.SubElement(root, "headers")
        ET.SubElement(headers, "subject").text = context.subject or ""
        ET.SubElement(headers, "from").text = context.from_address or ""
        ET.SubElement(headers, "message-id").text = context.message_id

        if context.date:
            ET.SubElement(headers, "date").text = context.date

        to_element = ET.SubElement(headers, "to")
        for addr in (context.to_addresses or []):
            ET.SubElement(to_element, "address").text = addr

        cc_element = ET.SubElement(headers, "cc")
        for addr in (context.cc_addresses or []):
            ET.SubElement(cc_element, "address").text = addr

        body = ET.SubElement(root, "body")

        if context.text_body:
            text_element = ET.SubElement(body, "text")
            text_element.set("content-type", "text/plain")
            text_element.text = context.text_body

        if context.html_body:
            html_element = ET.SubElement(body, "html")
            html_element.set("content-type", "text/html")
            html_element.text = context.html_body

        attachments_element = ET.SubElement(root, "attachments")
        for att in (context.attachments or []):
            att_element = ET.SubElement(attachments_element, "attachment")
            ET.SubElement(att_element, "filename").text = att.get("filename", "")
            ET.SubElement(att_element, "content-type").text = att.get("content_type", "")
            ET.SubElement(att_element, "size").text = str(att.get("file_size", 0))
            ET.SubElement(att_element, "sha256").text = att.get("sha256_hash", "")

            content_id = att.get("content_id")
            if content_id:
                ET.SubElement(att_element, "content-id").text = content_id

        if context.mime_parts:
            mime_tree = ET.SubElement(root, "mime-tree")
            for part in context.mime_parts:
                self._add_mime_part(mime_tree, part)

        xml_string = ET.tostring(root, encoding="unicode", xml_declaration=False)
        xml_string = '<?xml version="1.0" encoding="UTF-8"?>\n' + xml_string

        try:
            dom = minidom.parseString(xml_string)
            xml_string = dom.toprettyxml(indent="  ", encoding=None)
            lines = xml_string.split("\n")
            if lines and lines[0].startswith("<?xml"):
                xml_string = "\n".join(lines[1:])
            xml_string = '<?xml version="1.0" encoding="UTF-8"?>\n' + xml_string
        except Exception:
            pass

        return xml_string

    def _add_mime_part(self, parent: ET.Element, part: dict) -> None:
        part_element = ET.SubElement(parent, "part")
        part_element.set("content-type", part.get("content_type", ""))

        if part.get("filename"):
            part_element.set("filename", part["filename"])

        if part.get("content_id"):
            part_element.set("content-id", part["content_id"])

        for child in part.get("children", []):
            self._add_mime_part(part_element, child)
