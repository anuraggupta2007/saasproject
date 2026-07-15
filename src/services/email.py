import uuid
from pathlib import Path
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from jinja2 import Environment, FileSystemLoader, select_autoescape

from src.core.config import settings
from src.core.logging import get_logger

logger = get_logger(__name__)

template_dir = Path(__file__).parent / "templates"
env = Environment(
    loader=FileSystemLoader(template_dir),
    autoescape=select_autoescape(["html"]),
)


class EmailService:
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_user = settings.SMTP_USER
        self.smtp_password = settings.SMTP_PASSWORD
        self.smtp_from = settings.SMTP_FROM
        self.smtp_tls = settings.SMTP_TLS
        self.frontend_url = settings.FRONTEND_URL

    @asynccontextmanager
    async def _get_smtp_client(self) -> AsyncGenerator[aiosmtplib.SMTP, None]:
        client = aiosmtplib.SMTP(
            hostname=self.smtp_host,
            port=self.smtp_port,
            use_tls=self.smtp_tls,
        )
        try:
            await client.connect()
            if self.smtp_user and self.smtp_password:
                await client.login(self.smtp_user, self.smtp_password)
            yield client
        finally:
            await client.quit()

    async def _send_email(
        self,
        to: str,
        subject: str,
        html_content: str,
        text_content: str | None = None,
    ) -> bool:
        try:
            message = MIMEMultipart("alternative")
            message["From"] = self.smtp_from
            message["To"] = to
            message["Subject"] = subject

            if text_content:
                text_part = MIMEText(text_content, "plain")
                message.attach(text_part)

            html_part = MIMEText(html_content, "html")
            message.attach(html_part)

            async with self._get_smtp_client() as client:
                await client.send_message(message)

            logger.info("email_sent", to=to, subject=subject)
            return True
        except Exception as e:
            logger.error("email_send_failed", to=to, error=str(e))
            return False

    async def send_verification_email(
        self,
        user_id: uuid.UUID,
        email: str,
        token: str,
    ) -> bool:
        verification_url = f"{self.frontend_url}/verify-email?token={token}"

        template = env.get_template("verification.html")
        html_content = template.render(
            verification_url=verification_url,
            frontend_url=self.frontend_url,
        )

        text_content = f"""
Verify Your Email Address

Thank you for registering! Please use the following link to verify your email address:

{verification_url}

This link will expire in {settings.EMAIL_VERIFICATION_EXPIRE_HOURS} hours.

If you didn't create an account, please ignore this email.
"""

        return await self._send_email(
            to=email,
            subject="Verify your email address",
            html_content=html_content,
            text_content=text_content,
        )

    async def send_password_reset_email(
        self,
        user_id: uuid.UUID,
        email: str,
        token: str,
    ) -> bool:
        reset_url = f"{self.frontend_url}/reset-password?token={token}"

        template = env.get_template("password_reset.html")
        html_content = template.render(
            reset_url=reset_url,
            frontend_url=self.frontend_url,
        )

        text_content = f"""
Reset Your Password

We received a request to reset your password. Please use the following link:

{reset_url}

This link will expire in {settings.PASSWORD_RESET_EXPIRE_HOURS} hour(s).

If you didn't request a password reset, please ignore this email.
"""

        return await self._send_email(
            to=email,
            subject="Reset your password",
            html_content=html_content,
            text_content=text_content,
        )

    async def send_welcome_email(
        self,
        email: str,
        full_name: str | None = None,
    ) -> bool:
        name = full_name or "there"

        template = env.get_template("welcome.html")
        html_content = template.render(
            name=name,
            frontend_url=self.frontend_url,
        )

        text_content = f"""
Welcome to Email Converter SaaS!

Hi {name},

Thank you for joining us! We're excited to have you on board.

Get started by uploading your first email file at:
{self.frontend_url}

If you have any questions, feel free to reach out to our support team.
"""

        return await self._send_email(
            to=email,
            subject="Welcome to Email Converter SaaS!",
            html_content=html_content,
            text_content=text_content,
        )


email_service = EmailService()
