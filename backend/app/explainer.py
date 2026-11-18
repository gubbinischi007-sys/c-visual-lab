import re
from typing import Dict, Any, List, Optional

def generate_step_explanation(
    step_index: int,
    line_no: int,
    code: str,
    variables: List[Dict[str, Any]],
    heap_blocks: List[Dict[str, Any]],
    ll_nodes: List[Dict[str, Any]],
    prev_step: Optional[Dict[str, Any]] = None,
    error: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generates beginner-friendly educational explanations for every micro-step:
    - title: Clear, concise title of the operation
    - what_is_happening: Exactly what this C statement does
    - why_are_we_doing_this: The pedagogical purpose / algorithm role
    - memory_changes: What changed on Stack vs Heap
    - pointer_changes: How pointers moved (before -> after)
    - before_value: Value before operation
    - after_value: Value after operation
    - highlight: Which visual element to glow/highlight
    """
    if error:
        return {
            "title": "Runtime Error Detected",
            "what_is_happening": f"The program encountered a fatal runtime error at line {line_no}: {error}",
            "why_are_we_doing_this": "In C, accessing invalid pointers or deallocated memory causes immediate segmentation faults.",
            "memory_changes": "Execution stopped. The CPU cannot safely continue with invalid memory addresses.",
            "pointer_changes": "Check whether the pointer was initialized or points to NULL before dereferencing it.",
            "what_it_does": f"Runtime error: {error}",
            "why_it_matters": "C does not have automatic bounds or NULL safety checks like Python or Java.",
            "before_value": "Valid memory state",
            "after_value": "Crash / Exception",
            "highlight": {"type": "error", "id": "error"}
        }

    c = code.strip()

    # Step 0: Program start
    if step_index == 0 or "// Program started" in c or "// Execution started" in c:
        return {
            "title": "Step 1: Program Execution Initialized",
            "what_is_happening": "The program enters main() and initializes the execution environment.",
            "why_are_we_doing_this": "Before manipulating data structures, the runtime prepares the stack frame and registers any global declarations.",
            "memory_changes": "Stack frame allocated for main(). Heap is currently empty.",
            "pointer_changes": "Any declared pointer (like head) begins in an uninitialized or initial state.",
            "what_it_does": "Initializes the C runtime and main() stack frame.",
            "why_it_matters": "Sets up memory for the program to run.",
            "before_value": "Unallocated",
            "after_value": "main() active",
            "highlight": {"type": "system", "id": "main"}
        }

    # Extract diffs against previous step if available
    prev_vars = {v["name"]: v for v in prev_step.get("variables", [])} if prev_step else {}
    prev_heap = {b["address"]: b for b in prev_step.get("heap", [])} if prev_step else {}
    curr_vars = {v["name"]: v for v in variables}
    curr_heap = {b["address"]: b for b in heap_blocks}

    # Detect newly allocated heap block
    newly_allocated = [b for addr, b in curr_heap.items() if addr not in prev_heap]
    # Detect newly freed heap block
    newly_freed = [b for addr, b in curr_heap.items() if b.get("is_freed") and not prev_heap.get(addr, {}).get("is_freed", False)]

    # 1. Pattern: Memory Allocation (malloc / calloc)
    if "malloc(" in c or "calloc(" in c or len(newly_allocated) > 0:
        m = re.search(r"(\w+)\s*=\s*(?:\([^)]+\)\s*)?(malloc|calloc)\s*\(([^)]+)\)", c)
        var_name = m.group(1) if m else "newNode"
        size_expr = m.group(3) if m else "sizeof(struct Node)"

        alloc_block = newly_allocated[0] if newly_allocated else None
        addr = alloc_block["address"] if alloc_block else (curr_vars.get(var_name, {}).get("value_hex", "0x..."))

        return {
            "title": f"Memory Allocation (`{var_name} = malloc(...)`)",
            "what_is_happening": f"Dynamically allocates a new memory block of size `{size_expr}` on the Heap at address {addr}.",
            "why_are_we_doing_this": "In C, linked list nodes must be created on the Heap so their memory persists outside the current function scope. Local stack variables would disappear when the function finishes.",
            "memory_changes": f"Heap: Reserved new block at {addr} ({alloc_block['size'] if alloc_block else '16'} bytes). Stack: `{var_name}` now holds {addr}.",
            "pointer_changes": f"`{var_name}` now points to the new unattached node at {addr}. Its next pointer and data are not yet initialized.",
            "what_it_does": f"Allocates dynamic memory on the Heap for `{var_name}`.",
            "why_it_matters": "Heap memory stays allocated until explicitly released with `free()`.",
            "before_value": "NULL / Unallocated",
            "after_value": addr,
            "highlight": {"type": "node", "id": addr, "field": "alloc"}
        }

    # 2. Pattern: Memory Free (free(ptr))
    if "free(" in c or len(newly_freed) > 0:
        m = re.search(r"free\s*\(([^)]+)\)", c)
        p_name = m.group(1).strip() if m else "node"
        freed_block = newly_freed[0] if newly_freed else None
        addr = freed_block["address"] if freed_block else (curr_vars.get(p_name, {}).get("value_hex", "0x..."))

        return {
            "title": f"Deallocating Node (`free({p_name})`)",
            "what_is_happening": f"Deallocates and frees the memory block at address {addr} pointed to by `{p_name}`.",
            "why_are_we_doing_this": "Releases dynamically allocated Heap memory to prevent memory leaks. If you do not free nodes when deleting them, your program consumes unused memory over time.",
            "memory_changes": f"Heap block at {addr} is marked as FREED. It is no longer a valid node in memory.",
            "pointer_changes": f"`{p_name}` still stores address {addr}, but that address is now invalid (DANGLING POINTER).",
            "what_it_does": f"Frees the memory occupied by `{p_name}`.",
            "why_it_matters": "Prevents memory leaks in C.",
            "before_value": f"Active node at {addr}",
            "after_value": "FREED memory",
            "highlight": {"type": "node", "id": addr, "field": "free"}
        }

    # 3. Pattern: Member assignment - Pointer linking (e.g. newNode->next = head or curr->next = NULL)
    if "->" in c and "=" in c and any(k in c for k in ["->next", "->prev"]):
        m = re.search(r"(\w+)->(next|prev)\s*=\s*([^;]+)", c)
        if m:
            ptr_name = m.group(1).strip()
            field_name = m.group(2).strip()
            target_expr = m.group(3).strip()

            v_obj = curr_vars.get(ptr_name)
            node_addr = v_obj.get("value_hex", "0x...") if v_obj else "0x..."

            prev_target = "NULL"
            if prev_step:
                for pn in prev_step.get("linked_list", {}).get("nodes", []):
                    if pn["address"] == node_addr:
                        prev_target = str(pn.get(field_name, "NULL"))

            return {
                "title": f"Linking Pointer (`{ptr_name}->{field_name} = {target_expr}`)",
                "what_is_happening": f"Sets the `{field_name}` pointer field of node `{ptr_name}` ({node_addr}) to point to `{target_expr}`.",
                "why_are_we_doing_this": "This establishes the pointer chain connecting this node to the rest of the list without losing references.",
                "memory_changes": f"The `{field_name}` field inside the Heap block at {node_addr} is updated.",
                "pointer_changes": f"`{ptr_name}->{field_name}` changed from `{prev_target}` ──▶ `{target_expr}`.",
                "what_it_does": f"Wires `{ptr_name}->{field_name}` to `{target_expr}`.",
                "why_it_matters": "Pointers create the sequential link between independent heap nodes.",
                "before_value": prev_target,
                "after_value": target_expr,
                "highlight": {"type": "node", "id": node_addr, "field": field_name}
            }

    # 4. Pattern: Member assignment - Data field (e.g. newNode->data = 5)
    if "->" in c and "=" in c:
        m = re.search(r"(\w+)->(\w+)\s*=\s*([^;]+)", c)
        if m:
            ptr_name = m.group(1).strip()
            field_name = m.group(2).strip()
            val_expr = m.group(3).strip()

            v_obj = curr_vars.get(ptr_name)
            node_addr = v_obj.get("value_hex", "0x...") if v_obj else "0x..."

            prev_data = "uninitialized"
            if prev_step:
                for pn in prev_step.get("linked_list", {}).get("nodes", []):
                    if pn["address"] == node_addr:
                        prev_data = str(pn.get("data", "0"))

            return {
                "title": f"Assigning Node Data (`{ptr_name}->{field_name} = {val_expr}`)",
                "what_is_happening": f"Stores value `{val_expr}` into the `{field_name}` field of node `{ptr_name}` at address {node_addr}.",
                "why_are_we_doing_this": "The `->` operator dereferences the pointer `{ptr_name}` and writes directly into the data payload area of the struct in Heap memory.",
                "memory_changes": f"Heap address {node_addr} data field updated: `{prev_data}` ──▶ `{val_expr}`.",
                "pointer_changes": f"Pointers remain unchanged; only the `{field_name}` data inside node {node_addr} was modified.",
                "what_it_does": f"Sets `{ptr_name}->{field_name}` to `{val_expr}`.",
                "why_it_matters": "Stores the user payload inside the newly created node.",
                "before_value": prev_data,
                "after_value": val_expr,
                "highlight": {"type": "node", "id": node_addr, "field": "data"}
            }

    # 5. Pattern: Head pointer update (e.g. head = newNode, head = head->next)
    if re.search(r"\b(head|first|start|top|front)\s*=\s*([^;]+)", c):
        m = re.search(r"\b(head|first|start|top|front)\s*=\s*([^;]+)", c)
        h_name = m.group(1).strip()
        rhs_expr = m.group(2).strip()

        old_head_val = prev_vars.get(h_name, {}).get("value_hex", "0x0")
        new_head_val = curr_vars.get(h_name, {}).get("value_hex", "0x0")

        return {
            "title": f"Head Reassignment (`{h_name} = {rhs_expr}`)",
            "what_is_happening": f"Updates the `{h_name}` pointer variable to point to `{rhs_expr}` ({new_head_val}).",
            "why_are_we_doing_this": f"`{h_name}` defines the entry point to the entire linked list. Moving `{h_name}` re-roots the list at the new starting node.",
            "memory_changes": f"Stack variable `{h_name}` updated: {old_head_val} ──▶ {new_head_val}.",
            "pointer_changes": f"`{h_name}` moved from pointing to {old_head_val} ──▶ {new_head_val}.",
            "what_it_does": f"Updates `{h_name}` to point to `{rhs_expr}`.",
            "why_it_matters": "Without `{h_name}` pointing to the first node, the linked list cannot be traversed.",
            "before_value": old_head_val,
            "after_value": new_head_val,
            "highlight": {"type": "pointer", "id": h_name}
        }

    # 6. Pattern: Pointer Traversal / Update (e.g. curr = curr->next, prev = curr, temp = head)
    if re.search(r"(\w+)\s*=\s*(\w+)(?:->(next|prev))?;", c):
        m = re.search(r"(\w+)\s*=\s*(\w+)(?:->(next|prev))?;", c)
        lhs = m.group(1).strip()
        rhs_base = m.group(2).strip()
        field = m.group(3)

        old_val = prev_vars.get(lhs, {}).get("value_hex", "0x0")
        new_val = curr_vars.get(lhs, {}).get("value_hex", "0x0")

        if field:
            action_desc = f"Advances pointer `{lhs}` along the list using `->{field}`"
            why_desc = "Traversal steps through the linked chain one node at a time by following pointers."
        else:
            action_desc = f"Copies pointer address from `{rhs_base}` into `{lhs}`"
            why_desc = f"Both `{lhs}` and `{rhs_base}` now point to the same memory block. The node is not copied."

        return {
            "title": f"Pointer Traversal (`{lhs} = {rhs_base}{'->' + field if field else ''}`)",
            "what_is_happening": f"{action_desc}. `{lhs}` now holds {new_val}.",
            "why_are_we_doing_this": why_desc,
            "memory_changes": f"Stack: Variable `{lhs}` updated from {old_val} ──▶ {new_val}.",
            "pointer_changes": f"`{lhs}` moved from {old_val} ──▶ {new_val}.",
            "what_it_does": f"Updates pointer `{lhs}` to {new_val}.",
            "why_it_matters": "Essential for traversal, searching, and position-based insertion/deletion.",
            "before_value": old_val,
            "after_value": new_val,
            "highlight": {"type": "pointer", "id": lhs}
        }

    # 7. Pattern: Pointer initialization to NULL (e.g. head = NULL, prev = NULL)
    if re.search(r"(\w+)\s*=\s*NULL", c):
        m = re.search(r"(\w+)\s*=\s*NULL", c)
        p_name = m.group(1).strip()
        return {
            "title": f"Pointer Initialization (`{p_name} = NULL`)",
            "what_is_happening": f"Initializes pointer `{p_name}` to `NULL` (address 0x0).",
            "why_are_we_doing_this": "In C, uninitialized pointers contain arbitrary garbage addresses. Setting a pointer to `NULL` explicitly marks it as empty and safe to test.",
            "memory_changes": f"Stack variable `{p_name}` stores address 0x0.",
            "pointer_changes": f"`{p_name}` points to nothing (`NULL`).",
            "what_it_does": f"Sets `{p_name}` to `NULL`.",
            "why_it_matters": "Prevents wild and dangling pointer crashes in C.",
            "before_value": "Uninitialized",
            "after_value": "NULL (0x0)",
            "highlight": {"type": "pointer", "id": p_name}
        }

    # 8. Pattern: While loop / Traversal condition (e.g. while (curr != NULL))
    if "while" in c:
        cond = c[c.find("(")+1 : c.rfind(")")]
        return {
            "title": f"Loop Condition Check (`while ({cond})`)",
            "what_is_happening": f"Evaluates the loop condition `{cond}`.",
            "why_are_we_doing_this": "In linked list algorithms, loop conditions ensure we process every node and stop when reaching the end (`NULL`) or finding a target.",
            "memory_changes": "No memory modified; condition evaluated by the CPU.",
            "pointer_changes": "Pointer positions remain unchanged for this condition check.",
            "what_it_does": f"Evaluates `{cond}`.",
            "why_it_matters": "Governs iteration over dynamic data structures.",
            "before_value": "Evaluating...",
            "after_value": "Condition Checked",
            "highlight": {"type": "condition", "id": "while"}
        }

    # 9. Pattern: If condition check
    if "if" in c:
        cond = c[c.find("(")+1 : c.rfind(")")]
        return {
            "title": f"Conditional Branch (`if ({cond})`)",
            "what_is_happening": f"Evaluates condition `{cond}` to decide which branch of execution to follow.",
            "why_are_we_doing_this": "Used for boundary conditions like checking if the list is empty (`head == NULL`) or testing if a key matches (`curr->data == key`).",
            "memory_changes": "No memory modified; comparison evaluated by the CPU.",
            "pointer_changes": "None.",
            "what_it_does": f"Tests condition `{cond}`.",
            "why_it_matters": "Handles special cases and search criteria.",
            "before_value": "Comparing...",
            "after_value": "Branch evaluated",
            "highlight": {"type": "condition", "id": "if"}
        }

    # 10. Pattern: Printf
    if "printf(" in c:
        return {
            "title": "Printing to Standard Output (`printf`)",
            "what_is_happening": "Formats and writes output to stdout for user inspection.",
            "why_are_we_doing_this": "Used to display node contents and verify data structure values.",
            "memory_changes": "Output buffer updated in stdout. No Stack or Heap variables changed.",
            "pointer_changes": "None.",
            "what_it_does": "Prints output to console.",
            "why_it_matters": "Communicates program results to the user.",
            "before_value": "Buffer ready",
            "after_value": "Stdout updated",
            "highlight": {"type": "output", "id": "stdout"}
        }

    # 11. Pattern: Return Statement
    if "return" in c:
        return {
            "title": "Function Return (`return`)",
            "what_is_happening": f"Executes return statement: `{c}` and returns control to the caller.",
            "why_are_we_doing_this": "Terminates the function and pops its stack frame.",
            "memory_changes": "Stack frame is cleaned up.",
            "pointer_changes": "Pointers inside this stack frame cease to exist.",
            "what_it_does": "Returns from function.",
            "why_it_matters": "Completes function execution.",
            "before_value": "Running",
            "after_value": "Finished",
            "highlight": {"type": "return", "id": "return"}
        }

    # Default General Statement
    return {
        "title": "Statement Execution",
        "what_is_happening": f"Executes: `{c}`.",
        "why_are_we_doing_this": "Part of the sequential execution flow of the C program.",
        "memory_changes": "Stack and Heap memory are preserved as current.",
        "pointer_changes": "Pointer connections remain unchanged.",
        "what_it_does": f"Executes `{c}`.",
        "why_it_matters": "Sequential step in the program.",
        "before_value": "Step active",
        "after_value": "Step completed",
        "highlight": {"type": "general", "id": "stmt"}
    }
