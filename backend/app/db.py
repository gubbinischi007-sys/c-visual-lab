import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from models import Base, Program, UserSession

DB_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "c_visual_lab.db")
DATABASE_URL = f"sqlite:///{DB_FILE}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

DEFAULT_STARTER_CODE = """#include <stdio.h>
#include <stdlib.h>

int main() {
    // Write your C program here
    
    return 0;
}
"""

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initializes tables without predefined templates so students can use their own logic."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Clean up any previously seeded templates so students start with a clean slate
        db.query(Program).filter(Program.is_template == True).delete()
        db.commit()

        # Check or create default user session
        session = db.query(UserSession).first()
        if not session:
            default_session = UserSession(
                last_program_id=None,
                execution_mode="combined",
                current_code=DEFAULT_STARTER_CODE,
                animation_speed="1x"
            )
            db.add(default_session)
            db.commit()
    finally:
        db.close()
