import json

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from src.repositories.exam_repository import ExamRepository
from src.schemas.blueprint import BlueprintCreate, BlueprintUpdate, ValidationDetail, ValidationResultData
from src.schemas.exam_schema import ExamCreate, ExamPreviewData, ExamPreviewQuestion


class ExamService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ExamRepository(db)

    def create_blueprint(self, blueprint_in: BlueprintCreate):
        total_questions = sum(
            item.easy_count + item.medium_count + item.hard_count
            for item in blueprint_in.items
        )
        if total_questions == 0:
            raise HTTPException(status_code=422, detail="Total questions must be greater than 0")

        return self.repo.create_blueprint(blueprint_in, total_questions)

    def get_blueprints_by_course(self, course_id: int):
        return self.repo.get_blueprints_by_course(course_id)

    def get_blueprint_by_id(self, blueprint_id: int):
        blueprint = self.repo.get_blueprint_by_id(blueprint_id)
        if not blueprint:
            raise HTTPException(status_code=404, detail="Blueprint not found")
        return blueprint

    def update_blueprint(self, blueprint_id: int, blueprint_update: BlueprintUpdate):
        total_questions = None
        if blueprint_update.items is not None:
            total_questions = sum(
                item.easy_count + item.medium_count + item.hard_count
                for item in blueprint_update.items
            )
            if total_questions == 0:
                raise HTTPException(status_code=422, detail="Total questions must be greater than 0")

        blueprint = self.repo.update_blueprint(blueprint_id, blueprint_update, total_questions)
        if not blueprint:
            raise HTTPException(status_code=404, detail="Blueprint not found")
        return blueprint

    def delete_blueprint(self, blueprint_id: int):
        success = self.repo.delete_blueprint(blueprint_id)
        if not success:
            raise HTTPException(status_code=404, detail="Blueprint not found")
        return True

    def validate_blueprint(self, blueprint_id: int) -> ValidationResultData:
        blueprint = self.get_blueprint_by_id(blueprint_id)

        # Query approved questions matching blueprint requirements
        # We use raw SQL to avoid depending on models not yet created by other teams
        query = text("""
            SELECT learning_outcome_id, question_type, difficulty, COUNT(id) as count
            FROM questions
            WHERE course_id = :course_id AND status = 'approved'
            GROUP BY learning_outcome_id, question_type, difficulty
        """)

        results = self.db.execute(query, {"course_id": blueprint.course_id}).fetchall()

        # Build dictionary for quick lookup
        # (lo_id, q_type, difficulty) -> count
        available = {}
        for row in results:
            # row: (learning_outcome_id, question_type, difficulty, count)
            key = (row[0], row[1], row[2])
            available[key] = row[3]

        details = []
        all_valid = True
        total_required = blueprint.total_questions

        # We also need learning outcome codes.
        # Fetch LOs for this course
        lo_query = text("SELECT id, code FROM learning_outcomes WHERE course_id = :course_id")
        lo_results = self.db.execute(lo_query, {"course_id": blueprint.course_id}).fetchall()
        lo_map = {row[0]: row[1] for row in lo_results}

        for item in blueprint.items:
            lo_id = item.learning_outcome_id
            q_type = item.question_type
            lo_code = lo_map.get(lo_id, f"LO{lo_id}")

            e_avail = available.get((lo_id, q_type, "easy"), 0)
            m_avail = available.get((lo_id, q_type, "medium"), 0)
            h_avail = available.get((lo_id, q_type, "hard"), 0)

            is_valid = (
                e_avail >= item.easy_count
                and m_avail >= item.medium_count
                and h_avail >= item.hard_count
            )

            missing_msgs = []
            if e_avail < item.easy_count:
                missing_msgs.append(f"{item.easy_count - e_avail} Easy")
            if m_avail < item.medium_count:
                missing_msgs.append(f"{item.medium_count - m_avail} Medium")
            if h_avail < item.hard_count:
                missing_msgs.append(f"{item.hard_count - h_avail} Hard")

            missing = None
            if not is_valid:
                all_valid = False
                missing = f"Thiếu {', '.join(missing_msgs)} {q_type} cho {lo_code}"

            details.append(
                ValidationDetail(
                    learning_outcome_id=lo_id,
                    learning_outcome_code=lo_code,
                    question_type=q_type,
                    easy_required=item.easy_count,
                    easy_available=e_avail,
                    medium_required=item.medium_count,
                    medium_available=m_avail,
                    hard_required=item.hard_count,
                    hard_available=h_avail,
                    is_valid=is_valid,
                    missing=missing,
                )
            )

        if all_valid:
            # Update status to validated
            blueprint_update = BlueprintUpdate(status="validated")
            self.repo.update_blueprint(blueprint_id, blueprint_update)

        return ValidationResultData(is_valid=all_valid, total_required=total_required, details=details)

    # Exam methods
    def create_exam(self, exam_in: ExamCreate):
        return self.repo.create_exam(exam_in)

    def get_exams_by_course(self, course_id: int):
        return self.repo.get_exams_by_course(course_id)

    def get_exam_by_id(self, exam_id: int):
        exam = self.repo.get_exam_by_id(exam_id)
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")
        return exam

    def generate_exam(self, exam_id: int):
        exam = self.get_exam_by_id(exam_id)
        if not exam.blueprint_id:
            raise HTTPException(status_code=400, detail="Exam has no associated blueprint")

        blueprint = self.get_blueprint_by_id(exam.blueprint_id)
        if blueprint.status != "validated":
            raise HTTPException(status_code=400, detail="Blueprint must be validated before generation")

        selected_question_ids = []

        # Iterate over blueprint items and pick random questions matching the requirements
        for item in blueprint.items:
            for difficulty, count in [
                ("easy", item.easy_count),
                ("medium", item.medium_count),
                ("hard", item.hard_count),
            ]:
                if count > 0:
                    query = text("""
                        SELECT id FROM questions
                        WHERE course_id = :course_id
                          AND learning_outcome_id = :lo_id
                          AND question_type = :q_type
                          AND difficulty = :difficulty
                          AND status = 'approved'
                        ORDER BY RANDOM()
                        LIMIT :limit
                    """)

                    results = self.db.execute(
                        query,
                        {
                            "course_id": blueprint.course_id,
                            "lo_id": item.learning_outcome_id,
                            "q_type": item.question_type,
                            "difficulty": difficulty,
                            "limit": count,
                        },
                    ).fetchall()

                    if len(results) < count:
                        raise HTTPException(
                            status_code=400,
                            detail=f"Not enough {difficulty} questions for LO {item.learning_outcome_id}",
                        )

                    selected_question_ids.extend([row[0] for row in results])

        # Save the selected questions to exam_questions
        self.repo.add_exam_questions(exam_id, selected_question_ids)

        # Update exam status and total questions
        updated_exam = self.repo.update_exam_status(exam_id, "generated", len(selected_question_ids))
        return updated_exam

    def get_exam_preview(self, exam_id: int) -> ExamPreviewData:
        exam = self.get_exam_by_id(exam_id)

        # In a real system, we'd query `courses` for the course name.
        # Here we hardcode or mock it if table doesn't exist, but let's try raw SQL
        course_name_query = text("SELECT name FROM courses WHERE id = :course_id")
        try:
            course_name_result = self.db.execute(course_name_query, {"course_id": exam.course_id}).scalar()
        except Exception:
            course_name_result = f"Course {exam.course_id}"
        course_name = course_name_result if course_name_result else f"Course {exam.course_id}"

        # Query detailed questions
        query = text("""
            SELECT
                eq.id as eq_id, eq.question_id, eq.order_index,
                q.question_text as text, q.question_type as type, q.difficulty,
                lo.code as lo_code,
                q.options, q.correct_answer, q.suggested_answer, q.grading_rubric
            FROM exam_questions eq
            JOIN questions q ON eq.question_id = q.id
            LEFT JOIN learning_outcomes lo ON q.learning_outcome_id = lo.id
            WHERE eq.exam_id = :exam_id
            ORDER BY eq.order_index ASC
        """)

        try:
            results = self.db.execute(query, {"exam_id": exam_id}).fetchall()
        except Exception:
            # Table might not exist yet, return empty list or mock
            results = []

        questions = []
        for row in results:
            # Attempt to parse options if it's stored as JSON string
            options = None
            if row.options:
                try:
                    options = json.loads(row.options) if isinstance(row.options, str) else row.options
                except Exception:
                    options = []
                if options and isinstance(options[0], dict):
                    options = [option.get("text", "") for option in options]

            questions.append(
                ExamPreviewQuestion(
                    id=row.eq_id,
                    exam_id=exam_id,
                    question_id=row.question_id,
                    order_index=row.order_index,
                    text=row.text or "Question text unavailable",
                    type=row.type,
                    difficulty=row.difficulty,
                    learning_outcome_code=row.lo_code or "LO",
                    options=options,
                    correct_answer=row.correct_answer,
                    sample_answer=row.suggested_answer,
                    rubric=row.grading_rubric,
                )
            )

        return ExamPreviewData(
            id=exam.id,
            title=exam.title,
            course_name=course_name,
            duration_minutes=exam.duration_minutes,
            total_questions=exam.total_questions,
            questions=questions,
        )

    def swap_exam_question(self, exam_id: int, question_id: int):
        exam = self.get_exam_by_id(exam_id)

        # 1. Find the existing exam_question to know what to replace
        eq_query = text(
            "SELECT id, question_id, order_index FROM exam_questions "
            "WHERE exam_id = :exam_id AND question_id = :question_id"
        )
        eq_row = self.db.execute(eq_query, {"exam_id": exam_id, "question_id": question_id}).fetchone()

        if not eq_row:
            raise HTTPException(status_code=404, detail="Question not found in this exam")

        eq_id, current_q_id, _order_idx = eq_row

        # 2. Get properties of the current question
        q_query = text("SELECT learning_outcome_id, question_type, difficulty FROM questions WHERE id = :q_id")
        q_row = self.db.execute(q_query, {"q_id": current_q_id}).fetchone()
        if not q_row:
            raise HTTPException(status_code=404, detail="Original question metadata not found")

        lo_id, q_type, difficulty = q_row

        # 3. Find all existing question IDs in this exam to avoid duplicates
        existing_qs_query = text("SELECT question_id FROM exam_questions WHERE exam_id = :exam_id")
        existing_qs = [r[0] for r in self.db.execute(existing_qs_query, {"exam_id": exam_id}).fetchall()]

        # 4. Find an alternative question matching the exact criteria
        alt_query = text("""
            SELECT id FROM questions
            WHERE course_id = :course_id
              AND learning_outcome_id = :lo_id
              AND question_type = :q_type
              AND difficulty = :difficulty
              AND status = 'approved'
              AND id != ALL(:existing_qs)
            ORDER BY RANDOM()
            LIMIT 1
        """)

        alt_row = self.db.execute(alt_query, {
            "course_id": exam.course_id,
            "lo_id": lo_id,
            "q_type": q_type,
            "difficulty": difficulty,
            "existing_qs": existing_qs
        }).fetchone()

        if not alt_row:
            raise HTTPException(status_code=400, detail="No alternative question available matching these criteria")

        new_q_id = alt_row[0]

        # 5. Update exam_questions with the new question ID
        update_query = text("UPDATE exam_questions SET question_id = :new_q_id WHERE id = :eq_id")
        self.db.execute(update_query, {"new_q_id": new_q_id, "eq_id": eq_id})
        self.db.commit()

        return {"message": "Question swapped successfully", "new_question_id": new_q_id}
