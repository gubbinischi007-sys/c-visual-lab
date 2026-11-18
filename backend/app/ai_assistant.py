import os
import re
import json
import urllib.request
import urllib.error
from typing import Dict, Any, Optional

class AIAssistant:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY", "")

    async def answer_question(
        self,
        question: str,
        code: str,
        current_step: Optional[Dict[str, Any]] = None,
        runtime_error: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Answers user questions using the code and execution context.
        Uses external Gemini API if key is present, otherwise falls back
        to intelligent contextual C programming educator.
        """
        if self.api_key and len(self.api_key.strip()) > 10:
            try:
                external_resp = self._call_gemini_api(question, code, current_step, runtime_error)
                if external_resp:
                    return {
                        "answer": external_resp,
                        "source": "gemini_api",
                        "model": "gemini-1.5-flash"
                    }
            except Exception as e:
                print("External AI call failed, falling back to local tutor:", e)

        local_answer = self._generate_local_explanation(question, code, current_step, runtime_error)
        return {
            "answer": local_answer,
            "source": "local_c_tutor",
            "model": "C Visual Lab Contextual Tutor"
        }

    def _call_gemini_api(
        self,
        question: str,
        code: str,
        current_step: Optional[Dict[str, Any]],
        runtime_error: Optional[str]
    ) -> Optional[str]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.api_key}"
        
        context_str = f"User C Code:\n```c\n{code}\n```\n"
        if current_step:
            context_str += f"\nCurrent Executing Line: {current_step.get('line', 'Unknown')}\n"
            context_str += f"Current Statement: {current_step.get('code', 'Unknown')}\n"
            context_str += f"Variables State: {current_step.get('variables', [])}\n"
            context_str += f"Heap Memory State: {current_step.get('heap', [])}\n"
        if runtime_error:
            context_str += f"\nRuntime Error: {runtime_error}\n"

        prompt = f"""You are an expert, encouraging, beginner-friendly C programming teacher in C Visual Lab.
Help the student understand what happens internally in memory, pointers, and data structures.
Use clear Markdown formatting, bullet points, and brief code snippets if helpful. Keep explanations direct, educational, and easy to understand.

Context:
{context_str}

Student Question:
{question}
"""
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }],
            "generationConfig": {
                "temperature": 0.4,
                "maxOutputTokens": 1024
            }
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            candidates = data.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                if parts:
                    return parts[0].get("text", "")
        return None

    def _generate_local_explanation(
        self,
        question: str,
        code: str,
        current_step: Optional[Dict[str, Any]],
        runtime_error: Optional[str]
    ) -> str:
        q = question.lower()
        curr_line = current_step.get("line", 1) if current_step else 1
        curr_code = current_step.get("code", "") if current_step else ""
        variables = current_step.get("variables", []) if current_step else []
        heap_blocks = current_step.get("heap", []) if current_step else []

        # Question: Why is head pointing to NULL?
        if "null" in q and ("head" in q or "pointer" in q):
            return """### Why is `head` pointing to `NULL`?

In C, when a linked list is empty or newly created, `head` is explicitly initialized to `NULL` (or address `0x0`).

1. **Represents an Empty List**: Before any nodes are created, there is no starting node in memory. `head = NULL` signals to the program that the list has 0 elements.
2. **Prevents Garbage Values**: In C, uninitialized pointers hold unpredictable random memory addresses (garbage values). Setting `head = NULL` ensures you can safely check `if (head == NULL)` before accessing it.
3. **Loop Termination**: When traversing a list, the last node's `next` pointer also holds `NULL`, indicating the end of the chain."""

        # Question: Difference between *ptr and ptr
        if "*ptr" in q or ("difference" in q and "ptr" in q):
            return """### Difference between `ptr` and `*ptr`

| Expression | Meaning | What It Holds | Example |
|---|---|---|---|
| **`ptr`** | The pointer variable itself | The **memory address** of the target object (e.g., `0x1040`) | `ptr = malloc(...)` or `ptr = &x` |
| **`*ptr`** | The **dereference** operator | The **actual value** stored inside the memory cell that `ptr` points to | `*ptr = 42` changes the value inside that memory address |
| **`&ptr`** | Address of the pointer variable | The memory address of the pointer itself on the Stack | Used for double pointers `int **` |

**Analogy**: Think of `ptr` as a house address written on an envelope. `*ptr` is walking into the house and seeing what is inside."""

        # Question: Why do we use malloc()?
        if "malloc" in q:
            return """### Why do we use `malloc()` in C?

1. **Heap vs Stack Lifetime**: Local variables on the Stack are automatically destroyed when their function returns. Memory allocated with `malloc()` lives on the **Heap** and stays alive until you explicitly call `free()`.
2. **Dynamic Size**: Unlike static arrays (e.g., `int arr[10];`), `malloc()` lets you request memory at runtime based on exact needs.
3. **Nodes in Linked Lists**: Each new node in a linked list must be created independently on the Heap so nodes can be inserted, deleted, and chained together dynamically."""

        # Question: What happens when free() is executed?
        if "free" in q:
            return """### What happens when `free()` is executed?

1. **Releases Heap Memory**: `free(ptr)` informs the memory manager that the block of memory on the Heap is no longer in use and can be recycled.
2. **Does NOT Reset the Pointer!**: This is a critical C gotcha: calling `free(ptr)` releases the memory block, but the variable `ptr` itself still holds the old address!
3. **Dangling Pointer Risk**: If you access `*ptr` after `free(ptr)`, you commit a **Use-After-Free** bug, which can corrupt memory or crash the program.
4. **Best Practice**: Always set `ptr = NULL;` immediately after `free(ptr);`."""

        # Question: Segmentation Fault
        if "segmentation fault" in q or "segfault" in q or runtime_error:
            err_text = runtime_error or "Attempted to access restricted or unmapped memory."
            return f"""### Understanding the Segmentation Fault

**Error Detail**: `{err_text}`

**Common Causes**:
1. **Dereferencing `NULL`**: Trying to access `ptr->data` or `*ptr` when `ptr == NULL`.
2. **Uninitialized Pointer**: Accessing a pointer before assigning it with `malloc()` or `&var`.
3. **Use-After-Free**: Reading or writing to a pointer after calling `free()`.
4. **Array Out-of-Bounds**: Writing beyond the allocated buffer.

**How to Fix**:
- Always check `if (ptr != NULL)` before accessing `ptr->next` or `ptr->data`.
- Check that `malloc()` succeeded before using the allocated pointer."""

        # Question: Explain line by line
        if "line by line" in q or "explain" in q:
            lines = [l.strip() for l in code.splitlines() if l.strip() and not l.strip().startswith("//")]
            summary = "\n".join([f"- **Line {i+1}**: `{line}`" for i, line in enumerate(lines[:10])])
            return f"""### Program Breakdown

Here is an overview of the key operations in your C program:

{summary}

**Current Step State**:
- Executing Line: `{curr_line}` (`{curr_code}`)
- Active Variables: {len(variables)}
- Active Heap Blocks: {len(heap_blocks)}

Use the **Step-by-Step** navigation buttons in the top toolbar to see each pointer transition animated on the visualization canvas!"""

        # General helpful fallback
        return f"""### C Visual Lab Learning Assistant

**Current Line**: `{curr_line}`: `{curr_code}`

**Active Variables in Scope**:
{', '.join([f"`{v['name']}` ({v['type']}) = {v['value_hex']}" for v in variables]) if variables else 'No local variables registered yet.'}

**Memory State**:
- **Heap Blocks**: {len(heap_blocks)} allocated block(s).
- **Execution Mode**: Step through the program to watch memory addresses and node connections update in real-time.

Feel free to ask questions like:
- *"Why is head pointing to NULL?"*
- *"What does this pointer contain?"*
- *"What is the difference between *ptr and ptr?"*
- *"Explain what malloc does here."*"""
