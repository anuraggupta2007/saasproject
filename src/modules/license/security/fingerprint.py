import hashlib
import platform
import uuid
import subprocess
import re
from typing import Optional

from src.core.logging import get_logger

logger = get_logger(__name__)


class DeviceFingerprint:
    @staticmethod
    def get_hardware_id() -> str:
        system = platform.system()

        try:
            if system == "Windows":
                result = subprocess.run(
                    ["wmic", "csproduct", "get", "UUID"],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                lines = result.stdout.strip().split("\n")
                if len(lines) > 1:
                    return lines[1].strip()

            elif system == "Darwin":
                result = subprocess.run(
                    ["ioreg", "-rd1", "-c", "IOPlatformExpertDevice"],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                match = re.search(r'"IOPlatformUUID"\s*=\s*"([^"]+)"', result.stdout)
                if match:
                    return match.group(1)

            elif system == "Linux":
                with open("/etc/machine-id", "r") as f:
                    return f.read().strip()

        except Exception as e:
            logger.warning(f"Failed to get hardware ID: {e}")

        return str(uuid.getnode())

    @staticmethod
    def get_mac_address() -> str:
        mac = uuid.getnode()
        return ":".join(
            f"{(mac >> i) & 0xFF:02x}"
            for i in range(0, 48, 8)
        )

    @classmethod
    def generate_fingerprint(
        cls,
        hardware_id: Optional[str] = None,
        additional_data: Optional[str] = None,
    ) -> str:
        if hardware_id is None:
            hardware_id = cls.get_hardware_id()

        mac = cls.get_mac_address()
        system_info = f"{platform.system()}-{platform.machine()}"

        components = [hardware_id, mac, system_info]
        if additional_data:
            components.append(additional_data)

        combined = ":".join(components)
        fingerprint = hashlib.sha256(combined.encode()).hexdigest()

        formatted = "-".join(
            fingerprint[i:i+8]
            for i in range(0, 32, 8)
        )

        return formatted

    @classmethod
    def generate_simple_fingerprint(cls) -> str:
        hardware_id = cls.get_hardware_id()
        return hashlib.sha256(hardware_id.encode()).hexdigest()[:32]

    @staticmethod
    def get_device_info() -> dict:
        system = platform.system()
        machine = platform.machine()
        node = platform.node()
        release = platform.release()
        version = platform.version()

        device_type = "unknown"
        if system in ["Windows", "Linux", "Darwin"]:
            if "mobile" in platform.platform().lower():
                device_type = "mobile"
            else:
                device_type = "desktop"

        return {
            "system": system,
            "machine": machine,
            "node": node,
            "release": release,
            "version": version,
            "device_type": device_type,
            "platform": platform.platform(),
        }


device_fingerprint = DeviceFingerprint()
