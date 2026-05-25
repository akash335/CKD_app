"""fix alert settings columns

Revision ID: 328e1c79e007
Revises: c7f2a91b3e05
Create Date: 2026-05-05 14:14:59.001934

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '328e1c79e007'
down_revision: Union[str, None] = 'c7f2a91b3e05'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Safely add missing columns to alert_settings table if they don't exist
    op.execute("ALTER TABLE alert_settings ADD COLUMN IF NOT EXISTS max_alerts_per_day INTEGER DEFAULT 3")
    op.execute("ALTER TABLE alert_settings ADD COLUMN IF NOT EXISTS cooldown_hours INTEGER DEFAULT 6")
    op.execute("ALTER TABLE alert_settings ADD COLUMN IF NOT EXISTS last_alert_sent_at TIMESTAMP")


def downgrade() -> None:
    # No-op: we don't want to drop columns in case this is running on a shared DB
    pass
