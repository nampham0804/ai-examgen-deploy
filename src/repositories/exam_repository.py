from sqlalchemy.orm import Session
from src.models.exam import ExamBlueprint, ExamBlueprintItem
from src.schemas.blueprint import BlueprintCreate, BlueprintUpdate

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

    def update_blueprint(self, blueprint_id: int, blueprint_update: BlueprintUpdate, total_questions: int = None):
        db_blueprint = self.get_blueprint_by_id(blueprint_id)
        if db_blueprint:
            if blueprint_update.title is not None:
                db_blueprint.title = blueprint_update.title
            if blueprint_update.status is not None:
                db_blueprint.status = blueprint_update.status
            if total_questions is not None:
                db_blueprint.total_questions = total_questions
            
            if blueprint_update.items is not None:
                # Remove old items
                self.db.query(ExamBlueprintItem).filter(ExamBlueprintItem.blueprint_id == blueprint_id).delete()
                
                # Add new items
                for item in blueprint_update.items:
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

    def delete_blueprint(self, blueprint_id: int):
        db_blueprint = self.get_blueprint_by_id(blueprint_id)
        if db_blueprint:
            self.db.delete(db_blueprint)
            self.db.commit()
            return True
        return False
