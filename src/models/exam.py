from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func, UniqueConstraint
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()

class ExamBlueprint(Base):
    __tablename__ = "exam_blueprints"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, index=True)
    title = Column(String(255), nullable=False)
    total_questions = Column(Integer, default=0)
    status = Column(String(50), default='draft')
    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    items = relationship("ExamBlueprintItem", back_populates="blueprint", cascade="all, delete-orphan")


class ExamBlueprintItem(Base):
    __tablename__ = "exam_blueprint_items"
    __table_args__ = (
        UniqueConstraint('blueprint_id', 'learning_outcome_id', 'question_type', name='uq_blueprint_item_lo_type'),
    )

    id = Column(Integer, primary_key=True, index=True)
    blueprint_id = Column(Integer, ForeignKey("exam_blueprints.id", ondelete="CASCADE"), nullable=False)
    learning_outcome_id = Column(Integer, nullable=False)
    question_type = Column(String(50), default='mcq')
    easy_count = Column(Integer, default=0)
    medium_count = Column(Integer, default=0)
    hard_count = Column(Integer, default=0)

    blueprint = relationship("ExamBlueprint", back_populates="items")
