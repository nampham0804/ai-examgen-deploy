from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import relationship

from src.repositories.database import Base


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


class Exam(Base):
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, index=True)
    blueprint_id = Column(Integer, ForeignKey("exam_blueprints.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    duration_minutes = Column(Integer, default=60)
    total_questions = Column(Integer, default=0)
    status = Column(String(50), default='draft') # draft, generated
    created_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    blueprint = relationship("ExamBlueprint")
    questions = relationship("ExamQuestion", back_populates="exam", cascade="all, delete-orphan", order_by="ExamQuestion.order_index")


class ExamQuestion(Base):
    __tablename__ = "exam_questions"
    __table_args__ = (
        UniqueConstraint('exam_id', 'question_id', name='uq_exam_question'),
    )

    id = Column(Integer, primary_key=True, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False)
    criteria_id = Column(Integer, ForeignKey("exam_blueprint_items.id", ondelete="SET NULL"), nullable=True)
    order_index = Column(Integer, default=0)

    exam = relationship("Exam", back_populates="questions")
    question = relationship("Question")
    criteria = relationship("ExamBlueprintItem")
