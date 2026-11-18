from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class Program(Base):
    __tablename__ = "programs"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(128), nullable=False)
    description = Column(String(255), default="")
    category = Column(String(64), default="general")
    code = Column(Text, nullable=False)
    is_template = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "category": self.category,
            "code": self.code,
            "is_template": self.is_template,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

class UserSession(Base):
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    last_program_id = Column(Integer, nullable=True)
    execution_mode = Column(String(32), default="combined") # "auto", "step", "combined"
    current_code = Column(Text, nullable=True)
    animation_speed = Column(String(16), default="1x")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "last_program_id": self.last_program_id,
            "execution_mode": self.execution_mode,
            "current_code": self.current_code,
            "animation_speed": self.animation_speed,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
