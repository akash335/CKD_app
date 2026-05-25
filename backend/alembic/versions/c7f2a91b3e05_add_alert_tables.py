"""Add alert contacts, settings, and logs tables

Revision ID: c7f2a91b3e05
Revises: 06a30811ae94
Create Date: 2026-05-04 16:35:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c7f2a91b3e05'
down_revision: Union[str, None] = '06a30811ae94'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Use raw SQL with IF NOT EXISTS so this migration is safe to run
    # whether tables were partially created by create_all() or not.

    # ── alert_contacts ──────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS alert_contacts (
            id VARCHAR NOT NULL PRIMARY KEY,
            user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name VARCHAR NOT NULL,
            email VARCHAR NOT NULL,
            relation VARCHAR NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_alert_contacts_id ON alert_contacts (id)")

    # ── alert_settings ──────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS alert_settings (
            id VARCHAR NOT NULL PRIMARY KEY,
            user_id VARCHAR NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
            enable_email_alerts BOOLEAN DEFAULT FALSE,
            max_alerts_per_day INTEGER DEFAULT 3,
            cooldown_hours INTEGER DEFAULT 6,
            last_alert_sent_at TIMESTAMP
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_alert_settings_id ON alert_settings (id)")

    # Add columns that may be missing if the table was created by an older model
    op.execute("ALTER TABLE alert_settings ADD COLUMN IF NOT EXISTS max_alerts_per_day INTEGER DEFAULT 3")
    op.execute("ALTER TABLE alert_settings ADD COLUMN IF NOT EXISTS cooldown_hours INTEGER DEFAULT 6")
    op.execute("ALTER TABLE alert_settings ADD COLUMN IF NOT EXISTS last_alert_sent_at TIMESTAMP")

    # ── alert_logs ──────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS alert_logs (
            id VARCHAR NOT NULL PRIMARY KEY,
            user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            risk_level VARCHAR NOT NULL,
            recipients JSON NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    op.execute("CREATE INDEX IF NOT EXISTS ix_alert_logs_id ON alert_logs (id)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS alert_logs")
    op.execute("DROP TABLE IF EXISTS alert_settings")
    op.execute("DROP TABLE IF EXISTS alert_contacts")
