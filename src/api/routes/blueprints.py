
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.api.deps import get_current_user, get_db
from src.models.user import User
from src.schemas.blueprint import (
    BlueprintCreate,
    BlueprintListResponse,
    BlueprintResponse,
    BlueprintUpdate,
    ValidationResultResponse,
)
from src.services.exam_service import ExamService

router = APIRouter(prefix="/blueprints", tags=["blueprints"])


@router.post("", response_model=BlueprintResponse)
def create_blueprint(blueprint_in: BlueprintCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = ExamService(db)
    blueprint = service.create_blueprint(blueprint_in, current_user.id)
    return {"data": blueprint, "message": "Blueprint created successfully"}


@router.get("", response_model=BlueprintListResponse)
def get_blueprints(course_id: int | None = None, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = ExamService(db)
    blueprints = service.get_blueprints(course_id, current_user.id)
    return {"data": blueprints, "message": "Blueprints retrieved successfully"}


@router.get("/{blueprint_id}", response_model=BlueprintResponse)
def get_blueprint(blueprint_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = ExamService(db)
    blueprint = service.get_blueprint_by_id(blueprint_id, current_user.id)
    return {"data": blueprint, "message": "Blueprint retrieved successfully"}


@router.put("/{blueprint_id}", response_model=BlueprintResponse)
def update_blueprint(blueprint_id: int, blueprint_update: BlueprintUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = ExamService(db)
    blueprint = service.update_blueprint(blueprint_id, blueprint_update, current_user.id)
    return {"data": blueprint, "message": "Blueprint updated successfully"}


@router.delete("/{blueprint_id}")
def delete_blueprint(blueprint_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = ExamService(db)
    service.delete_blueprint(blueprint_id, current_user.id)
    return {"data": {}, "message": "Blueprint deleted successfully"}


@router.post("/{blueprint_id}/validate", response_model=ValidationResultResponse)
def validate_blueprint(blueprint_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = ExamService(db)
    validation_result = service.validate_blueprint(blueprint_id, update_status=True, user_id=current_user.id)
    return {"data": validation_result, "message": "Blueprint validation completed"}


@router.get("/{blueprint_id}/eligibility", response_model=ValidationResultResponse)
def check_eligibility(blueprint_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    service = ExamService(db)
    validation_result = service.validate_blueprint(blueprint_id, update_status=False, user_id=current_user.id)
    return {"data": validation_result, "message": "Blueprint eligibility check completed"}
