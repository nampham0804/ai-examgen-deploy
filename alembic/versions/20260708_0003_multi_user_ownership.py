"""multi_user_ownership

Revision ID: 20260708_0003
Revises: 20260708_0002
Create Date: 2026-07-08
"""

from collections.abc import Sequence
import sqlalchemy as sa
from alembic import op

revision: str = '20260708_0003'
down_revision: str | None = '20260708_0002'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

naming_convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s"
}


def upgrade() -> None:
    # 1. Backfill legacy user if not exists
    connection = op.get_bind()
    users_exist = connection.execute(sa.text("SELECT 1 FROM users LIMIT 1")).fetchone()
    if not users_exist:
        # Create a legacy inactive user
        connection.execute(sa.text(
            "INSERT INTO users (email, full_name, hashed_password, is_active) "
            "VALUES ('legacy.owner@example.local', 'Legacy Owner', 'invalid_password', :is_active)"
        ), {"is_active": False})

    # Get the ID of the first user
    legacy_user_id = connection.execute(sa.text("SELECT id FROM users ORDER BY id ASC LIMIT 1")).scalar()

    # 2. Backfill existing records with NULL owner columns
    connection.execute(sa.text("UPDATE courses SET owner_id = :user_id WHERE owner_id IS NULL"), {"user_id": legacy_user_id})
    connection.execute(sa.text("UPDATE documents SET uploaded_by = :user_id WHERE uploaded_by IS NULL"), {"user_id": legacy_user_id})
    connection.execute(sa.text("UPDATE questions SET created_by = :user_id WHERE created_by IS NULL"), {"user_id": legacy_user_id})
    connection.execute(sa.text("UPDATE exam_blueprints SET created_by = :user_id WHERE created_by IS NULL"), {"user_id": legacy_user_id})
    connection.execute(sa.text("UPDATE exams SET created_by = :user_id WHERE created_by IS NULL"), {"user_id": legacy_user_id})

    # 3. Courses: Alter unique constraint on code, set owner_id non-nullable, create simple indexes
    # Drop global index on courses.code first
    try:
        op.drop_index("ix_courses_code", table_name="courses")
    except Exception:
        pass

    with op.batch_alter_table("courses", naming_convention=naming_convention) as batch_op:
        batch_op.alter_column("owner_id", existing_type=sa.Integer(), nullable=False)
        batch_op.create_unique_constraint("uq_courses_owner_id_code", ["owner_id", "code"])
        batch_op.create_index("ix_courses_code", ["code"], unique=False)
        batch_op.create_index("ix_courses_owner_id", ["owner_id"])

    # 4. Create owner indexes on other tables
    with op.batch_alter_table("documents", naming_convention=naming_convention) as batch_op:
        batch_op.create_index("ix_documents_uploaded_by", ["uploaded_by"])

    with op.batch_alter_table("questions", naming_convention=naming_convention) as batch_op:
        batch_op.create_index("ix_questions_created_by", ["created_by"])

    with op.batch_alter_table("exam_blueprints", naming_convention=naming_convention) as batch_op:
        batch_op.create_index("ix_exam_blueprints_created_by", ["created_by"])

    with op.batch_alter_table("exams", naming_convention=naming_convention) as batch_op:
        batch_op.create_index("ix_exams_created_by", ["created_by"])

    # 5. Add foreign keys
    with op.batch_alter_table("exam_blueprints", naming_convention=naming_convention) as batch_op:
        batch_op.create_foreign_key(
            "fk_exam_blueprints_created_by_users",
            "users",
            ["created_by"],
            ["id"]
        )
        batch_op.create_foreign_key(
            "fk_exam_blueprints_course_id_courses",
            "courses",
            ["course_id"],
            ["id"]
        )

    with op.batch_alter_table("exams", naming_convention=naming_convention) as batch_op:
        batch_op.create_foreign_key(
            "fk_exams_created_by_users",
            "users",
            ["created_by"],
            ["id"]
        )
        batch_op.create_foreign_key(
            "fk_exams_course_id_courses",
            "courses",
            ["course_id"],
            ["id"]
        )


def downgrade() -> None:
    # Drop foreign keys on exams and exam_blueprints
    with op.batch_alter_table("exams", naming_convention=naming_convention) as batch_op:
        batch_op.drop_constraint("fk_exams_course_id_courses", type_="foreignkey")
        batch_op.drop_constraint("fk_exams_created_by_users", type_="foreignkey")
        batch_op.drop_index("ix_exams_created_by")

    with op.batch_alter_table("exam_blueprints", naming_convention=naming_convention) as batch_op:
        batch_op.drop_constraint("fk_exam_blueprints_course_id_courses", type_="foreignkey")
        batch_op.drop_constraint("fk_exam_blueprints_created_by_users", type_="foreignkey")
        batch_op.drop_index("ix_exam_blueprints_created_by")

    with op.batch_alter_table("questions", naming_convention=naming_convention) as batch_op:
        batch_op.drop_index("ix_questions_created_by")

    with op.batch_alter_table("documents", naming_convention=naming_convention) as batch_op:
        batch_op.drop_index("ix_documents_uploaded_by")

    # In courses, drop new indexes/constraints, set owner_id back to nullable, restore global code index
    try:
        op.drop_index("ix_courses_code", table_name="courses")
    except Exception:
        pass

    with op.batch_alter_table("courses", naming_convention=naming_convention) as batch_op:
        batch_op.drop_index("ix_courses_owner_id")
        batch_op.drop_constraint("uq_courses_owner_id_code", type_="unique")
        batch_op.alter_column("owner_id", existing_type=sa.Integer(), nullable=True)
        batch_op.create_index("ix_courses_code", ["code"], unique=True)
