import subprocess
import tempfile
import os
import re
from typing import List, Dict, Any, Optional

class CompilerDiagnostic:
    def __init__(self, line: int, col: int, severity: str, message: str):
        self.line = line
        self.col = col
        self.severity = severity  # "error", "warning", "note"
        self.message = message

    def to_dict(self) -> Dict[str, Any]:
        return {
            "line": self.line,
            "col": self.col,
            "severity": self.severity,
            "message": self.message
        }

def compile_c_code(code: str, compiler_flags: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Compiles real C code using Clang and captures compiler errors and warnings.
    """
    if compiler_flags is None:
        compiler_flags = ["-Wall", "-Wextra", "-std=c11", "-O0"]

    with tempfile.TemporaryDirectory() as td:
        src_path = os.path.join(td, "source.c")
        bin_path = os.path.join(td, "a.out")

        with open(src_path, "w", encoding="utf-8") as f:
            f.write(code)

        cmd = ["clang"] + compiler_flags + [src_path, "-o", bin_path]

        try:
            res = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=10
            )
            raw_output = res.stderr or res.stdout
            diagnostics = parse_clang_diagnostics(raw_output)

            return {
                "success": (res.returncode == 0),
                "return_code": res.returncode,
                "diagnostics": [d.to_dict() for d in diagnostics],
                "raw_output": raw_output
            }
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "return_code": -1,
                "diagnostics": [{
                    "line": 1,
                    "col": 1,
                    "severity": "error",
                    "message": "Compilation timed out after 10 seconds."
                }],
                "raw_output": "Compilation timed out after 10 seconds."
            }
        except Exception as e:
            return {
                "success": False,
                "return_code": -1,
                "diagnostics": [{
                    "line": 1,
                    "col": 1,
                    "severity": "error",
                    "message": str(e)
                }],
                "raw_output": str(e)
            }

def parse_clang_diagnostics(output: str) -> List[CompilerDiagnostic]:
    """
    Parses clang diagnostic lines like:
    source.c:12:5: error: expected ';' after expression
    source.c:14:10: warning: unused variable 'x' [-Wunused-variable]
    """
    diagnostics = []
    # Pattern: filename:line:col: severity: message
    pattern = re.compile(r"^.*?\.c:(\d+):(\d+):\s+(error|warning|fatal error|note):\s+(.*)$", re.MULTILINE)

    for match in pattern.finditer(output):
        line = int(match.group(1))
        col = int(match.group(2))
        raw_sev = match.group(3).lower()
        msg = match.group(4).strip()

        severity = "error" if "error" in raw_sev else ("warning" if "warning" in raw_sev else "note")
        diagnostics.append(CompilerDiagnostic(line, col, severity, msg))

    return diagnostics
