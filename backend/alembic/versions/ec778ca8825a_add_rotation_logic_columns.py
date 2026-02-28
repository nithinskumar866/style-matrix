"""add_rotation_logic_columns

Revision ID: ec778ca8825a
Revises: 304f8511effd
Create Date: 2026-02-28 21:44:31.703306

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ec778ca8825a'
down_revision: Union[str, Sequence[str], None] = '304f8511effd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
