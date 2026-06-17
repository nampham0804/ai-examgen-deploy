from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional

from src.api.deps import get_db
from src.services.exam_service import ExamService
from src.models.blueprint import (
    BlueprintCreate, 
    BlueprintUpdate, 
    BlueprintResponse, 
    BlueprintListResponse
)

router = APIRouter(prefix="/blueprints", tags=["blueprints"])

@router.post("", response_model=BlueprintResponse)
def create_blueprint(blueprint_in: BlueprintCreate, db: Session = Depends(get_db)):
    service = ExamService(db)
    blueprint = service.create_blueprint(blueprint_in)
    return {"data": blueprint, "message": "Blueprint created successfully"}

@router.get("", response_model=BlueprintListResponse)
def get_blueprints(course_id: Optional[int] = None, db: Session = Depends(get_db)):
    service = ExamService(db)
    if course_id is not None:
        blueprints = service.get_blueprints_by_course(course_id)
    else:
        # In a real app, you might want to paginate or return all
        blueprints = [] 
    return {"data": blueprints, "message": "Blueprints retrieved successfully"}

@router.get("/{blueprint_id}", response_model=BlueprintResponse)
def get_blueprint(blueprint_id: int, db: Session = Depends(get_db)):
    service = ExamService(db)
    blueprint = service.get_blueprint_by_id(blueprint_id)
    return {"data": blueprint, "message": "Blueprint retrieved successfully"}

@router.put("/{blueprint_id}", response_model=BlueprintResponse)
def update_blueprint(blueprint_id: int, blueprint_update: BlueprintUpdate, db: Session = Depends(get_db)):
    service = ExamService(db)
    blueprint = service.update_blueprint(blueprint_id, blueprint_update)
    return {"data": blueprint, "message": "Blueprint updated successfully"}

@router.delete("/{blueprint_id}")
def delete_blueprint(blueprint_id: int, db: Session = Depends(get_db)):
    service = ExamService(db)
    service.delete_blueprint(blueprint_id)
    return {"data": {}, "message": "Blueprint deleted successfully"}
