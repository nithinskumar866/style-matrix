"""add wear history, saved outfits and item price

Revision ID: a1f4c7d92b10
Revises: ec778ca8825a
Create Date: 2026-11-04 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1f4c7d92b10'
down_revision: Union[str, Sequence[str], None] = 'ec778ca8825a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('clothing_items', sa.Column('price', sa.Float(), nullable=True))

    op.create_table('wear_events',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('item_id', sa.Integer(), nullable=False),
    sa.Column('outfit_key', sa.String(), nullable=False),
    sa.Column('worn_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('previous_last_worn', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['item_id'], ['clothing_items.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_wear_events_item_id'), 'wear_events', ['item_id'], unique=False)
    op.create_index(op.f('ix_wear_events_outfit_key'), 'wear_events', ['outfit_key'], unique=False)

    op.create_table('saved_outfits',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('item_ids', sa.JSON(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=True),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('saved_outfits')
    op.drop_index(op.f('ix_wear_events_outfit_key'), table_name='wear_events')
    op.drop_index(op.f('ix_wear_events_item_id'), table_name='wear_events')
    op.drop_table('wear_events')
    op.drop_column('clothing_items', 'price')
