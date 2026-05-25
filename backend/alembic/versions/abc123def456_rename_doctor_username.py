"""rename doctor_username to username

Revision ID: abc123def456
Revises: 393d629daa14
Create Date: 2026-05-03 16:50:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'abc123def456'
down_revision = '393d629daa14'
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Rename the column 'doctor_username' to 'username' in 'users' table
    op.alter_column('users', 'doctor_username', new_column_name='username')
    
    # Update index (drop old, create new)
    op.drop_index('ix_users_doctor_username', table_name='users')
    op.create_index('ix_users_username', 'users', ['username'], unique=True)

def downgrade() -> None:
    # Revert 'username' back to 'doctor_username'
    op.alter_column('users', 'username', new_column_name='doctor_username')
    
    # Revert index
    op.drop_index('ix_users_username', table_name='users')
    op.create_index('ix_users_doctor_username', 'users', ['doctor_username'], unique=True)
