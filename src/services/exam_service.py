from sqlalchemy.orm import Session
from src.repositories.exam_repository import ExamRepository
from src.models.blueprint import BlueprintCreate, BlueprintUpdate
from fastapi import HTTPException

class ExamService:
    def __init__(self, db: Session):
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
        blueprint = self.repo.update_blueprint(blueprint_id, blueprint_update)
        if not blueprint:
            raise HTTPException(status_code=404, detail="Blueprint not found")
        return blueprint

    def delete_blueprint(self, blueprint_id: int):
        success = self.repo.delete_blueprint(blueprint_id)
        if not success:
            raise HTTPException(status_code=404, detail="Blueprint not found")
        return True
