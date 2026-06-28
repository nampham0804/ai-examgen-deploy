"""initial schema

Revision ID: 20260628_0001
Revises:
Create Date: 2026-06-28
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "20260628_0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)

    op.create_table(
        "courses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("owner_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_courses_code"), "courses", ["code"], unique=True)
    op.create_index(op.f("ix_courses_id"), "courses", ["id"], unique=False)

    op.create_table(
        "documents",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("uploaded_by", sa.Integer(), nullable=True),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("stored_file_name", sa.String(length=255), nullable=True),
        sa.Column("file_type", sa.String(length=20), nullable=False),
        sa.Column("document_type", sa.String(length=50), nullable=False),
        sa.Column("mime_type", sa.String(length=100), nullable=True),
        sa.Column("file_path", sa.Text(), nullable=False),
        sa.Column("file_size_bytes", sa.Integer(), nullable=True),
        sa.Column("page_count", sa.Integer(), nullable=True),
        sa.Column("extracted_text", sa.Text(), nullable=True),
        sa.Column("text_length", sa.Integer(), nullable=True),
        sa.Column("chunk_count", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.CheckConstraint(
            "document_type IN ('syllabus', 'lecture', 'old_exam', 'instructor_rule', 'external_reference')",
            name="ck_documents_document_type",
        ),
        sa.CheckConstraint("status IN ('uploaded', 'processing', 'processed', 'failed')", name="ck_documents_status"),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_documents_course_id"), "documents", ["course_id"], unique=False)
    op.create_index(op.f("ix_documents_id"), "documents", ["id"], unique=False)
    op.create_index(op.f("ix_documents_status"), "documents", ["status"], unique=False)

    op.create_table(
        "exam_blueprints",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("total_questions", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_exam_blueprints_course_id"), "exam_blueprints", ["course_id"], unique=False)
    op.create_index(op.f("ix_exam_blueprints_id"), "exam_blueprints", ["id"], unique=False)

    op.create_table(
        "learning_outcomes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("bloom_level", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("course_id", "code", name="uq_learning_outcomes_course_code"),
    )
    op.create_index(op.f("ix_learning_outcomes_course_id"), "learning_outcomes", ["course_id"], unique=False)
    op.create_index(op.f("ix_learning_outcomes_id"), "learning_outcomes", ["id"], unique=False)

    op.create_table(
        "document_chunks",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("document_id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("section_path", sa.Text(), nullable=True),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("keywords", sa.JSON(), nullable=True),
        sa.Column("token_count", sa.Integer(), nullable=True),
        sa.Column("page_start", sa.Integer(), nullable=True),
        sa.Column("page_end", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("document_id", "chunk_index", name="uq_document_chunks_index"),
    )
    op.create_index(op.f("ix_document_chunks_course_id"), "document_chunks", ["course_id"], unique=False)
    op.create_index(op.f("ix_document_chunks_document_id"), "document_chunks", ["document_id"], unique=False)
    op.create_index(op.f("ix_document_chunks_id"), "document_chunks", ["id"], unique=False)

    op.create_table(
        "exam_blueprint_items",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("blueprint_id", sa.Integer(), nullable=False),
        sa.Column("learning_outcome_id", sa.Integer(), nullable=False),
        sa.Column("question_type", sa.String(length=50), nullable=True),
        sa.Column("easy_count", sa.Integer(), nullable=True),
        sa.Column("medium_count", sa.Integer(), nullable=True),
        sa.Column("hard_count", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["blueprint_id"], ["exam_blueprints.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("blueprint_id", "learning_outcome_id", "question_type", name="uq_blueprint_item_lo_type"),
    )
    op.create_index(op.f("ix_exam_blueprint_items_id"), "exam_blueprint_items", ["id"], unique=False)

    op.create_table(
        "questions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("learning_outcome_id", sa.Integer(), nullable=False),
        sa.Column("document_id", sa.Integer(), nullable=True),
        sa.Column("question_type", sa.String(length=20), nullable=False),
        sa.Column("difficulty", sa.String(length=20), nullable=False),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column("options", sa.JSON(), nullable=True),
        sa.Column("correct_answer", sa.Text(), nullable=True),
        sa.Column("suggested_answer", sa.Text(), nullable=True),
        sa.Column("grading_rubric", sa.Text(), nullable=True),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("created_by_ai", sa.Boolean(), nullable=False),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("approved_by", sa.Integer(), nullable=True),
        sa.Column("approved_at", sa.DateTime(), nullable=True),
        sa.Column("source_chunk_ids", sa.JSON(), nullable=True),
        sa.Column("generation_topic", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.CheckConstraint("difficulty IN ('easy', 'medium', 'hard')", name="ck_questions_difficulty"),
        sa.CheckConstraint("question_type IN ('mcq', 'essay')", name="ck_questions_question_type"),
        sa.CheckConstraint("status IN ('pending_review', 'approved', 'rejected')", name="ck_questions_status"),
        sa.ForeignKeyConstraint(["approved_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["document_id"], ["documents.id"]),
        sa.ForeignKeyConstraint(["learning_outcome_id"], ["learning_outcomes.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_questions_course_id"), "questions", ["course_id"], unique=False)
    op.create_index(op.f("ix_questions_difficulty"), "questions", ["difficulty"], unique=False)
    op.create_index(op.f("ix_questions_document_id"), "questions", ["document_id"], unique=False)
    op.create_index(op.f("ix_questions_id"), "questions", ["id"], unique=False)
    op.create_index(op.f("ix_questions_learning_outcome_id"), "questions", ["learning_outcome_id"], unique=False)
    op.create_index(op.f("ix_questions_question_type"), "questions", ["question_type"], unique=False)
    op.create_index(op.f("ix_questions_status"), "questions", ["status"], unique=False)

    op.create_table(
        "exams",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=True),
        sa.Column("blueprint_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
        sa.Column("total_questions", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
        sa.ForeignKeyConstraint(["blueprint_id"], ["exam_blueprints.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_exams_course_id"), "exams", ["course_id"], unique=False)
    op.create_index(op.f("ix_exams_id"), "exams", ["id"], unique=False)

    op.create_table(
        "exam_questions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("exam_id", sa.Integer(), nullable=False),
        sa.Column("question_id", sa.Integer(), nullable=False),
        sa.Column("criteria_id", sa.Integer(), nullable=True),
        sa.Column("order_index", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["criteria_id"], ["exam_blueprint_items.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["exam_id"], ["exams.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["question_id"], ["questions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("exam_id", "question_id", name="uq_exam_question"),
    )
    op.create_index(op.f("ix_exam_questions_id"), "exam_questions", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_exam_questions_id"), table_name="exam_questions")
    op.drop_table("exam_questions")
    op.drop_index(op.f("ix_exams_id"), table_name="exams")
    op.drop_index(op.f("ix_exams_course_id"), table_name="exams")
    op.drop_table("exams")
    op.drop_index(op.f("ix_questions_status"), table_name="questions")
    op.drop_index(op.f("ix_questions_question_type"), table_name="questions")
    op.drop_index(op.f("ix_questions_learning_outcome_id"), table_name="questions")
    op.drop_index(op.f("ix_questions_id"), table_name="questions")
    op.drop_index(op.f("ix_questions_document_id"), table_name="questions")
    op.drop_index(op.f("ix_questions_difficulty"), table_name="questions")
    op.drop_index(op.f("ix_questions_course_id"), table_name="questions")
    op.drop_table("questions")
    op.drop_index(op.f("ix_exam_blueprint_items_id"), table_name="exam_blueprint_items")
    op.drop_table("exam_blueprint_items")
    op.drop_index(op.f("ix_document_chunks_id"), table_name="document_chunks")
    op.drop_index(op.f("ix_document_chunks_document_id"), table_name="document_chunks")
    op.drop_index(op.f("ix_document_chunks_course_id"), table_name="document_chunks")
    op.drop_table("document_chunks")
    op.drop_index(op.f("ix_learning_outcomes_id"), table_name="learning_outcomes")
    op.drop_index(op.f("ix_learning_outcomes_course_id"), table_name="learning_outcomes")
    op.drop_table("learning_outcomes")
    op.drop_index(op.f("ix_exam_blueprints_id"), table_name="exam_blueprints")
    op.drop_index(op.f("ix_exam_blueprints_course_id"), table_name="exam_blueprints")
    op.drop_table("exam_blueprints")
    op.drop_index(op.f("ix_documents_status"), table_name="documents")
    op.drop_index(op.f("ix_documents_id"), table_name="documents")
    op.drop_index(op.f("ix_documents_course_id"), table_name="documents")
    op.drop_table("documents")
    op.drop_index(op.f("ix_courses_id"), table_name="courses")
    op.drop_index(op.f("ix_courses_code"), table_name="courses")
    op.drop_table("courses")
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
