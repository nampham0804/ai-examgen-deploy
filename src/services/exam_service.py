import json

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from src.repositories.exam_repository import ExamRepository
from src.schemas.blueprint import BlueprintCreate, BlueprintUpdate, ValidationDetail, ValidationResultData
from src.schemas.exam_schema import ExamCreate, ExamPreviewData, ExamPreviewQuestion, ExamUpdate


class ExamService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ExamRepository(db)

    def _serialize_options(self, options):
        if options is None:
            return None
        if isinstance(options, str):
            return options
        return json.dumps(options, ensure_ascii=False)

    def _parse_options(self, options):
        if not options:
            return None
        try:
            parsed_options = json.loads(options) if isinstance(options, str) else options
        except Exception:
            parsed_options = []
        if parsed_options and isinstance(parsed_options[0], dict):
            return [option.get("text", "") for option in parsed_options]
        return parsed_options

    def _snapshot_from_question_row(self, row):
        return {
            "question_id": row.id,
            "snapshot_question_text": row.question_text,
            "snapshot_question_type": row.question_type,
            "snapshot_difficulty": row.difficulty,
            "snapshot_learning_outcome_code": row.learning_outcome_code,
            "snapshot_options": self._serialize_options(row.options),
            "snapshot_correct_answer": row.correct_answer,
            "snapshot_suggested_answer": row.suggested_answer,
            "snapshot_grading_rubric": row.grading_rubric,
            "snapshot_explanation": row.explanation,
        }

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

    def validate_blueprint(self, blueprint_id: int, update_status: bool = True) -> ValidationResultData:
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

        if all_valid and update_status:
            # Update status to validated
            blueprint_update = BlueprintUpdate(status="validated")
            self.repo.update_blueprint(blueprint_id, blueprint_update)

        return ValidationResultData(is_valid=all_valid, total_required=total_required, details=details)

    # Exam methods
    def create_exam(self, exam_in: ExamCreate):
        if not exam_in.title.strip():
            raise HTTPException(status_code=422, detail="Exam title is required")
        if exam_in.duration_minutes <= 0:
            raise HTTPException(status_code=422, detail="Exam duration must be greater than 0")
        return self.repo.create_exam(exam_in)

    def get_exams_by_course(self, course_id: int):
        return self._fetch_exams_with_details("WHERE e.course_id = :course_id", {"course_id": course_id})

    def get_all_exams(self):
        return self._fetch_exams_with_details("", {})

    def _fetch_exams_with_details(self, where_clause: str, params: dict):
        query = text(f"""
            SELECT e.*, c.name as course_name, b.title as blueprint_name
            FROM exams e
            LEFT JOIN courses c ON e.course_id = c.id
            LEFT JOIN exam_blueprints b ON e.blueprint_id = b.id
            {where_clause}
            ORDER BY e.id DESC
        """)
        results = self.db.execute(query, params).mappings().all()
        return [dict(row) for row in results]

    def delete_exam(self, exam_id: int):
        success = self.repo.delete_exam(exam_id)
        if not success:
            raise HTTPException(status_code=404, detail="Exam not found")
        return {"message": "Exam deleted successfully"}

    def get_exam_by_id(self, exam_id: int):
        exam = self.repo.get_exam_by_id(exam_id)
        if not exam:
            raise HTTPException(status_code=404, detail="Exam not found")
        return exam

    def update_exam(self, exam_id: int, exam_update: ExamUpdate):
        current_exam = self.get_exam_by_id(exam_id)
        if current_exam.status == "approved":
            changes = exam_update.model_dump(exclude_unset=True)
            allowed_noop_status = set(changes) == {"status"} and changes.get("status") == "approved"
            if changes and not allowed_noop_status:
                raise HTTPException(status_code=400, detail="Approved exams cannot be modified")
        if exam_update.title is not None and not exam_update.title.strip():
            raise HTTPException(status_code=422, detail="Exam title is required")
        if exam_update.duration_minutes is not None and exam_update.duration_minutes <= 0:
            raise HTTPException(status_code=422, detail="Exam duration must be greater than 0")
        exam = self.repo.update_exam(exam_id, exam_update)
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

        selected_questions_info = []

        # Iterate over blueprint items and pick random questions matching the requirements
        for item in blueprint.items:
            for difficulty, count in [
                ("easy", item.easy_count),
                ("medium", item.medium_count),
                ("hard", item.hard_count),
            ]:
                if count > 0:
                    query = text("""
                        SELECT
                            q.id,
                            q.question_text,
                            q.question_type,
                            q.difficulty,
                            q.options,
                            q.correct_answer,
                            q.suggested_answer,
                            q.grading_rubric,
                            q.explanation,
                            lo.code as learning_outcome_code
                        FROM questions q
                        LEFT JOIN learning_outcomes lo ON q.learning_outcome_id = lo.id
                        WHERE q.course_id = :course_id
                          AND q.learning_outcome_id = :lo_id
                          AND q.question_type = :q_type
                          AND q.difficulty = :difficulty
                          AND q.status = 'approved'
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

                    for row in results:
                        selected_questions_info.append(
                            {**self._snapshot_from_question_row(row), "criteria_id": item.id}
                        )

        # Save the selected questions to exam_questions
        self.repo.add_exam_questions(exam_id, selected_questions_info)

        # Update exam status and total questions
        updated_exam = self.repo.update_exam_status(exam_id, "draft", len(selected_questions_info))
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
                COALESCE(eq.snapshot_question_text, q.question_text) as text,
                COALESCE(eq.snapshot_question_type, q.question_type) as type,
                COALESCE(eq.snapshot_difficulty, q.difficulty) as difficulty,
                lo.code as lo_code,
                COALESCE(eq.snapshot_learning_outcome_code, lo.code) as snapshot_lo_code,
                COALESCE(eq.snapshot_options, CAST(q.options AS TEXT)) as options,
                COALESCE(eq.snapshot_correct_answer, q.correct_answer) as correct_answer,
                COALESCE(eq.snapshot_suggested_answer, q.suggested_answer) as suggested_answer,
                COALESCE(eq.snapshot_grading_rubric, q.grading_rubric) as grading_rubric,
                COALESCE(eq.snapshot_explanation, q.explanation) as explanation
            FROM exam_questions eq
            LEFT JOIN questions q ON eq.question_id = q.id
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
            questions.append(
                ExamPreviewQuestion(
                    id=row.eq_id,
                    exam_id=exam_id,
                    question_id=row.question_id,
                    order_index=row.order_index,
                    text=row.text or "Question text unavailable",
                    type=row.type,
                    difficulty=row.difficulty,
                    learning_outcome_code=row.snapshot_lo_code or row.lo_code or "LO",
                    options=self._parse_options(row.options),
                    correct_answer=row.correct_answer,
                    sample_answer=row.suggested_answer,
                    rubric=row.grading_rubric,
                    explanation=row.explanation,
                )
            )

        return ExamPreviewData(
            id=exam.id,
            title=exam.title,
            course_name=course_name,
            duration_minutes=exam.duration_minutes,
            total_questions=exam.total_questions,
            status=exam.status,
            questions=questions,
        )

    def swap_exam_question(self, exam_id: int, question_id: int):
        exam = self.get_exam_by_id(exam_id)
        if exam.status == "approved":
            raise HTTPException(status_code=400, detail="Approved exams cannot be modified")

        # 1. Find the existing exam_question to know what to replace
        eq_query = text(
            "SELECT id, question_id, order_index, criteria_id FROM exam_questions "
            "WHERE exam_id = :exam_id AND question_id = :question_id"
        )
        eq_row = self.db.execute(eq_query, {"exam_id": exam_id, "question_id": question_id}).fetchone()

        if not eq_row:
            raise HTTPException(status_code=404, detail="Question not found in this exam")

        eq_id, current_q_id, _order_idx, criteria_id = eq_row

        if not criteria_id:
            raise HTTPException(status_code=400, detail="Question cannot be swapped because it has no criteria_id")

        # 2. Get properties from the current question instead of blueprint criteria directly
        # because exam_blueprint_items doesn't store difficulty directly for a specific question slot.
        q_query = text("SELECT learning_outcome_id, question_type, difficulty FROM questions WHERE id = :q_id")
        c_row = self.db.execute(q_query, {"q_id": current_q_id}).fetchone()
        if not c_row:
            raise HTTPException(status_code=404, detail="Original question properties not found")

        lo_id, q_type, difficulty = c_row

        # 3. Find all existing question IDs in this exam to avoid duplicates
        existing_qs_query = text("SELECT question_id FROM exam_questions WHERE exam_id = :exam_id")
        existing_qs = [r[0] for r in self.db.execute(existing_qs_query, {"exam_id": exam_id}).fetchall()]
        existing_qs_tuple = tuple(existing_qs) if existing_qs else (-1,)

        # 4. Find an alternative question matching the exact criteria
        alt_query = text("""
            SELECT
                q.id,
                q.question_text,
                q.question_type,
                q.difficulty,
                q.options,
                q.correct_answer,
                q.suggested_answer,
                q.grading_rubric,
                q.explanation,
                lo.code as learning_outcome_code
            FROM questions q
            LEFT JOIN learning_outcomes lo ON q.learning_outcome_id = lo.id
            WHERE q.course_id = :course_id
              AND q.learning_outcome_id = :lo_id
              AND q.question_type = :q_type
              AND q.difficulty = :difficulty
              AND q.status = 'approved'
              AND q.id NOT IN :existing_qs
            ORDER BY RANDOM()
            LIMIT 1
        """)

        alt_row = self.db.execute(alt_query, {
            "course_id": exam.course_id,
            "lo_id": lo_id,
            "q_type": q_type,
            "difficulty": difficulty,
            "existing_qs": existing_qs_tuple
        }).fetchone()

        if not alt_row:
            raise HTTPException(status_code=400, detail="Không còn câu hỏi tương tự trong Ngân hàng đề đáp ứng điều kiện. Vui lòng bổ sung thêm câu hỏi mới.")

        snapshot = self._snapshot_from_question_row(alt_row)

        # 5. Update exam_questions with the new question ID
        update_query = text("""
            UPDATE exam_questions
            SET question_id = :question_id,
                snapshot_question_text = :snapshot_question_text,
                snapshot_question_type = :snapshot_question_type,
                snapshot_difficulty = :snapshot_difficulty,
                snapshot_learning_outcome_code = :snapshot_learning_outcome_code,
                snapshot_options = :snapshot_options,
                snapshot_correct_answer = :snapshot_correct_answer,
                snapshot_suggested_answer = :snapshot_suggested_answer,
                snapshot_grading_rubric = :snapshot_grading_rubric,
                snapshot_explanation = :snapshot_explanation
            WHERE id = :eq_id
        """)
        self.db.execute(update_query, {**snapshot, "eq_id": eq_id})
        self.db.commit()

        return {"message": "Question swapped successfully", "new_question_id": snapshot["question_id"]}

    def reorder_exam(self, exam_id: int, items: list[dict]):
        exam = self.get_exam_by_id(exam_id)
        if exam.status == "approved":
            raise HTTPException(status_code=400, detail="Approved exams cannot be reordered")

        # Build cases for bulk update
        when_cases = []
        item_ids = []
        for item in items:
            when_cases.append(f"WHEN id = {item['id']} THEN {item['order_index']}")
            item_ids.append(item['id'])

        if not item_ids:
            return {"message": "No items to reorder"}

        ids_str = ",".join(map(str, item_ids))
        when_str = " ".join(when_cases)

        query = text(f"""
            UPDATE exam_questions
            SET order_index = CASE
                {when_str}
            END
            WHERE id IN ({ids_str}) AND exam_id = :exam_id
        """)

        self.db.execute(query, {"exam_id": exam_id})
        self.db.commit()

        return {"message": "Exam reordered successfully"}
