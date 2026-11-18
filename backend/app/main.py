import time
import subprocess
import tempfile
import os
import sys

# Ensure backend/app directory is in python module search path
sys.path.insert(0, os.path.dirname(__file__))

from typing import Dict, Any, List, Optional
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session

from db import init_db, get_db
from models import Program, UserSession
from compiler import compile_c_code
from tracer import CVisualTracer
from ai_assistant import AIAssistant

app = FastAPI(
    title="C Visual Lab Backend API",
    description="Real C compiler, execution tracer, memory visualizer, and educational platform.",
    version="1.0.0"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

tracer = CVisualTracer()

@app.on_event("startup")
def on_startup():
    init_db()

# --- Request / Response Models ---
class CodePayload(BaseModel):
    code: str
    stdin: Optional[str] = ""

class ProgramCreate(BaseModel):
    title: str
    category: Optional[str] = "general"
    description: Optional[str] = ""
    code: str

class ProgramUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    code: Optional[str] = None

class SessionUpdate(BaseModel):
    last_program_id: Optional[int] = None
    execution_mode: Optional[str] = None
    current_code: Optional[str] = None
    animation_speed: Optional[str] = None

class AIQuestionPayload(BaseModel):
    question: str
    code: str
    current_step: Optional[Dict[str, Any]] = None
    runtime_error: Optional[str] = None
    api_key: Optional[str] = None

# --- API Endpoints ---

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "C Visual Lab",
        "timestamp": time.time()
    }

@app.post("/api/compile")
def compile_endpoint(payload: CodePayload):
    """Compiles C code using Clang and returns compiler errors and warnings."""
    result = compile_c_code(payload.code)
    return result

@app.post("/api/trace")
def trace_endpoint(payload: CodePayload):
    """
    Performs full compilation and instrumented execution to generate
    visual execution steps, memory snapshots, and explanations.
    """
    # First check if code has compile errors
    comp_check = compile_c_code(payload.code)
    if not comp_check["success"]:
        return {
            "success": False,
            "compile_failed": True,
            "error": "Compilation failed. Check compiler diagnostics.",
            "diagnostics": comp_check["diagnostics"],
            "raw_output": comp_check["raw_output"],
            "steps": []
        }

    # Execute instrumented tracing
    trace_res = tracer.instrument_and_trace(payload.code, stdin_data=payload.stdin or "")
    trace_res["compile_failed"] = False
    trace_res["diagnostics"] = comp_check["diagnostics"]
    return trace_res

@app.post("/api/run")
def raw_run_endpoint(payload: CodePayload):
    """
    Directly compiles and runs C code for raw execution speed and console output.
    """
    start_time = time.time()
    with tempfile.TemporaryDirectory() as td:
        src_path = os.path.join(td, "main.c")
        bin_path = os.path.join(td, "main")

        with open(src_path, "w", encoding="utf-8") as f:
            f.write(payload.code)

        comp = subprocess.run(
            ["clang", "-Wall", "-Wextra", "-std=c11", "-O0", src_path, "-o", bin_path],
            capture_output=True,
            text=True,
            timeout=10
        )
        if comp.returncode != 0:
            return {
                "success": False,
                "compile_failed": True,
                "stdout": "",
                "stderr": comp.stderr,
                "exit_code": comp.returncode,
                "execution_time_ms": round((time.time() - start_time) * 1000, 2)
            }

        try:
            run_proc = subprocess.run(
                [bin_path],
                input=payload.stdin or "",
                capture_output=True,
                text=True,
                timeout=5,
                cwd=td
            )
            elapsed = round((time.time() - start_time) * 1000, 2)
            return {
                "success": (run_proc.returncode == 0),
                "compile_failed": False,
                "stdout": run_proc.stdout,
                "stderr": run_proc.stderr,
                "exit_code": run_proc.returncode,
                "execution_time_ms": elapsed
            }
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "compile_failed": False,
                "stdout": "",
                "stderr": "Execution timed out (5s limit). Infinite loop detected.",
                "exit_code": -1,
                "execution_time_ms": 5000.0
            }
        except Exception as e:
            return {
                "success": False,
                "compile_failed": False,
                "stdout": "",
                "stderr": str(e),
                "exit_code": -1,
                "execution_time_ms": 0
            }

# --- Program Management Endpoints ---

@app.get("/api/programs")
def get_programs(category: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Program)
    if category and category != "all":
        query = query.filter(Program.category == category)
    progs = query.order_by(Program.is_template.desc(), Program.id.asc()).all()
    return [p.to_dict() for p in progs]

@app.get("/api/programs/{prog_id}")
def get_program(prog_id: int, db: Session = Depends(get_db)):
    prog = db.query(Program).filter(Program.id == prog_id).first()
    if not prog:
        raise HTTPException(status_code=404, detail="Program not found")
    return prog.to_dict()

@app.post("/api/programs")
def create_program(payload: ProgramCreate, db: Session = Depends(get_db)):
    prog = Program(
        title=payload.title,
        category=payload.category or "general",
        description=payload.description or "",
        code=payload.code,
        is_template=False
    )
    db.add(prog)
    db.commit()
    db.refresh(prog)
    return prog.to_dict()

@app.put("/api/programs/{prog_id}")
def update_program(prog_id: int, payload: ProgramUpdate, db: Session = Depends(get_db)):
    prog = db.query(Program).filter(Program.id == prog_id).first()
    if not prog:
        raise HTTPException(status_code=404, detail="Program not found")
    
    if payload.title is not None:
        prog.title = payload.title
    if payload.category is not None:
        prog.category = payload.category
    if payload.description is not None:
        prog.description = payload.description
    if payload.code is not None:
        prog.code = payload.code
        
    db.commit()
    db.refresh(prog)
    return prog.to_dict()

@app.delete("/api/programs/{prog_id}")
def delete_program(prog_id: int, db: Session = Depends(get_db)):
    prog = db.query(Program).filter(Program.id == prog_id).first()
    if not prog:
        raise HTTPException(status_code=404, detail="Program not found")
    if prog.is_template:
        raise HTTPException(status_code=400, detail="Cannot delete default educational templates")
    db.delete(prog)
    db.commit()
    return {"success": True, "deleted_id": prog_id}

# --- Session Persistence Endpoints ---

@app.get("/api/session")
def get_session(db: Session = Depends(get_db)):
    session = db.query(UserSession).first()
    if not session:
        return {
            "execution_mode": "combined",
            "current_code": "",
            "animation_speed": "1x"
        }
    return session.to_dict()

@app.post("/api/session")
def update_session(payload: SessionUpdate, db: Session = Depends(get_db)):
    session = db.query(UserSession).first()
    if not session:
        session = UserSession()
        db.add(session)

    if payload.last_program_id is not None:
        session.last_program_id = payload.last_program_id
    if payload.execution_mode is not None:
        session.execution_mode = payload.execution_mode
    if payload.current_code is not None:
        session.current_code = payload.current_code
    if payload.animation_speed is not None:
        session.animation_speed = payload.animation_speed

    db.commit()
    db.refresh(session)
    return session.to_dict()

# --- AI Learning Assistant Endpoint ---

@app.post("/api/ai/ask")
async def ask_ai(payload: AIQuestionPayload):
    assistant = AIAssistant(api_key=payload.api_key)
    res = await assistant.answer_question(
        question=payload.question,
        code=payload.code,
        current_step=payload.current_step,
        runtime_error=payload.runtime_error
    )
    return res
