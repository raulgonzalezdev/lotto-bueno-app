"""Agregar tablas tickets y recolectores

Revision ID: abc123456789
Revises: 86a4d39964ec
Create Date: 2024-06-10 08:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'abc123456789'
down_revision: Union[str, None] = '86a4d39964ec'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    
    op.create_table('recolectores',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('nombre', sa.String(length=100), nullable=True),
    sa.Column('cedula', sa.String(length=20), nullable=True),
    sa.Column('telefono', sa.String(length=20), nullable=True),
    sa.Column('es_referido', sa.Boolean(), nullable=True),
    sa.PrimaryKeyConstraint('id')
    )
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('tickets',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('numero_ticket', sa.String(length=20), nullable=True),
    sa.Column('qr_ticket', sa.String(length=255), nullable=True),
    sa.Column('cedula', sa.String(length=20), nullable=True),
    sa.Column('nombre', sa.String(length=100), nullable=True),
    sa.Column('telefono', sa.String(length=20), nullable=True),
    sa.Column('estado', sa.String(length=20), nullable=True),
    sa.Column('referido_id', sa.Integer(), nullable=True),
    sa.Column('validado', sa.Boolean(), nullable=True),
    sa.ForeignKeyConstraint(['referido_id'], ['recolectores.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_tickets_id'), 'tickets', ['id'], unique=False)
    op.create_index(op.f('ix_tickets_numero_ticket'), 'tickets', ['numero_ticket'], unique=True)
    
    
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_index(op.f('ix_tickets_numero_ticket'), table_name='tickets')
    op.drop_index(op.f('ix_tickets_id'), table_name='tickets')
    op.drop_table('tickets')
    
    op.drop_table('recolectores')
    # ### end Alembic commands ###
