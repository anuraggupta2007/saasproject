"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-07-08
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ======================================================================
    # src/models/base.py
    # ======================================================================

    op.create_table(
        'roles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(50), unique=True, index=True, nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('is_default', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('is_system', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('is_deleted', sa.Boolean, nullable=False, server_default='false', index=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('idx_role_name_active', 'roles', ['name', 'is_deleted'])

    op.create_table(
        'permissions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(100), unique=True, index=True, nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('resource', sa.String(50), nullable=False),
        sa.Column('action', sa.String(50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('idx_permission_resource_action', 'permissions', ['resource', 'action'], unique=True)

    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(255), unique=True, index=True, nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=True),
        sa.Column('full_name', sa.String(255), nullable=True),
        sa.Column('avatar_url', sa.String(500), nullable=True),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('is_verified', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('is_superuser', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('oauth_provider', sa.String(50), nullable=True, index=True),
        sa.Column('oauth_id', sa.String(255), nullable=True),
        sa.Column('last_login', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_login_ip', postgresql.INET, nullable=True),
        sa.Column('failed_login_attempts', sa.Integer, nullable=False, server_default='0'),
        sa.Column('locked_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('password_changed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('is_deleted', sa.Boolean, nullable=False, server_default='false', index=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('idx_user_email_active', 'users', ['email', 'is_deleted'])
    op.create_index('idx_user_oauth', 'users', ['oauth_provider', 'oauth_id'])

    op.create_table(
        'role_permissions',
        sa.Column('role_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('permission_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('permissions.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('assigned_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        'user_roles',
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('role_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('assigned_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        'user_sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('refresh_token_jti', sa.String(36), unique=True, index=True, nullable=False),
        sa.Column('refresh_token_hash', sa.String(255), nullable=False),
        sa.Column('user_agent', sa.Text, nullable=True),
        sa.Column('ip_address', postgresql.INET, nullable=True),
        sa.Column('device_info', sa.String(255), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_revoked', sa.Boolean, nullable=False, server_default='false', index=True),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('idx_session_user_active', 'user_sessions', ['user_id', 'is_revoked'])
    op.create_index('idx_session_expires', 'user_sessions', ['expires_at'])

    op.create_table(
        'email_verifications',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('token_hash', sa.String(255), unique=True, index=True, nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_used', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ip_address', postgresql.INET, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        'password_resets',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('token_hash', sa.String(255), unique=True, index=True, nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_used', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ip_address', postgresql.INET, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        'audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('action', sa.String(100), nullable=False, index=True),
        sa.Column('resource', sa.String(50), nullable=False),
        sa.Column('resource_id', sa.String(255), nullable=True),
        sa.Column('details', postgresql.JSONB, nullable=True),
        sa.Column('ip_address', postgresql.INET, nullable=True),
        sa.Column('user_agent', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('idx_audit_user_action', 'audit_logs', ['user_id', 'action'])
    op.create_index('idx_audit_resource', 'audit_logs', ['resource', 'resource_id'])

    # ======================================================================
    # src/modules/admin/models/admin.py
    # ======================================================================

    op.create_table(
        'admin_users',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False, unique=True, index=True),
        sa.Column('role', sa.String(20), nullable=False),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('permissions', postgresql.JSON, default=list),
        sa.Column('ip_allowlist', postgresql.JSON, default=list),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('idx_admin_user_role', 'admin_users', ['role'])

    op.create_table(
        'admin_permissions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(100), unique=True, nullable=False),
        sa.Column('description', sa.String(500), nullable=True),
        sa.Column('resource', sa.String(100), nullable=False),
        sa.Column('action', sa.String(50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('idx_admin_permission_resource_action', 'admin_permissions', ['resource', 'action'])

    op.create_table(
        'system_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('event_type', sa.String(100), nullable=False, index=True),
        sa.Column('severity', sa.String(20), default='info'),
        sa.Column('source', sa.String(100), nullable=True),
        sa.Column('message', sa.Text, nullable=False),
        sa.Column('details', postgresql.JSON, default=dict),
        sa.Column('resolved', sa.Boolean, default=False),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('resolved_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('idx_event_type_severity', 'system_events', ['event_type', 'severity'])
    op.create_index('idx_event_created', 'system_events', ['created_at'])

    op.create_table(
        'dashboard_metrics',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('metric_name', sa.String(100), nullable=False, index=True),
        sa.Column('metric_value', sa.Integer, default=0),
        sa.Column('metric_data', postgresql.JSON, default=dict),
        sa.Column('recorded_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('idx_metric_name_date', 'dashboard_metrics', ['metric_name', 'recorded_at'])

    op.create_table(
        'announcements',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('title', sa.String(200), nullable=False),
        sa.Column('message', sa.Text, nullable=False),
        sa.Column('announcement_type', sa.String(50), default='info'),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('target_roles', postgresql.JSON, default=list),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )

    # ======================================================================
    # src/modules/analytics/models/analytics.py
    # ======================================================================

    op.create_table(
        'analytics_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('event_type', sa.String(30), nullable=False, index=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('session_id', sa.String(255), nullable=True),
        sa.Column('properties', postgresql.JSON, default=dict),
        sa.Column('metrics', postgresql.JSON, default=dict),
        sa.Column('source', sa.String(100), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('idx_analytics_event_type_date', 'analytics_events', ['event_type', 'created_at'])
    op.create_index('idx_analytics_user_date', 'analytics_events', ['user_id', 'created_at'])

    op.create_table(
        'reports',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(200), nullable=False),
        sa.Column('report_type', sa.String(20), nullable=False),
        sa.Column('status', sa.String(20), default='pending'),
        sa.Column('format', sa.String(20), default='json'),
        sa.Column('parameters', postgresql.JSON, default=dict),
        sa.Column('result_data', postgresql.JSON, nullable=True),
        sa.Column('file_path', sa.String(500), nullable=True),
        sa.Column('generated_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('error_message', sa.Text, nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('idx_report_type_status', 'reports', ['report_type', 'status'])
    op.create_index('idx_report_generated_by', 'reports', ['generated_by'])

    op.create_table(
        'aggregated_metrics',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('metric_name', sa.String(100), nullable=False, index=True),
        sa.Column('metric_value', sa.Float, nullable=False),
        sa.Column('dimensions', postgresql.JSON, default=dict),
        sa.Column('period_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('period_end', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('idx_metric_name_period', 'aggregated_metrics', ['metric_name', 'period_start'])

    op.create_table(
        'dashboard_widgets',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('widget_type', sa.String(50), nullable=False),
        sa.Column('config', postgresql.JSON, default=dict),
        sa.Column('data_query', sa.Text, nullable=True),
        sa.Column('refresh_interval_seconds', sa.Integer, default=300),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )

    # ======================================================================
    # src/modules/mime/models/base.py
    # ======================================================================

    op.create_table(
        'mime_messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('upload_id', postgresql.UUID(as_uuid=True), index=True, nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), index=True, nullable=False),
        sa.Column('message_id', sa.String(500), nullable=True, index=True),
        sa.Column('subject', sa.Text, nullable=True),
        sa.Column('from_address', sa.Text, nullable=True),
        sa.Column('to_addresses', postgresql.JSONB, nullable=True),
        sa.Column('cc_addresses', postgresql.JSONB, nullable=True),
        sa.Column('bcc_addresses', postgresql.JSONB, nullable=True),
        sa.Column('date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('content_type', sa.String(200), nullable=False),
        sa.Column('content_language', sa.String(50), nullable=True),
        sa.Column('total_size', sa.BigInteger, nullable=False, default=0),
        sa.Column('parse_status', sa.String(20), nullable=False, default='pending', index=True),
        sa.Column('parse_duration_ms', sa.Integer, nullable=True),
        sa.Column('error_message', sa.Text, nullable=True),
        sa.Column('security_flag', sa.String(20), nullable=False, default='none'),
        sa.Column('security_details', postgresql.JSONB, nullable=True),
        sa.Column('metadata', postgresql.JSONB, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('idx_mime_message_user_upload', 'mime_messages', ['user_id', 'upload_id'])
    op.create_index('idx_mime_message_status', 'mime_messages', ['parse_status'])
    op.create_index('idx_mime_message_date', 'mime_messages', ['date'])

    op.create_table(
        'mime_parts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('message_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('mime_messages.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('parent_part_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('mime_parts.id', ondelete='CASCADE'), nullable=True),
        sa.Column('part_index', sa.Integer, nullable=False, default=0),
        sa.Column('content_type', sa.String(200), nullable=False),
        sa.Column('content_subtype', sa.String(100), nullable=True),
        sa.Column('charset', sa.String(50), nullable=True),
        sa.Column('content_encoding', sa.String(50), nullable=True),
        sa.Column('content_disposition', sa.String(50), nullable=True),
        sa.Column('content_id', sa.String(500), nullable=True),
        sa.Column('content_location', sa.String(1000), nullable=True),
        sa.Column('filename', sa.String(500), nullable=True),
        sa.Column('content_length', sa.BigInteger, nullable=True),
        sa.Column('raw_size', sa.BigInteger, nullable=False, default=0),
        sa.Column('decoded_size', sa.BigInteger, nullable=False, default=0),
        sa.Column('sha256_hash', sa.String(64), nullable=True),
        sa.Column('is_attachment', sa.Boolean, default=False, nullable=False),
        sa.Column('is_inline', sa.Boolean, default=False, nullable=False),
        sa.Column('nesting_level', sa.Integer, default=0, nullable=False),
        sa.Column('boundary', sa.String(200), nullable=True),
        sa.Column('headers', postgresql.JSONB, nullable=True),
        sa.Column('parse_errors', postgresql.JSONB, nullable=True),
        sa.Column('security_flag', sa.String(20), nullable=False, default='none'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('idx_mime_part_parent', 'mime_parts', ['parent_part_id'])
    op.create_index('idx_mime_part_content_type', 'mime_parts', ['content_type'])
    op.create_index('idx_mime_part_content_id', 'mime_parts', ['content_id'])

    op.create_table(
        'mime_bodies',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('message_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('mime_messages.id', ondelete='CASCADE'), unique=True, nullable=False),
        sa.Column('html_body', sa.Text, nullable=True),
        sa.Column('html_size', sa.BigInteger, default=0, nullable=False),
        sa.Column('text_body', sa.Text, nullable=True),
        sa.Column('text_size', sa.BigInteger, default=0, nullable=False),
        sa.Column('preview_text', sa.Text, nullable=True),
        sa.Column('preview_length', sa.Integer, default=500, nullable=False),
        sa.Column('html_sanitized', sa.Boolean, default=False, nullable=False),
        sa.Column('cid_images', postgresql.JSONB, nullable=True),
        sa.Column('embedded_count', sa.Integer, default=0, nullable=False),
        sa.Column('link_count', sa.Integer, default=0, nullable=False),
        sa.Column('has_tracking_pixels', sa.Boolean, default=False, nullable=False),
        sa.Column('has_external_resources', sa.Boolean, default=False, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('idx_mime_body_message', 'mime_bodies', ['message_id'])

    op.create_table(
        'mime_attachments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('message_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('mime_messages.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('part_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('mime_parts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('filename', sa.String(500), nullable=False),
        sa.Column('safe_filename', sa.String(500), nullable=False),
        sa.Column('content_type', sa.String(200), nullable=False),
        sa.Column('content_id', sa.String(500), nullable=True),
        sa.Column('content_disposition', sa.String(50), nullable=False),
        sa.Column('file_size', sa.BigInteger, nullable=False),
        sa.Column('sha256_hash', sa.String(64), nullable=False),
        sa.Column('storage_path', sa.String(1000), nullable=True),
        sa.Column('is_inline', sa.Boolean, default=False, nullable=False),
        sa.Column('content_location', sa.String(1000), nullable=True),
        sa.Column('extension', sa.String(20), nullable=True),
        sa.Column('security_flag', sa.String(20), nullable=False, default='none'),
        sa.Column('security_details', postgresql.JSONB, nullable=True),
        sa.Column('is_safe', sa.Boolean, default=True, nullable=False),
        sa.Column('scan_result', sa.String(50), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('idx_mime_attachment_content_id', 'mime_attachments', ['content_id'])
    op.create_index('idx_mime_attachment_content_type', 'mime_attachments', ['content_type'])
    op.create_index('idx_mime_attachment_filename', 'mime_attachments', ['filename'])

    op.create_table(
        'mime_parse_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('message_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('mime_messages.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('event_type', sa.String(50), nullable=False),
        sa.Column('severity', sa.String(20), nullable=False, default='info'),
        sa.Column('message', sa.Text, nullable=False),
        sa.Column('details', postgresql.JSONB, nullable=True),
        sa.Column('duration_ms', sa.Integer, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('idx_mime_parse_log_event', 'mime_parse_logs', ['event_type'])
    op.create_index('idx_mime_parse_log_severity', 'mime_parse_logs', ['severity'])

    # ======================================================================
    # src/modules/conversion/models/base.py
    # ======================================================================

    op.create_table(
        'conversion_batches',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), index=True, nullable=False),
        sa.Column('name', sa.String(255), nullable=True),
        sa.Column('output_format', sa.String(20), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, default='pending', index=True),
        sa.Column('total_count', sa.Integer, nullable=False, default=0),
        sa.Column('completed_count', sa.Integer, nullable=False, default=0),
        sa.Column('failed_count', sa.Integer, nullable=False, default=0),
        sa.Column('progress', sa.Integer, nullable=False, default=0),
        sa.Column('output_storage_path', sa.String(1000), nullable=True),
        sa.Column('output_size', sa.BigInteger, nullable=True),
        sa.Column('compression_enabled', sa.Boolean, nullable=False, default=True),
        sa.Column('processing_started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('processing_completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('processing_duration_ms', sa.Integer, nullable=True),
        sa.Column('error_message', sa.Text, nullable=True),
        sa.Column('options', postgresql.JSONB, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('idx_conversion_batch_user', 'conversion_batches', ['user_id'])
    op.create_index('idx_conversion_batch_status', 'conversion_batches', ['status'])

    op.create_table(
        'conversion_jobs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), index=True, nullable=False),
        sa.Column('batch_id', postgresql.UUID(as_uuid=True), index=True, nullable=True),
        sa.Column('message_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('mime_messages.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('output_format', sa.String(20), nullable=False, index=True),
        sa.Column('status', sa.String(20), nullable=False, default='pending', index=True),
        sa.Column('progress', sa.Integer, nullable=False, default=0),
        sa.Column('output_filename', sa.String(500), nullable=True),
        sa.Column('output_storage_path', sa.String(1000), nullable=True),
        sa.Column('output_size', sa.BigInteger, nullable=True),
        sa.Column('output_hash', sa.String(64), nullable=True),
        sa.Column('compression_enabled', sa.Boolean, nullable=False, default=False),
        sa.Column('compression_password', sa.String(255), nullable=True),
        sa.Column('processing_started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('processing_completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('processing_duration_ms', sa.Integer, nullable=True),
        sa.Column('error_message', sa.Text, nullable=True),
        sa.Column('error_details', postgresql.JSONB, nullable=True),
        sa.Column('retry_count', sa.Integer, nullable=False, default=0),
        sa.Column('max_retries', sa.Integer, nullable=False, default=3),
        sa.Column('celery_task_id', sa.String(255), nullable=True, index=True),
        sa.Column('options', postgresql.JSONB, nullable=True),
        sa.Column('download_count', sa.Integer, nullable=False, default=0),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('idx_conversion_job_user_status', 'conversion_jobs', ['user_id', 'status'])
    op.create_index('idx_conversion_job_batch', 'conversion_jobs', ['batch_id'])
    op.create_index('idx_conversion_job_format', 'conversion_jobs', ['output_format'])
    op.create_index('idx_conversion_job_created', 'conversion_jobs', ['created_at'])

    op.create_table(
        'conversion_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('job_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('conversion_jobs.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('event_type', sa.String(50), nullable=False, index=True),
        sa.Column('severity', sa.String(20), nullable=False, default='info'),
        sa.Column('message', sa.Text, nullable=False),
        sa.Column('details', postgresql.JSONB, nullable=True),
        sa.Column('duration_ms', sa.Integer, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('idx_conversion_log_event', 'conversion_logs', ['event_type'])
    op.create_index('idx_conversion_log_severity', 'conversion_logs', ['severity'])

    op.create_table(
        'download_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('job_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('conversion_jobs.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), index=True, nullable=False),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('idx_download_history_user', 'download_history', ['user_id'])
    op.create_index('idx_download_history_job', 'download_history', ['job_id'])

    # ======================================================================
    # src/modules/gateway/models/gateway.py
    # ======================================================================

    op.create_table(
        'gateway_organizations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('slug', sa.String(100), unique=True, nullable=False, index=True),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('logo_url', sa.String(500), nullable=True),
        sa.Column('website', sa.String(500), nullable=True),
        sa.Column('owner_id', sa.String(36), nullable=False, index=True),
        sa.Column('plan', sa.String(20), default='free'),
        sa.Column('settings', postgresql.JSON, default=dict),
        sa.Column('branding', postgresql.JSON, default=dict),
        sa.Column('custom_domain', sa.String(255), unique=True),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('metadata', postgresql.JSON, default=dict),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_gateway_orgs_owner', 'gateway_organizations', ['owner_id'])

    op.create_table(
        'gateway_tenants',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('gateway_organizations.id'), nullable=False, index=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('slug', sa.String(100), nullable=False),
        sa.Column('plan', sa.String(20), default='free'),
        sa.Column('max_users', sa.Integer, default=5),
        sa.Column('max_storage_gb', sa.Integer, default=5),
        sa.Column('max_api_calls', sa.Integer, default=10000),
        sa.Column('max_conversions', sa.Integer, default=100),
        sa.Column('storage_used_bytes', sa.Integer, default=0),
        sa.Column('api_calls_used', sa.Integer, default=0),
        sa.Column('conversions_used', sa.Integer, default=0),
        sa.Column('billing_email', sa.String(255), nullable=True),
        sa.Column('stripe_customer_id', sa.String(255), nullable=True),
        sa.Column('stripe_subscription_id', sa.String(255), nullable=True),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('settings', postgresql.JSON, default=dict),
        sa.Column('metadata', postgresql.JSON, default=dict),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('organization_id', 'slug', name='uq_tenant_org_slug'),
    )

    op.create_table(
        'gateway_memberships',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', sa.String(36), nullable=False, index=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('gateway_organizations.id'), nullable=False, index=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('gateway_tenants.id'), nullable=False, index=True),
        sa.Column('role', sa.String(20), default='member', nullable=False),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('joined_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('invited_by', sa.String(36), nullable=True),
        sa.Column('permissions', postgresql.JSON, default=list),
        sa.Column('settings', postgresql.JSON, default=dict),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('user_id', 'organization_id', name='uq_membership_user_org'),
        sa.UniqueConstraint('user_id', 'tenant_id', name='uq_membership_user_tenant'),
    )

    op.create_table(
        'gateway_roles',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('gateway_organizations.id'), nullable=False, index=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('permissions', postgresql.JSON, default=list),
        sa.Column('is_system', sa.Boolean, default=False),
        sa.Column('metadata', postgresql.JSON, default=dict),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('organization_id', 'name', name='uq_role_org_name'),
    )

    op.create_table(
        'gateway_invitations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(255), nullable=False, index=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('gateway_organizations.id'), nullable=False, index=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('gateway_tenants.id'), nullable=False),
        sa.Column('role', sa.String(20), default='member'),
        sa.Column('invited_by', sa.String(36), nullable=False),
        sa.Column('status', sa.String(20), default='pending'),
        sa.Column('token', sa.String(255), unique=True, nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('accepted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('metadata', postgresql.JSON, default=dict),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        'gateway_api_keys',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('gateway_organizations.id'), nullable=False, index=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('gateway_tenants.id'), nullable=False),
        sa.Column('user_id', sa.String(36), nullable=False, index=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('key_prefix', sa.String(8), nullable=False),
        sa.Column('key_hash', sa.String(255), nullable=False),
        sa.Column('scopes', postgresql.JSON, default=list),
        sa.Column('rate_limit', sa.Integer, default=1000),
        sa.Column('daily_quota', sa.Integer, default=10000),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('metadata', postgresql.JSON, default=dict),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        'gateway_tenant_usage',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('gateway_tenants.id'), nullable=False, index=True),
        sa.Column('date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('api_calls', sa.Integer, default=0),
        sa.Column('storage_bytes', sa.Integer, default=0),
        sa.Column('conversions', sa.Integer, default=0),
        sa.Column('bandwidth_bytes', sa.Integer, default=0),
        sa.Column('active_users', sa.Integer, default=0),
        sa.Column('metadata', postgresql.JSON, default=dict),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint('tenant_id', 'date', name='uq_tenant_usage_date'),
    )

    op.create_table(
        'gateway_tenant_audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('gateway_tenants.id'), nullable=False, index=True),
        sa.Column('user_id', sa.String(36), nullable=False, index=True),
        sa.Column('action', sa.String(50), nullable=False),
        sa.Column('resource_type', sa.String(100), nullable=False),
        sa.Column('resource_id', sa.String(36), nullable=True),
        sa.Column('changes', postgresql.JSON, default=dict),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.Text, nullable=True),
        sa.Column('status', sa.String(20), default='success'),
        sa.Column('metadata', postgresql.JSON, default=dict),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_tenant_audit_tenant_action', 'gateway_tenant_audit_logs', ['tenant_id', 'action'])
    op.create_index('ix_tenant_audit_created', 'gateway_tenant_audit_logs', ['created_at'])

    # ======================================================================
    # src/modules/license/models/license.py
    # ======================================================================

    op.create_table(
        'licenses',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False, index=True),
        sa.Column('license_key', sa.String(255), unique=True, nullable=False, index=True),
        sa.Column('license_type', sa.String(20), nullable=False),
        sa.Column('status', sa.String(20), default='pending', nullable=False),
        sa.Column('issued_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('max_activations', sa.Integer, default=1),
        sa.Column('current_activations', sa.Integer, default=0),
        sa.Column('features', postgresql.JSON, default=dict),
        sa.Column('metadata', postgresql.JSON, default=dict),
        sa.Column('is_trial', sa.Boolean, default=False),
        sa.Column('trial_days', sa.Integer, nullable=True),
        sa.Column('parent_license_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('licenses.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('idx_license_user_status', 'licenses', ['user_id', 'status'])
    op.create_index('idx_license_type_status', 'licenses', ['license_type', 'status'])

    # ======================================================================
    # src/modules/license/models/device.py
    # ======================================================================

    op.create_table(
        'devices',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('fingerprint', sa.String(255), nullable=False, index=True),
        sa.Column('device_name', sa.String(255), nullable=True),
        sa.Column('device_type', sa.String(50), nullable=True),
        sa.Column('os_type', sa.String(50), nullable=True),
        sa.Column('os_version', sa.String(50), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('last_seen', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('idx_device_fingerprint', 'devices', ['fingerprint'])
    op.create_index('idx_device_user', 'devices', ['user_id'])

    # ======================================================================
    # src/modules/license/models/activation.py
    # ======================================================================

    op.create_table(
        'activations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('license_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('licenses.id'), nullable=False, index=True),
        sa.Column('device_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('devices.id'), nullable=False, index=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('status', sa.String(20), default='active', nullable=False),
        sa.Column('activated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_validated', sa.DateTime(timezone=True), nullable=True),
        sa.Column('validation_token', sa.String(500), nullable=True),
        sa.Column('deactivated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('idx_activation_license_status', 'activations', ['license_id', 'status'])
    op.create_index('idx_activation_device_status', 'activations', ['device_id', 'status'])
    op.create_index('idx_activation_user', 'activations', ['user_id'])

    # ======================================================================
    # src/modules/license/models/plan.py
    # ======================================================================

    op.create_table(
        'plans',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False, unique=True),
        sa.Column('display_name', sa.String(100), nullable=False),
        sa.Column('description', sa.String(500), nullable=True),
        sa.Column('billing_cycle', sa.String(20), nullable=False),
        sa.Column('price', sa.Numeric(10, 2), nullable=False),
        sa.Column('currency', sa.String(3), default='USD'),
        sa.Column('trial_days', sa.Integer, default=0),
        sa.Column('max_activations', sa.Integer, default=1),
        sa.Column('features', postgresql.JSON, default=dict),
        sa.Column('is_popular', sa.Boolean, default=False),
        sa.Column('sort_order', sa.Integer, default=0),
        sa.Column('status', sa.String(20), default='active'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('idx_plan_billing_cycle', 'plans', ['billing_cycle'])
    op.create_index('idx_plan_status', 'plans', ['status'])

    # ======================================================================
    # src/modules/license/models/subscription.py
    # ======================================================================

    op.create_table(
        'subscriptions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('license_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('licenses.id'), nullable=False, unique=True),
        sa.Column('plan_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('status', sa.String(20), default='active', nullable=False),
        sa.Column('current_period_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('current_period_end', sa.DateTime(timezone=True), nullable=False),
        sa.Column('cancel_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('trial_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('trial_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('payment_status', sa.String(50), default='paid'),
        sa.Column('last_payment_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('next_payment_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('grace_period_days', sa.Integer, default=7),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('idx_subscription_user_status', 'subscriptions', ['user_id', 'status'])
    op.create_index('idx_subscription_period_end', 'subscriptions', ['current_period_end'])

    # ======================================================================
    # src/modules/license/models/feature.py
    # ======================================================================

    op.create_table(
        'features',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('key', sa.String(100), nullable=False, unique=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.String(500), nullable=True),
        sa.Column('feature_type', sa.String(50), default='boolean'),
        sa.Column('default_value', postgresql.JSON, default=False),
        sa.Column('is_global', sa.Boolean, default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('idx_feature_key', 'features', ['key'])

    op.create_table(
        'plan_features',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('plan_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('feature_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('value', postgresql.JSON, nullable=False),
        sa.Column('limit_value', sa.Integer, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('idx_plan_feature_plan_feature', 'plan_features', ['plan_id', 'feature_id'], unique=True)

    # ======================================================================
    # src/modules/license/models/audit.py
    # ======================================================================

    op.create_table(
        'license_audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('license_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('action', sa.String(30), nullable=False, index=True),
        sa.Column('severity', sa.String(20), default='info'),
        sa.Column('details', postgresql.JSON, default=dict),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('idx_license_audit_user_action', 'license_audit_logs', ['user_id', 'action'])
    op.create_index('idx_license_audit_created', 'license_audit_logs', ['created_at'])

    # ======================================================================
    # src/modules/monitoring/models/monitoring.py
    # ======================================================================

    op.create_table(
        'monitoring_system_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('event_type', sa.String(30), nullable=False, index=True),
        sa.Column('severity', sa.String(20), nullable=False, index=True),
        sa.Column('source', sa.String(255), nullable=False),
        sa.Column('message', sa.Text, nullable=False),
        sa.Column('metadata', postgresql.JSON, default=dict),
        sa.Column('correlation_id', sa.String(36), index=True),
        sa.Column('resolved', sa.Boolean, default=False),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('resolved_by', sa.String(36), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_system_events_created', 'monitoring_system_events', ['created_at'])
    op.create_index('ix_system_events_type_severity', 'monitoring_system_events', ['event_type', 'severity'])

    op.create_table(
        'alert_rules',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False, unique=True),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('metric_name', sa.String(255), nullable=False),
        sa.Column('condition', sa.String(50), nullable=False),
        sa.Column('threshold', sa.Float, nullable=False),
        sa.Column('severity', sa.String(20), nullable=False),
        sa.Column('enabled', sa.Boolean, default=True),
        sa.Column('cooldown_seconds', sa.Integer, default=300),
        sa.Column('notification_channels', postgresql.JSON, default=list),
        sa.Column('metadata', postgresql.JSON, default=dict),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        'alert_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('alert_rule_id', sa.String(36), nullable=False, index=True),
        sa.Column('alert_rule_name', sa.String(255), nullable=False),
        sa.Column('severity', sa.String(20), nullable=False),
        sa.Column('triggered_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('value', sa.Float, nullable=False),
        sa.Column('threshold', sa.Float, nullable=False),
        sa.Column('message', sa.Text, nullable=True),
        sa.Column('metadata', postgresql.JSON, default=dict),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_alert_history_triggered', 'alert_history', ['triggered_at'])

    op.create_table(
        'health_snapshots',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('overall_status', sa.String(20), nullable=False),
        sa.Column('api_healthy', sa.Boolean, default=True),
        sa.Column('database_healthy', sa.Boolean, default=True),
        sa.Column('redis_healthy', sa.Boolean, default=True),
        sa.Column('celery_healthy', sa.Boolean, default=True),
        sa.Column('storage_healthy', sa.Boolean, default=True),
        sa.Column('disk_usage_percent', sa.Float, default=0.0),
        sa.Column('memory_usage_percent', sa.Float, default=0.0),
        sa.Column('cpu_usage_percent', sa.Float, default=0.0),
        sa.Column('active_connections', sa.Integer, default=0),
        sa.Column('queue_depth', sa.Integer, default=0),
        sa.Column('metadata', postgresql.JSON, default=dict),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_health_snapshots_overall', 'health_snapshots', ['overall_status'])
    op.create_index('ix_health_snapshots_created', 'health_snapshots', ['created_at'])

    # ======================================================================
    # src/modules/notification/models/notification.py
    # ======================================================================

    op.create_table(
        'notifications',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('template_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('channel', sa.String(20), nullable=False),
        sa.Column('priority', sa.String(20), default='normal'),
        sa.Column('status', sa.String(20), default='pending'),
        sa.Column('subject', sa.String(500), nullable=True),
        sa.Column('content', sa.Text, nullable=False),
        sa.Column('html_content', sa.Text, nullable=True),
        sa.Column('recipient', sa.String(255), nullable=False),
        sa.Column('metadata', postgresql.JSON, default=dict),
        sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('delivered_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('failed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error_message', sa.Text, nullable=True),
        sa.Column('retry_count', sa.Integer, default=0),
        sa.Column('max_retries', sa.Integer, default=3),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('idx_notification_user_status', 'notifications', ['user_id', 'status'])
    op.create_index('idx_notification_channel_status', 'notifications', ['channel', 'status'])
    op.create_index('idx_notification_scheduled', 'notifications', ['scheduled_at'])

    # ======================================================================
    # src/modules/notification/models/template.py
    # ======================================================================

    op.create_table(
        'notification_templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(100), nullable=False, unique=True),
        sa.Column('template_type', sa.String(20), nullable=False),
        sa.Column('subject', sa.String(500), nullable=True),
        sa.Column('body_text', sa.Text, nullable=False),
        sa.Column('body_html', sa.Text, nullable=True),
        sa.Column('variables', postgresql.JSON, default=list),
        sa.Column('locale', sa.String(10), default='en'),
        sa.Column('version', sa.Integer, default=1),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('metadata', postgresql.JSON, default=dict),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('idx_template_name_locale', 'notification_templates', ['name', 'locale'])
    op.create_index('idx_template_type_active', 'notification_templates', ['template_type', 'is_active'])

    op.create_table(
        'delivery_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('notification_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('channel', sa.String(50), nullable=False),
        sa.Column('provider', sa.String(50), nullable=True),
        sa.Column('status', sa.String(50), nullable=False),
        sa.Column('provider_message_id', sa.String(255), nullable=True),
        sa.Column('error_message', sa.Text, nullable=True),
        sa.Column('metadata', postgresql.JSON, default=dict),
        sa.Column('attempt', sa.Integer, default=1),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('idx_delivery_notification', 'delivery_logs', ['notification_id'])
    op.create_index('idx_delivery_status', 'delivery_logs', ['status'])

    op.create_table(
        'user_notification_preferences',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False, unique=True, index=True),
        sa.Column('email_enabled', sa.Boolean, default=True),
        sa.Column('sms_enabled', sa.Boolean, default=False),
        sa.Column('push_enabled', sa.Boolean, default=True),
        sa.Column('in_app_enabled', sa.Boolean, default=True),
        sa.Column('webhook_enabled', sa.Boolean, default=False),
        sa.Column('webhook_url', sa.String(500), nullable=True),
        sa.Column('webhook_secret', sa.String(255), nullable=True),
        sa.Column('frequency', sa.String(50), default='immediate'),
        sa.Column('language', sa.String(10), default='en'),
        sa.Column('timezone_str', sa.String(50), default='UTC'),
        sa.Column('quiet_hours_start', sa.Integer, nullable=True),
        sa.Column('quiet_hours_end', sa.Integer, nullable=True),
        sa.Column('metadata', postgresql.JSON, default=dict),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        'provider_configs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('provider_type', sa.String(50), nullable=False),
        sa.Column('provider_name', sa.String(100), nullable=False),
        sa.Column('config', postgresql.JSON, nullable=False),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('is_default', sa.Boolean, default=False),
        sa.Column('priority', sa.Integer, default=0),
        sa.Column('metadata', postgresql.JSON, default=dict),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('idx_provider_type_active', 'provider_configs', ['provider_type', 'is_active'])

    # ======================================================================
    # src/modules/payment/models/payment.py
    # ======================================================================

    op.create_table(
        'payments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('subscription_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('invoice_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('currency', sa.String(3), default='USD'),
        sa.Column('status', sa.String(20), default='pending', nullable=False),
        sa.Column('payment_method', sa.String(20), nullable=True),
        sa.Column('provider', sa.String(20), nullable=False),
        sa.Column('provider_payment_id', sa.String(255), nullable=True, index=True),
        sa.Column('provider_customer_id', sa.String(255), nullable=True),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('metadata', postgresql.JSON, default=dict),
        sa.Column('idempotency_key', sa.String(255), unique=True, nullable=True),
        sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('failed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('failure_reason', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('idx_payment_user_status', 'payments', ['user_id', 'status'])
    op.create_index('idx_payment_provider', 'payments', ['provider', 'provider_payment_id'])

    # ======================================================================
    # src/modules/payment/models/transaction.py
    # ======================================================================

    op.create_table(
        'transactions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('payment_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('payments.id'), nullable=False, index=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('type', sa.String(20), nullable=False),
        sa.Column('status', sa.String(20), default='pending', nullable=False),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('currency', sa.String(3), default='USD'),
        sa.Column('provider_transaction_id', sa.String(255), nullable=True),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('metadata', postgresql.JSON, default=dict),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('idx_transaction_user_type', 'transactions', ['user_id', 'type'])
    op.create_index('idx_transaction_payment', 'transactions', ['payment_id'])

    # ======================================================================
    # src/modules/payment/models/invoice.py
    # ======================================================================

    op.create_table(
        'invoices',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('payment_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('payments.id'), nullable=True),
        sa.Column('subscription_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('invoice_number', sa.String(50), unique=True, nullable=False),
        sa.Column('status', sa.String(20), default='draft', nullable=False),
        sa.Column('subtotal', sa.Numeric(12, 2), nullable=False),
        sa.Column('tax_amount', sa.Numeric(12, 2), default=0),
        sa.Column('tax_rate', sa.Numeric(5, 2), default=0),
        sa.Column('discount_amount', sa.Numeric(12, 2), default=0),
        sa.Column('total_amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('currency', sa.String(3), default='USD'),
        sa.Column('billing_address', postgresql.JSON, nullable=True),
        sa.Column('line_items', postgresql.JSON, default=list),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('due_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('period_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('period_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('metadata', postgresql.JSON, default=dict),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('idx_invoice_user_status', 'invoices', ['user_id', 'status'])
    op.create_index('idx_invoice_number', 'invoices', ['invoice_number'])

    # ======================================================================
    # src/modules/payment/models/refund.py
    # ======================================================================

    op.create_table(
        'refunds',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('payment_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('payments.id'), nullable=False, index=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('currency', sa.String(3), default='USD'),
        sa.Column('status', sa.String(20), default='pending', nullable=False),
        sa.Column('reason', sa.String(40), nullable=True),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('provider_refund_id', sa.String(255), nullable=True),
        sa.Column('metadata', postgresql.JSON, default=dict),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('idx_refund_payment', 'refunds', ['payment_id'])
    op.create_index('idx_refund_user_status', 'refunds', ['user_id', 'status'])

    # ======================================================================
    # src/modules/payment/models/coupon.py
    # ======================================================================

    op.create_table(
        'coupons',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('code', sa.String(50), unique=True, nullable=False, index=True),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('coupon_type', sa.String(20), nullable=False),
        sa.Column('value', sa.Numeric(12, 2), nullable=False),
        sa.Column('currency', sa.String(3), default='USD'),
        sa.Column('max_uses', sa.Integer, nullable=True),
        sa.Column('used_count', sa.Integer, default=0),
        sa.Column('max_uses_per_user', sa.Integer, default=1),
        sa.Column('min_purchase_amount', sa.Numeric(12, 2), nullable=True),
        sa.Column('applicable_plans', postgresql.JSON, default=list),
        sa.Column('status', sa.String(20), default='active'),
        sa.Column('starts_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('metadata', postgresql.JSON, default=dict),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('idx_coupon_code', 'coupons', ['code'])
    op.create_index('idx_coupon_status', 'coupons', ['status'])

    op.create_table(
        'coupon_usage',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('coupon_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('payment_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('discount_amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('idx_coupon_usage_coupon_user', 'coupon_usage', ['coupon_id', 'user_id'])

    # ======================================================================
    # src/modules/payment/models/webhook_event.py
    # ======================================================================

    op.create_table(
        'webhook_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('provider', sa.String(50), nullable=False),
        sa.Column('event_type', sa.String(100), nullable=False),
        sa.Column('provider_event_id', sa.String(255), nullable=False, index=True),
        sa.Column('payload', postgresql.JSON, nullable=False),
        sa.Column('status', sa.String(20), default='pending', nullable=False),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('error_message', sa.Text, nullable=True),
        sa.Column('retry_count', sa.Integer, default=0),
        sa.Column('max_retries', sa.Integer, default=3),
        sa.Column('idempotency_key', sa.String(255), unique=True, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('idx_webhook_provider_event', 'webhook_events', ['provider', 'event_type'])
    op.create_index('idx_webhook_status', 'webhook_events', ['status'])

    # ======================================================================
    # src/modules/payment/models/billing_address.py
    # ======================================================================

    op.create_table(
        'billing_addresses',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('line1', sa.String(255), nullable=False),
        sa.Column('line2', sa.String(255), nullable=True),
        sa.Column('city', sa.String(100), nullable=False),
        sa.Column('state', sa.String(100), nullable=True),
        sa.Column('postal_code', sa.String(20), nullable=False),
        sa.Column('country', sa.String(2), nullable=False),
        sa.Column('tax_id', sa.String(50), nullable=True),
        sa.Column('tax_id_type', sa.String(20), nullable=True),
        sa.Column('is_default', sa.Boolean, default=False),
        sa.Column('metadata', postgresql.JSON, default=dict),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('idx_billing_address_user', 'billing_addresses', ['user_id'])

    # ======================================================================
    # src/modules/search/models/search.py
    # ======================================================================

    op.create_table(
        'search_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', sa.String(36), nullable=False, index=True),
        sa.Column('query', sa.Text, nullable=False),
        sa.Column('filters', postgresql.JSON, default=dict),
        sa.Column('results_count', sa.Integer, default=0),
        sa.Column('latency_ms', sa.Float, default=0),
        sa.Column('page', sa.Integer, default=1),
        sa.Column('page_size', sa.Integer, default=20),
        sa.Column('sort_by', sa.String(50), default='relevance'),
        sa.Column('clicked_result_id', sa.String(36), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_search_history_user_created', 'search_history', ['user_id', 'created_at'])

    op.create_table(
        'search_saved',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', sa.String(36), nullable=False, index=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('query', sa.Text, nullable=False),
        sa.Column('filters', postgresql.JSON, default=dict),
        sa.Column('sort_by', sa.String(50), default='relevance'),
        sa.Column('notify_on_match', sa.Boolean, default=False),
        sa.Column('last_run_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('match_count', sa.Integer, default=0),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_search_saved_user_name', 'search_saved', ['user_id', 'name'], unique=True)

    op.create_table(
        'search_analytics',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('total_queries', sa.Integer, default=0),
        sa.Column('unique_users', sa.Integer, default=0),
        sa.Column('avg_latency_ms', sa.Float, default=0),
        sa.Column('p95_latency_ms', sa.Float, default=0),
        sa.Column('p99_latency_ms', sa.Float, default=0),
        sa.Column('zero_result_queries', sa.Integer, default=0),
        sa.Column('cached_queries', sa.Integer, default=0),
        sa.Column('top_queries', postgresql.JSON, default=list),
        sa.Column('top_filters', postgresql.JSON, default=list),
        sa.Column('index_size_bytes', sa.Integer, default=0),
        sa.Column('index_doc_count', sa.Integer, default=0),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_search_analytics_date', 'search_analytics', ['date'], unique=True)

    op.create_table(
        'search_index_jobs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('job_type', sa.String(50), nullable=False),
        sa.Column('status', sa.String(20), default='pending', nullable=False),
        sa.Column('user_id', sa.String(36), index=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('total_documents', sa.Integer, default=0),
        sa.Column('indexed_documents', sa.Integer, default=0),
        sa.Column('failed_documents', sa.Integer, default=0),
        sa.Column('error_message', sa.Text, nullable=True),
        sa.Column('metadata', postgresql.JSON, default=dict),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_search_index_jobs_status', 'search_index_jobs', ['status'])
    op.create_index('ix_search_index_jobs_type_status', 'search_index_jobs', ['job_type', 'status'])

    op.create_table(
        'search_suggestions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('query_text', sa.String(500), nullable=False, index=True),
        sa.Column('frequency', sa.Integer, default=1),
        sa.Column('user_id', sa.String(36), index=True),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_search_suggestions_text_freq', 'search_suggestions', ['query_text', 'frequency'])

    # ======================================================================
    # src/modules/security/models/security.py
    # ======================================================================

    op.create_table(
        'security_sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', sa.String(36), nullable=False, index=True),
        sa.Column('token_jti', sa.String(36), unique=True, nullable=False, index=True),
        sa.Column('refresh_token_jti', sa.String(36), unique=True, index=True),
        sa.Column('status', sa.String(20), default='active', nullable=False),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.Text, nullable=True),
        sa.Column('device_fingerprint', sa.String(64), nullable=True),
        sa.Column('device_name', sa.String(255), nullable=True),
        sa.Column('location_country', sa.String(2), nullable=True),
        sa.Column('location_city', sa.String(255), nullable=True),
        sa.Column('last_activity_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('revoke_reason', sa.String(255), nullable=True),
        sa.Column('metadata', postgresql.JSON, default=dict),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_security_sessions_user_status', 'security_sessions', ['user_id', 'status'])

    op.create_table(
        'security_api_keys',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', sa.String(36), nullable=False, index=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('key_prefix', sa.String(8), nullable=False),
        sa.Column('key_hash', sa.String(255), nullable=False),
        sa.Column('scopes', postgresql.JSON, default=list),
        sa.Column('rate_limit', sa.Integer, default=1000),
        sa.Column('daily_quota', sa.Integer, default=10000),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('metadata', postgresql.JSON, default=dict),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_security_api_keys_user_active', 'security_api_keys', ['user_id', 'is_active'])

    op.create_table(
        'security_events',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', sa.String(36), index=True),
        sa.Column('event_type', sa.String(50), nullable=False, index=True),
        sa.Column('severity', sa.String(20), nullable=False, index=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.Text, nullable=True),
        sa.Column('resource', sa.String(255), nullable=True),
        sa.Column('details', postgresql.JSON, default=dict),
        sa.Column('blocked', sa.Boolean, default=False),
        sa.Column('correlation_id', sa.String(36), index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_security_events_user_type', 'security_events', ['user_id', 'event_type'])
    op.create_index('ix_security_events_created', 'security_events', ['created_at'])

    op.create_table(
        'security_trusted_devices',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', sa.String(36), nullable=False, index=True),
        sa.Column('device_fingerprint', sa.String(64), nullable=False),
        sa.Column('device_name', sa.String(255), nullable=True),
        sa.Column('device_type', sa.String(50), nullable=True),
        sa.Column('browser', sa.String(100), nullable=True),
        sa.Column('os', sa.String(100), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('last_seen_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('trusted_until', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_active', sa.Boolean, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_trusted_devices_user_fingerprint', 'security_trusted_devices', ['user_id', 'device_fingerprint'], unique=True)

    op.create_table(
        'security_mfa_secrets',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', sa.String(36), unique=True, nullable=False, index=True),
        sa.Column('method', sa.String(20), nullable=False),
        sa.Column('secret_encrypted', sa.LargeBinary, nullable=False),
        sa.Column('backup_codes_encrypted', sa.LargeBinary, nullable=True),
        sa.Column('enabled', sa.Boolean, default=False),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('failed_attempts', sa.Integer, default=0),
        sa.Column('locked_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        'security_audit_logs',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', sa.String(36), index=True),
        sa.Column('action', sa.String(50), nullable=False, index=True),
        sa.Column('resource_type', sa.String(100), nullable=False),
        sa.Column('resource_id', sa.String(36), nullable=True),
        sa.Column('changes', postgresql.JSON, default=dict),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.Text, nullable=True),
        sa.Column('status', sa.String(20), default='success'),
        sa.Column('metadata', postgresql.JSON, default=dict),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_audit_logs_user_action', 'security_audit_logs', ['user_id', 'action'])
    op.create_index('ix_audit_logs_resource', 'security_audit_logs', ['resource_type', 'resource_id'])
    op.create_index('ix_audit_logs_created', 'security_audit_logs', ['created_at'])

    op.create_table(
        'security_password_history',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', sa.String(36), nullable=False, index=True),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_password_history_user', 'security_password_history', ['user_id'])

    op.create_table(
        'security_rate_limits',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('key', sa.String(255), nullable=False, index=True),
        sa.Column('window', sa.String(50), nullable=False),
        sa.Column('count', sa.Integer, default=1),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_rate_limits_key_window', 'security_rate_limits', ['key', 'window'], unique=True)

    op.create_table(
        'security_magic_links',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', sa.String(36), nullable=False, index=True),
        sa.Column('token_hash', sa.String(255), nullable=False, unique=True),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('used', sa.Boolean, default=False),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        'security_login_attempts',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(255), nullable=False, index=True),
        sa.Column('ip_address', sa.String(45), nullable=False, index=True),
        sa.Column('success', sa.Boolean, default=False),
        sa.Column('failure_reason', sa.String(255), nullable=True),
        sa.Column('user_agent', sa.Text, nullable=True),
        sa.Column('metadata', postgresql.JSON, default=dict),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_login_attempts_email_ip', 'security_login_attempts', ['email', 'ip_address'])
    op.create_index('ix_login_attempts_created', 'security_login_attempts', ['created_at'])

    # ======================================================================
    # src/modules/uploads/models/base.py
    # ======================================================================

    op.create_table(
        'uploads',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), index=True, nullable=False),
        sa.Column('original_filename', sa.String(500), nullable=False),
        sa.Column('stored_filename', sa.String(500), nullable=False, unique=True, index=True),
        sa.Column('file_size', sa.BigInteger, nullable=False),
        sa.Column('mime_type', sa.String(100), nullable=False),
        sa.Column('sha256_hash', sa.String(64), nullable=False, index=True),
        sa.Column('storage_provider', sa.String(20), nullable=False, default='local'),
        sa.Column('storage_path', sa.String(1000), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, default='pending', index=True),
        sa.Column('upload_progress', sa.Integer, nullable=False, default=0),
        sa.Column('error_message', sa.Text, nullable=True),
        sa.Column('metadata', postgresql.JSONB, nullable=True),
        sa.Column('is_virus_scanned', sa.Boolean, default=False, nullable=False),
        sa.Column('virus_scan_result', sa.String(50), nullable=True),
        sa.Column('ip_address', postgresql.INET, nullable=True),
        sa.Column('user_agent', sa.Text, nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('idx_upload_user_status', 'uploads', ['user_id', 'status'])
    op.create_index('idx_upload_hash_user', 'uploads', ['sha256_hash', 'user_id'])
    op.create_index('idx_upload_created', 'uploads', ['created_at'])

    op.create_table(
        'upload_chunks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('upload_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('uploads.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('chunk_number', sa.Integer, nullable=False),
        sa.Column('chunk_size', sa.BigInteger, nullable=False),
        sa.Column('storage_path', sa.String(1000), nullable=False),
        sa.Column('sha256_hash', sa.String(64), nullable=False),
        sa.Column('etag', sa.String(100), nullable=True),
        sa.Column('is_uploaded', sa.Boolean, default=False, nullable=False),
        sa.Column('upload_id_storage', sa.String(255), nullable=True),
        sa.Column('error_message', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('idx_chunk_upload_number', 'upload_chunks', ['upload_id', 'chunk_number'], unique=True)

    op.create_table(
        'user_upload_quotas',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), unique=True, index=True, nullable=False),
        sa.Column('max_storage_bytes', sa.BigInteger, nullable=False, default=10737418240),
        sa.Column('used_storage_bytes', sa.BigInteger, nullable=False, default=0),
        sa.Column('max_uploads', sa.Integer, nullable=False, default=1000),
        sa.Column('current_uploads', sa.Integer, nullable=False, default=0),
        sa.Column('max_file_size', sa.BigInteger, nullable=False, default=2147483648),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('user_upload_quotas')
    op.drop_table('upload_chunks')
    op.drop_table('uploads')
    op.drop_table('security_login_attempts')
    op.drop_table('security_magic_links')
    op.drop_table('security_rate_limits')
    op.drop_table('security_password_history')
    op.drop_table('security_audit_logs')
    op.drop_table('security_mfa_secrets')
    op.drop_table('security_trusted_devices')
    op.drop_table('security_events')
    op.drop_table('security_api_keys')
    op.drop_table('security_sessions')
    op.drop_table('search_suggestions')
    op.drop_table('search_index_jobs')
    op.drop_table('search_analytics')
    op.drop_table('search_saved')
    op.drop_table('search_history')
    op.drop_table('billing_addresses')
    op.drop_table('webhook_events')
    op.drop_table('coupon_usage')
    op.drop_table('coupons')
    op.drop_table('refunds')
    op.drop_table('invoices')
    op.drop_table('transactions')
    op.drop_table('payments')
    op.drop_table('provider_configs')
    op.drop_table('user_notification_preferences')
    op.drop_table('delivery_logs')
    op.drop_table('notification_templates')
    op.drop_table('notifications')
    op.drop_table('health_snapshots')
    op.drop_table('alert_history')
    op.drop_table('alert_rules')
    op.drop_table('monitoring_system_events')
    op.drop_table('mime_parse_logs')
    op.drop_table('mime_attachments')
    op.drop_table('mime_bodies')
    op.drop_table('mime_parts')
    op.drop_table('mime_messages')
    op.drop_table('license_audit_logs')
    op.drop_table('plan_features')
    op.drop_table('features')
    op.drop_table('subscriptions')
    op.drop_table('plans')
    op.drop_table('activations')
    op.drop_table('devices')
    op.drop_table('licenses')
    op.drop_table('gateway_tenant_audit_logs')
    op.drop_table('gateway_tenant_usage')
    op.drop_table('gateway_api_keys')
    op.drop_table('gateway_invitations')
    op.drop_table('gateway_roles')
    op.drop_table('gateway_memberships')
    op.drop_table('gateway_tenants')
    op.drop_table('gateway_organizations')
    op.drop_table('download_history')
    op.drop_table('conversion_logs')
    op.drop_table('conversion_jobs')
    op.drop_table('conversion_batches')
    op.drop_table('dashboard_widgets')
    op.drop_table('aggregated_metrics')
    op.drop_table('reports')
    op.drop_table('analytics_events')
    op.drop_table('announcements')
    op.drop_table('dashboard_metrics')
    op.drop_table('system_events')
    op.drop_table('admin_permissions')
    op.drop_table('admin_users')
    op.drop_table('audit_logs')
    op.drop_table('password_resets')
    op.drop_table('email_verifications')
    op.drop_table('user_sessions')
    op.drop_table('user_roles')
    op.drop_table('role_permissions')
    op.drop_table('users')
    op.drop_table('permissions')
    op.drop_table('roles')
