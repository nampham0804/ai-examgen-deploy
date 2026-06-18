from sqlalchemy.orm import Session
from sqlalchemy import text
from src.repositories.exam_repository import ExamRepository
from src.schemas.blueprint import BlueprintCreate, BlueprintUpdate, ValidationResultData, ValidationDetail
from fastapi import HTTPException

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
            
            e_avail = available.get((lo_id, q_type, 'easy'), 0)
            m_avail = available.get((lo_id, q_type, 'medium'), 0)
            h_avail = available.get((lo_id, q_type, 'hard'), 0)
            
            is_valid = (e_avail >= item.easy_count and 
                        m_avail >= item.medium_count and 
                        h_avail >= item.hard_count)
            
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
                
            details.append(ValidationDetail(
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
                missing=missing
            ))
            
        if all_valid:
            # Update status to validated
            blueprint_update = BlueprintUpdate(status='validated')
            self.repo.update_blueprint(blueprint_id, blueprint_update)
            
        return ValidationResultData(
            is_valid=all_valid,
            total_required=total_required,
            details=details
        )
