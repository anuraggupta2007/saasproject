"""
Security module - re-exports from the canonical location.
This module exists for backward compatibility with modules that import
from src.core.security. New code should import from src.core.rbac directly.
"""
from src.core.rbac import get_current_user, require_permission, require_role, get_current_admin

__all__ = [
    "get_current_user",
    "require_permission",
    "require_role",
    "get_current_admin",
]
