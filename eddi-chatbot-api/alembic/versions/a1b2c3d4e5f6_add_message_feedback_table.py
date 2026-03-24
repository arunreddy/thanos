"""Add message_feedback table

Revision ID: a1b2c3d4e5f6
Revises: 0f40ef85d33a
Create Date: 2026-03-23 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '0f40ef85d33a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create message_feedback table."""
    op.create_table(
        'message_feedback',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('message_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('feedback_type', sa.String(length=10), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=True),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['message_id'], ['messages.id']),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.CheckConstraint("feedback_type IN ('positive', 'negative')", name='check_feedback_type'),
        sa.UniqueConstraint('message_id', 'user_id', name='uq_message_user_feedback'),
    )
    op.create_index('ix_message_feedback_message_id', 'message_feedback', ['message_id'])
    op.create_index('ix_message_feedback_user_id', 'message_feedback', ['user_id'])


def downgrade() -> None:
    """Drop message_feedback table."""
    op.drop_index('ix_message_feedback_user_id', table_name='message_feedback')
    op.drop_index('ix_message_feedback_message_id', table_name='message_feedback')
    op.drop_table('message_feedback')
