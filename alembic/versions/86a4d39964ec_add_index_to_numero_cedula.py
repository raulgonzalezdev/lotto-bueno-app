"""Add index to numero_cedula

Revision ID: 86a4d39964ec
Revises: ccfb4ca42c6d
Create Date: 2024-06-09 11:56:26.422866

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '86a4d39964ec'
down_revision: Union[str, None] = 'ccfb4ca42c6d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_index(op.f('ix_electores_numero_cedula'), 'electores', ['numero_cedula'], unique=False)
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(op.f('ix_electores_numero_cedula'), table_name='electores')
    # ### end Alembic commands ###
