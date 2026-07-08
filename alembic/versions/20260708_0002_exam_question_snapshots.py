"""add exam question snapshots

Revision ID: 20260708_0002
Revises: 20260628_0001
Create Date: 2026-07-08
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260708_0002"
down_revision: str | None = "20260628_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    naming_convention = {"fk": "%(table_name)s_%(column_0_name)s_fkey"}
    with op.batch_alter_table("exam_questions", naming_convention=naming_convention) as batch_op:
        batch_op.add_column(sa.Column("snapshot_question_text", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("snapshot_question_type", sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column("snapshot_difficulty", sa.String(length=50), nullable=True))
        batch_op.add_column(sa.Column("snapshot_learning_outcome_code", sa.String(length=100), nullable=True))
        batch_op.add_column(sa.Column("snapshot_options", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("snapshot_correct_answer", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("snapshot_suggested_answer", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("snapshot_grading_rubric", sa.Text(), nullable=True))
        batch_op.add_column(sa.Column("snapshot_explanation", sa.Text(), nullable=True))
        batch_op.drop_constraint("exam_questions_question_id_fkey", type_="foreignkey")
        batch_op.alter_column("question_id", existing_type=sa.Integer(), nullable=True)
        batch_op.create_foreign_key(
            "exam_questions_question_id_fkey",
            "questions",
            ["question_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    naming_convention = {"fk": "%(table_name)s_%(column_0_name)s_fkey"}
    with op.batch_alter_table("exam_questions", naming_convention=naming_convention) as batch_op:
        batch_op.drop_constraint("exam_questions_question_id_fkey", type_="foreignkey")
        batch_op.alter_column("question_id", existing_type=sa.Integer(), nullable=False)
        batch_op.create_foreign_key(
            "exam_questions_question_id_fkey",
            "questions",
            ["question_id"],
            ["id"],
            ondelete="CASCADE",
        )
        batch_op.drop_column("snapshot_explanation")
        batch_op.drop_column("snapshot_grading_rubric")
        batch_op.drop_column("snapshot_suggested_answer")
        batch_op.drop_column("snapshot_correct_answer")
        batch_op.drop_column("snapshot_options")
        batch_op.drop_column("snapshot_learning_outcome_code")
        batch_op.drop_column("snapshot_difficulty")
        batch_op.drop_column("snapshot_question_type")
        batch_op.drop_column("snapshot_question_text")
