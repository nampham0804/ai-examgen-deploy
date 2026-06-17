from sqlalchemy.orm import Session
from src.database.exam_db import ExamBlueprint, ExamBlueprintItem
from src.models.blueprint import BlueprintCreate, BlueprintUpdate

class ExamRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_blueprint(self, blueprint_in: BlueprintCreate, total_questions: int) -> ExamBlueprint:
        db_blueprint = ExamBlueprint(
            course_id=blueprint_in.course_id,
            title=blueprint_in.title,
            total_questions=total_questions,
            status="draft"
        )
        self.db.add(db_blueprint)
        self.db.commit()
        self.db.refresh(db_blueprint)

        for item in blueprint_in.items:
            db_item = ExamBlueprintItem(
                blueprint_id=db_blueprint.id,
                learning_outcome_id=item.learning_outcome_id,
                question_type=item.question_type,
                easy_count=item.easy_count,
                medium_count=item.medium_count,
                hard_count=item.hard_count
            )
            self.db.add(db_item)
        
        self.db.commit()
        self.db.refresh(db_blueprint)
        return db_blueprint

    def get_blueprints_by_course(self, course_id: int):
        return self.db.query(ExamBlueprint).filter(ExamBlueprint.course_id == course_id).all()

    def get_blueprint_by_id(self, blueprint_id: int):
        return self.db.query(ExamBlueprint).filter(ExamBlueprint.id == blueprint_id).first()

    def update_blueprint(self, blueprint_id: int, blueprint_update: BlueprintUpdate):
        db_blueprint = self.get_blueprint_by_id(blueprint_id)
        if db_blueprint:
            update_data = blueprint_update.model_dump(exclude_unset=True)
            for key, value in update_data.items():
                setattr(db_blueprint, key, value)
            self.db.commit()
            self.db.refresh(db_blueprint)
        return db_blueprint

    def delete_blueprint(self, blueprint_id: int):
        db_blueprint = self.get_blueprint_by_id(blueprint_id)
        if db_blueprint:
            self.db.delete(db_blueprint)
            self.db.commit()
            return True
        return False
