import os
import re
import json
import subprocess
import tempfile
import clang.cindex
from typing import Dict, Any, List, Optional, Set, Tuple
try:
    from app.explainer import generate_step_explanation
except ImportError:
    from explainer import generate_step_explanation

CVL_RUNTIME_DIR = os.path.join(os.path.dirname(__file__), "tracer_runtime")

class CVisualTracer:
    def __init__(self):
        self.index = clang.cindex.Index.create()

    def instrument_and_trace(self, source_code: str, stdin_data: str = "") -> Dict[str, Any]:
        """
        Instruments any user-written C code, compiles with cvl_runtime,
        executes it, and parses the resulting trace into enriched steps.
        Supports arbitrary struct definitions, global/local variables,
        function calls, loops, and recursion.
        """
        structs_info = self._extract_structs(source_code)
        globals_info, locals_info = self._extract_variables(source_code)
        funcs_info = self._extract_functions(source_code)

        instrumented_code = self._instrument_code(
            source_code,
            structs_info,
            globals_info,
            locals_info,
            funcs_info
        )

        with tempfile.TemporaryDirectory() as td:
            src_file = os.path.join(td, "instrumented.c")
            bin_file = os.path.join(td, "cvl_exec")
            trace_json_path = os.path.join(td, "trace.json")
            runtime_c = os.path.join(CVL_RUNTIME_DIR, "cvl_runtime.c")

            with open(src_file, "w", encoding="utf-8") as f:
                f.write(instrumented_code)

            cmd = [
                "clang",
                "-O0",
                "-g",
                f"-I{CVL_RUNTIME_DIR}",
                src_file,
                runtime_c,
                "-o",
                bin_file
            ]
            comp_res = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            if comp_res.returncode != 0:
                return {
                    "success": False,
                    "error": f"Instrumented compilation failed:\n{comp_res.stderr}",
                    "steps": [],
                    "summary": {}
                }

            try:
                run_res = subprocess.run(
                    [bin_file],
                    input=stdin_data,
                    capture_output=True,
                    text=True,
                    timeout=5,
                    cwd=td
                )
            except subprocess.TimeoutExpired:
                return {
                    "success": False,
                    "error": "Execution timed out (5s limit). Possible infinite loop in your C code.",
                    "steps": [],
                    "summary": {"timeout": True}
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": f"Execution error: {str(e)}",
                    "steps": [],
                    "summary": {}
                }

            if not os.path.exists(trace_json_path):
                return {
                    "success": False,
                    "error": f"No trace generated. Output:\n{run_res.stderr}\n{run_res.stdout}",
                    "steps": [],
                    "summary": {}
                }

            raw_steps = []
            raw_summary = {}
            parse_error = None

            # 1. Parse line-delimited JSON (JSONL) records
            try:
                with open(trace_json_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line:
                            continue
                        candidate = line[:-1].strip() if line.endswith(",") else line
                        try:
                            item = json.loads(candidate)
                            if isinstance(item, dict):
                                if item.get("event") == "step" or "line" in item:
                                    raw_steps.append(item)
                                elif item.get("event") == "summary" or "total_steps" in item:
                                    raw_summary = item
                        except Exception:
                            continue
            except Exception as e:
                parse_error = str(e)

            # 2. Fallback to monolithic JSON if line-by-line didn't find records
            if not raw_steps and not raw_summary:
                try:
                    with open(trace_json_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        if isinstance(data, dict):
                            raw_steps = data.get("steps", [])
                            raw_summary = data.get("summary", {})
                except Exception as e:
                    parse_error = str(e)
                    # 3. Resilient recovery: extract all complete JSON objects if stream was interrupted
                    try:
                        with open(trace_json_path, "r", encoding="utf-8") as f:
                            content = f.read()
                        matches = re.finditer(r'\{[^{}]*"step"\s*:\s*\d+.*?\}', content, re.DOTALL)
                        for m in matches:
                            try:
                                obj = json.loads(m.group(0))
                                raw_steps.append(obj)
                            except Exception:
                                pass
                    except Exception:
                        pass

            if not raw_steps and parse_error:
                return {
                    "success": False,
                    "error": f"Failed to parse trace data: {parse_error}",
                    "steps": [],
                    "summary": {}
                }

            if not raw_summary:
                raw_summary = {
                    "total_steps": len(raw_steps),
                    "exit_code": run_res.returncode,
                    "leak_count": 0,
                    "leaked_bytes": 0,
                    "has_error": False
                }

            enriched_steps = self._enrich_steps(raw_steps, structs_info, source_code)

            return {
                "success": True,
                "steps": enriched_steps,
                "summary": raw_summary,
                "stdout": run_res.stdout,
                "stderr": run_res.stderr
            }

    def _extract_structs(self, code: str) -> Dict[str, Any]:
        """Extracts struct declarations and fields with exact byte offsets using libclang."""
        structs = {}
        try:
            tu = self.index.parse("temp.c", args=["-std=c11"], unsaved_files=[("temp.c", code)])
            for cursor in tu.cursor.walk_preorder():
                if cursor.kind == clang.cindex.CursorKind.STRUCT_DECL and cursor.spelling:
                    fields = []
                    for field in cursor.get_children():
                        if field.kind == clang.cindex.CursorKind.FIELD_DECL:
                            canon = field.type.get_canonical()
                            is_ptr = (field.type.kind == clang.cindex.TypeKind.POINTER or canon.kind == clang.cindex.TypeKind.POINTER)
                            offset_bytes = field.get_field_offsetof() // 8 if field.get_field_offsetof() >= 0 else 0
                            size_bytes = field.type.get_size() if field.type.get_size() > 0 else (8 if is_ptr else 4)
                            fields.append({
                                "name": field.spelling,
                                "type": field.type.spelling,
                                "is_ptr": is_ptr,
                                "offset_bytes": offset_bytes,
                                "size_bytes": size_bytes
                            })
                    structs[cursor.spelling] = {
                        "name": cursor.spelling,
                        "fields": fields
                    }
        except Exception as e:
            print("Struct extraction error:", e)
        return structs

    def _extract_variables(self, code: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Extracts both global and local variables."""
        globals_info = []
        locals_info = []
        try:
            tu = self.index.parse("temp.c", args=["-std=c11"], unsaved_files=[("temp.c", code)])
            for cursor in tu.cursor.get_children():
                if cursor.kind == clang.cindex.CursorKind.VAR_DECL:
                    canon = cursor.type.get_canonical()
                    is_ptr = (cursor.type.kind == clang.cindex.TypeKind.POINTER or canon.kind == clang.cindex.TypeKind.POINTER)
                    struct_tag = ""
                    if "struct " in cursor.type.spelling:
                        m = re.search(r"struct\s+([A-Za-z0-9_]+)", cursor.type.spelling)
                        if m:
                            struct_tag = m.group(1)
                    if not struct_tag and canon.kind == clang.cindex.TypeKind.POINTER:
                        pointee = canon.get_pointee()
                        if "struct " in pointee.spelling:
                            m = re.search(r"struct\s+([A-Za-z0-9_]+)", pointee.spelling)
                            if m:
                                struct_tag = m.group(1)
                    globals_info.append({
                        "name": cursor.spelling,
                        "type": cursor.type.spelling,
                        "line": cursor.location.line,
                        "is_ptr": is_ptr,
                        "struct_tag": struct_tag
                    })

            for cursor in tu.cursor.walk_preorder():
                if cursor.kind == clang.cindex.CursorKind.VAR_DECL:
                    # If inside a function
                    if cursor.semantic_parent and cursor.semantic_parent.kind == clang.cindex.CursorKind.FUNCTION_DECL:
                        canon = cursor.type.get_canonical()
                        is_ptr = (cursor.type.kind == clang.cindex.TypeKind.POINTER or canon.kind == clang.cindex.TypeKind.POINTER)
                        struct_tag = ""
                        if "struct " in cursor.type.spelling:
                            m = re.search(r"struct\s+([A-Za-z0-9_]+)", cursor.type.spelling)
                            if m:
                                struct_tag = m.group(1)
                        if not struct_tag and canon.kind == clang.cindex.TypeKind.POINTER:
                            pointee = canon.get_pointee()
                            if "struct " in pointee.spelling:
                                m = re.search(r"struct\s+([A-Za-z0-9_]+)", pointee.spelling)
                                if m:
                                    struct_tag = m.group(1)
                        locals_info.append({
                            "name": cursor.spelling,
                            "type": cursor.type.spelling,
                            "line": cursor.location.line,
                            "is_ptr": is_ptr,
                            "struct_tag": struct_tag
                        })
        except Exception as e:
            print("Variable extraction error:", e)
        return globals_info, locals_info

    def _extract_functions(self, code: str) -> List[Dict[str, Any]]:
        """Extracts functions, parameter list, and statement line numbers."""
        funcs = []
        try:
            tu = self.index.parse("temp.c", args=["-std=c11"], unsaved_files=[("temp.c", code)])
            for cursor in tu.cursor.walk_preorder():
                if cursor.kind == clang.cindex.CursorKind.FUNCTION_DECL and cursor.is_definition():
                    stmt_lines = set()
                    params = []
                    for child in cursor.get_children():
                        if child.kind == clang.cindex.CursorKind.PARM_DECL:
                            canon = child.type.get_canonical()
                            is_ptr = (child.type.kind == clang.cindex.TypeKind.POINTER or canon.kind == clang.cindex.TypeKind.POINTER)
                            struct_tag = ""
                            if "struct " in child.type.spelling:
                                m = re.search(r"struct\s+([A-Za-z0-9_]+)", child.type.spelling)
                                if m:
                                    struct_tag = m.group(1)
                            if not struct_tag and canon.kind == clang.cindex.TypeKind.POINTER:
                                pointee = canon.get_pointee()
                                if "struct " in pointee.spelling:
                                    m = re.search(r"struct\s+([A-Za-z0-9_]+)", pointee.spelling)
                                    if m:
                                        struct_tag = m.group(1)
                            params.append({
                                "name": child.spelling,
                                "type": child.type.spelling,
                                "is_ptr": is_ptr,
                                "struct_tag": struct_tag
                            })

                    for child in cursor.walk_preorder():
                        if child.kind in [
                            clang.cindex.CursorKind.DECL_STMT,
                            clang.cindex.CursorKind.CALL_EXPR,
                            clang.cindex.CursorKind.BINARY_OPERATOR,
                            clang.cindex.CursorKind.COMPOUND_ASSIGNMENT_OPERATOR,
                            clang.cindex.CursorKind.UNARY_OPERATOR,
                            clang.cindex.CursorKind.RETURN_STMT,
                            clang.cindex.CursorKind.IF_STMT,
                            clang.cindex.CursorKind.FOR_STMT,
                            clang.cindex.CursorKind.WHILE_STMT,
                            clang.cindex.CursorKind.DO_STMT,
                            clang.cindex.CursorKind.SWITCH_STMT,
                            clang.cindex.CursorKind.CASE_STMT,
                            clang.cindex.CursorKind.DEFAULT_STMT,
                            clang.cindex.CursorKind.BREAK_STMT,
                            clang.cindex.CursorKind.CONTINUE_STMT
                        ]:
                            if child.location.line > 0:
                                stmt_lines.add(child.location.line)

                    funcs.append({
                        "name": cursor.spelling,
                        "start_line": cursor.extent.start.line,
                        "end_line": cursor.extent.end.line,
                        "is_main": (cursor.spelling == "main"),
                        "stmt_lines": stmt_lines,
                        "params": params
                    })
        except Exception as e:
            print("Function extraction error:", e)
        return funcs

    def _instrument_code(
        self,
        code: str,
        structs_info: Dict[str, Any],
        globals_info: List[Dict[str, Any]],
        locals_info: List[Dict[str, Any]],
        funcs_info: List[Dict[str, Any]]
    ) -> str:
        lines = code.splitlines()
        vars_by_line = {}
        for v in locals_info:
            vars_by_line.setdefault(v["line"], []).append(v)

        instrumented = []
        instrumented.append('#include "cvl_runtime.h"')
        instrumented.append("")

        line_to_func = {}
        for f in funcs_info:
            for l in range(f["start_line"], f["end_line"] + 1):
                line_to_func[l] = f

        entered_main_body = False
        entered_funcs = set()

        for idx, line in enumerate(lines):
            line_no = idx + 1
            stripped = line.strip()
            indent = " " * (len(line) - len(line.lstrip()))
            f = line_to_func.get(line_no)

            if not f:
                instrumented.append(line)
                continue

            # Handle main function entry
            if f["is_main"] and not entered_main_body:
                if "{" in line:
                    entered_main_body = True
                    instrumented.append(line)
                    instrumented.append('    __cvl_init("trace.json");')
                    # Register global variables
                    for g in globals_info:
                        v_type_enum = "CVL_TYPE_PTR" if g["is_ptr"] else ("CVL_TYPE_INT" if "int" in g["type"] else "CVL_TYPE_OTHER")
                        tag = g.get("struct_tag", "")
                        instrumented.append(
                            f'    __cvl_reg_var("{g["name"]}", "{g["type"]}", &{g["name"]}, sizeof({g["name"]}), {v_type_enum}, "{tag}");'
                        )
                    instrumented.append(f'    __cvl_step({line_no}, "// Program started");')
                    continue

            # Handle non-main function entry
            if not f["is_main"] and f["name"] not in entered_funcs:
                if "{" in line:
                    entered_funcs.add(f["name"])
                    instrumented.append(line)
                    instrumented.append(f'    __cvl_enter_func("{f["name"]}");')
                    # Register function parameters
                    for p in f.get("params", []):
                        v_type_enum = "CVL_TYPE_PTR" if p["is_ptr"] else ("CVL_TYPE_INT" if "int" in p["type"] else "CVL_TYPE_OTHER")
                        tag = p.get("struct_tag", "")
                        instrumented.append(
                            f'    __cvl_reg_var("{p["name"]}", "{p["type"]}", &{p["name"]}, sizeof({p["name"]}), {v_type_enum}, "{tag}");'
                        )
                    continue

            # Handle function closing brace / end
            if line_no == f["end_line"]:
                if f["is_main"]:
                    instrumented.append(f'{indent}__cvl_finish(0);')
                else:
                    instrumented.append(f'{indent}__cvl_exit_func("{f["name"]}");')
                instrumented.append(line)
                continue

            if stripped in ["{", "}", "{ }", "};"] or stripped.startswith("//") or stripped.startswith("/*") or stripped.startswith("*"):
                instrumented.append(line)
                continue

            # Function return
            if stripped.startswith("return"):
                instrumented.append(f'{indent}__cvl_step({line_no}, "{self._escape(stripped)}");')
                if f["is_main"]:
                    instrumented.append(f'{indent}__cvl_finish(0);')
                else:
                    instrumented.append(f'{indent}__cvl_exit_func("{f["name"]}");')
                instrumented.append(line)
                continue

            if line_no in f["stmt_lines"]:
                # Control flow statements: step on condition check
                if any(stripped.startswith(k) for k in ["for (", "for(", "while (", "while(", "if (", "if("]):
                    instrumented.append(f'{indent}__cvl_step({line_no}, "{self._escape(stripped)}");')
                    instrumented.append(line)
                    continue

                v_list = vars_by_line.get(line_no, [])

                # Check if this statement is an unbraced single-statement body of if/else/while/for
                prev_line = lines[idx - 1].strip() if idx > 0 else ""
                is_unbraced = (
                    prev_line and
                    (any(prev_line.startswith(k) for k in ["if (", "if(", "while (", "while(", "for (", "for("]) or prev_line == "else" or prev_line.startswith("else if")) and
                    not prev_line.endswith("{")
                )

                if is_unbraced:
                    instrumented.append(f'{indent}{{')
                    instrumented.append(f'{indent}    {stripped}')
                    for v in v_list:
                        v_type_enum = "CVL_TYPE_PTR" if v["is_ptr"] else ("CVL_TYPE_INT" if "int" in v["type"] else "CVL_TYPE_OTHER")
                        tag = v.get("struct_tag", "")
                        instrumented.append(
                            f'{indent}    __cvl_reg_var("{v["name"]}", "{v["type"]}", &{v["name"]}, sizeof({v["name"]}), {v_type_enum}, "{tag}");'
                        )
                    instrumented.append(f'{indent}    __cvl_step({line_no}, "{self._escape(stripped)}");')
                    instrumented.append(f'{indent}}}')
                else:
                    # Execute statement first, register newly created/assigned variables, then record micro-step state
                    instrumented.append(line)
                    for v in v_list:
                        v_type_enum = "CVL_TYPE_PTR" if v["is_ptr"] else ("CVL_TYPE_INT" if "int" in v["type"] else "CVL_TYPE_OTHER")
                        tag = v.get("struct_tag", "")
                        instrumented.append(
                            f'{indent}__cvl_reg_var("{v["name"]}", "{v["type"]}", &{v["name"]}, sizeof({v["name"]}), {v_type_enum}, "{tag}");'
                        )
                    instrumented.append(f'{indent}__cvl_step({line_no}, "{self._escape(stripped)}");')
            else:
                instrumented.append(line)

        return "\n".join(instrumented)

    def _escape(self, s: str) -> str:
        return s.replace('\\', '\\\\').replace('"', '\\"')

    def _enrich_steps(self, steps: List[Dict[str, Any]], structs_info: Dict[str, Any], source_code: str) -> List[Dict[str, Any]]:
        source_lines = source_code.splitlines()
        enriched = []

        HEAD_NAMES = {"head", "first", "start", "top", "front", "root", "phead", "list", "head_ref", "h", "l", "hdr", "headnode"}
        TAIL_NAMES = {"tail", "last", "rear", "end", "ptail"}

        # Select primary struct representing the linked list node
        primary_struct = None
        if structs_info:
            for s_name, s_info in structs_info.items():
                if any(f["is_ptr"] for f in s_info.get("fields", [])):
                    primary_struct = s_info
                    break
            if not primary_struct and len(structs_info) > 0:
                primary_struct = next(iter(structs_info.values()))

        for idx, step in enumerate(steps):
            line_no = step.get("line", 1)
            raw_code = source_lines[line_no - 1] if 0 < line_no <= len(source_lines) else step.get("code", "")

            variables = step.get("variables", [])
            heap_blocks = step.get("heap", [])
            heap_map = {b["address"]: b for b in heap_blocks}

            # Map addresses to pointer variable names pointing to them
            ptr_map = {}
            for v in variables:
                if v.get("is_pointer") and not v.get("is_null"):
                    val_hex = v.get("value_hex")
                    if val_hex:
                        ptr_map.setdefault(val_hex, []).append(v["name"])

            # 1. Parse all allocated heap blocks into structured LinkedListNodes
            nodes_by_addr = {}
            for b in heap_blocks:
                addr = b["address"]
                is_freed = b.get("is_freed", False)
                hex_bytes = b.get("hex_bytes", "")
                raw_words = b.get("raw_data", [])

                data_val = 0
                next_ptr = "NULL"
                prev_ptr = None

                # 1. Exact byte offset extraction using Clang AST struct definition
                parsed_exact = False
                if hex_bytes and primary_struct:
                    try:
                        mem_b = bytes.fromhex(hex_bytes)
                        for f in primary_struct.get("fields", []):
                            f_name = f["name"].lower()
                            off = f.get("offset_bytes", 0)
                            sz = f.get("size_bytes", 4)
                            if off + sz <= len(mem_b):
                                if f["is_ptr"]:
                                    ptr_int = int.from_bytes(mem_b[off : off + 8], "little")
                                    ptr_str = "NULL" if ptr_int == 0 else hex(ptr_int)
                                    if "prev" in f_name or "back" in f_name:
                                        prev_ptr = ptr_str
                                    else:
                                        next_ptr = ptr_str
                                else:
                                    if sz == 1:
                                        data_val = int.from_bytes(mem_b[off : off + 1], "little", signed=True)
                                    elif sz == 2:
                                        data_val = int.from_bytes(mem_b[off : off + 2], "little", signed=True)
                                    elif sz == 8:
                                        data_val = int.from_bytes(mem_b[off : off + 8], "little", signed=True)
                                    else:
                                        data_val = int.from_bytes(mem_b[off : off + 4], "little", signed=True)
                        parsed_exact = True
                    except Exception:
                        pass

                # Fallback to word-based extraction if exact struct parsing didn't occur
                if not parsed_exact and raw_words:
                    try:
                        if len(raw_words) >= 1:
                            w0_int = int(raw_words[0], 16)
                            data_val = (w0_int & 0xFFFFFFFF)
                            if data_val > 0x7FFFFFFF:
                                data_val -= 0x100000000
                        if len(raw_words) >= 2:
                            w1 = raw_words[1]
                            next_ptr = "NULL" if w1 == "0x0" else w1
                        if len(raw_words) >= 3:
                            w2 = raw_words[2]
                            prev_ptr = "NULL" if w2 == "0x0" else w2
                    except Exception:
                        pass

                pointers_attached = ptr_map.get(addr, [])
                is_head = any(p.lower() in HEAD_NAMES for p in pointers_attached)
                is_tail = any(p.lower() in TAIL_NAMES for p in pointers_attached)

                node_obj = {
                    "id": addr,
                    "address": addr,
                    "data": data_val,
                    "next": next_ptr,
                    "prev": prev_ptr,
                    "is_freed": is_freed,
                    "alloc_line": b.get("alloc_line"),
                    "pointers": pointers_attached,
                    "is_head": is_head,
                    "is_tail": is_tail,
                    "is_main_list": False,
                    "is_staged": False,
                    "chain_index": -1,
                    "highlight_field": None
                }
                nodes_by_addr[addr] = node_obj

            # 2. Determine head address
            head_var = next((v for v in variables if v["name"].lower() in HEAD_NAMES and v.get("is_pointer")), None)
            head_addr = head_var.get("value_hex") if (head_var and not head_var.get("is_null")) else None

            # Next targets: addresses pointed to by other active nodes
            next_targets = {n.get("next") for n in nodes_by_addr.values() if n.get("next") not in [None, "NULL"] and not n.get("is_freed")}

            if not head_addr:
                # Find any pointer variable pointing to a node that has in-degree == 0 from other nodes
                for v in variables:
                    if v.get("is_pointer") and not v.get("is_null"):
                        val = v.get("value_hex")
                        if val in nodes_by_addr and not nodes_by_addr[val].get("is_freed") and val not in next_targets:
                            head_addr = val
                            break

            if not head_addr:
                for addr, n in nodes_by_addr.items():
                    if n["is_head"] and not n["is_freed"]:
                        head_addr = addr
                        break

            # If still no head found (e.g. variable out of scope or custom name), find the head topologically:
            # Active candidate with in-degree 0 that starts the longest chain
            if not head_addr and nodes_by_addr:
                candidates = [addr for addr, n in nodes_by_addr.items() if not n.get("is_freed") and addr not in next_targets]
                best_head = None
                max_score = 0
                for cand in candidates:
                    chain_len = 0
                    curr = cand
                    seen_cand = set()
                    while curr and curr != "NULL" and curr in nodes_by_addr and not nodes_by_addr[curr].get("is_freed"):
                        if curr in seen_cand:
                            break
                        seen_cand.add(curr)
                        chain_len += 1
                        curr = nodes_by_addr[curr].get("next")
                    has_var = len(ptr_map.get(cand, [])) > 0
                    score = chain_len + (100 if has_var else 0)
                    if score > max_score:
                        max_score = score
                        best_head = cand
                if best_head:
                    head_addr = best_head

            if head_addr and head_addr in nodes_by_addr:
                nodes_by_addr[head_addr]["is_head"] = True

            # 3. Traverse Main Connected Chain from HEAD
            main_chain = []
            visited = set()
            has_cycle = False
            list_type = "singly"

            if head_addr and head_addr in nodes_by_addr and not nodes_by_addr[head_addr]["is_freed"]:
                curr_addr = head_addr
                while curr_addr and curr_addr != "NULL" and curr_addr in nodes_by_addr:
                    if curr_addr in visited:
                        has_cycle = True
                        list_type = "circular"
                        break
                    visited.add(curr_addr)
                    node = nodes_by_addr[curr_addr]
                    node["is_main_list"] = True
                    node["chain_index"] = len(main_chain)
                    main_chain.append(node)
                    curr_addr = node.get("next")

            # 4. Separate Staged (Unattached) Nodes & Freed Nodes
            staged_nodes = []
            freed_nodes = []
            for addr, n in nodes_by_addr.items():
                if n["is_freed"]:
                    freed_nodes.append(n)
                elif addr not in visited:
                    n["is_staged"] = True
                    n["chain_index"] = -1
                    staged_nodes.append(n)

            if any(n.get("prev") not in [None, "NULL"] for n in nodes_by_addr.values()):
                list_type = "doubly"

            # Ordered nodes for full visualizer display:
            # Main chain (in sequence) + Staged nodes + Freed nodes
            ll_nodes = main_chain + staged_nodes + freed_nodes

            # 5. Compute Micro-Step Diff against previous step
            prev_enriched = enriched[-1] if enriched else None
            diff_obj = None

            if prev_enriched:
                prev_nodes = {n["address"]: n for n in prev_enriched.get("linked_list", {}).get("nodes", [])}
                for n in ll_nodes:
                    addr = n["address"]
                    if addr not in prev_nodes:
                        n["highlight_field"] = "alloc"
                        diff_obj = {
                            "type": "heap_alloc",
                            "target": addr,
                            "before": "Unallocated",
                            "after": f"Node allocated at {addr}",
                            "description": f"New node allocated at {addr} on Heap."
                        }
                    elif n["is_freed"] and not prev_nodes.get(addr, {}).get("is_freed"):
                        n["highlight_field"] = "free"
                        diff_obj = {
                            "type": "heap_free",
                            "target": addr,
                            "before": f"Active node at {addr}",
                            "after": "FREED",
                            "description": f"Node at {addr} deallocated with free()."
                        }
                    elif addr in prev_nodes and n["data"] != prev_nodes[addr].get("data"):
                        n["highlight_field"] = "data"
                        n["before_data"] = prev_nodes[addr].get("data")
                        diff_obj = {
                            "type": "struct_field_assign",
                            "target": addr,
                            "before": str(prev_nodes[addr].get("data")),
                            "after": str(n["data"]),
                            "description": f"Node at {addr} data updated: {prev_nodes[addr].get('data')} ──▶ {n['data']}."
                        }
                    elif addr in prev_nodes and n["next"] != prev_nodes[addr].get("next"):
                        n["highlight_field"] = "next"
                        n["before_next"] = prev_nodes[addr].get("next")
                        diff_obj = {
                            "type": "ptr_assign",
                            "target": addr,
                            "before": str(prev_nodes[addr].get("next")),
                            "after": str(n["next"]),
                            "description": f"Node at {addr} next pointer updated: {prev_nodes[addr].get('next')} ──▶ {n['next']}."
                        }

            # 6. Generate Pedagogical Teaching Explanation
            explanation = generate_step_explanation(
                step_index=idx,
                line_no=line_no,
                code=raw_code.strip(),
                variables=variables,
                heap_blocks=heap_blocks,
                ll_nodes=ll_nodes,
                prev_step=prev_enriched,
                error=step.get("error")
            )

            step_dict = {
                "step_index": idx,
                "line": line_no,
                "code": raw_code.strip(),
                "func": step.get("func", "main"),
                "call_stack": step.get("call_stack", ["main"]),
                "variables": variables,
                "heap": heap_blocks,
                "linked_list": {
                    "nodes": ll_nodes,
                    "main_chain": main_chain,
                    "staged_nodes": staged_nodes,
                    "freed_nodes": freed_nodes,
                    "type": list_type,
                    "has_cycle": has_cycle
                },
                "diff": diff_obj,
                "stdout": step.get("stdout", ""),
                "stdout_delta": step.get("stdout_delta", ""),
                "error": step.get("error"),
                "explanation": explanation
            }
            enriched.append(step_dict)

        return enriched
