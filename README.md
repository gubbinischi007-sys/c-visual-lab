# C Visual Lab
### *Write. Execute. Visualize. Understand.*

**C Visual Lab** is a modern, interactive C programming compiler and visual execution learning platform designed to help students master core computer science and systems programming concepts—including linked lists, pointer arithmetic, memory allocation, structure layouts, stack frames, and dynamic heap data structures.

---

## Key Features

1. **Real C Compiler (Clang)**
   - Compiles native C11 source code using LLVM Clang.
   - Provides line-accurate compiler diagnostics, errors, and warnings directly in the console and Monaco editor with red error squiggles and tooltips.
   - Zero mocked or synthetic compiler output.

2. **Native Execution Tracing Engine**
   - High-performance C instrumentation runtime (`cvl_runtime.h` & `cvl_runtime.c`).
   - Line-by-line snapshot generation capturing variable scopes, pointer addresses, and heap blocks.
   - Intercepts `malloc()`, `calloc()`, `realloc()`, and `free()` to detect memory leaks, use-after-free, and dangling pointers.
   - Catches fatal signals (`SIGSEGV`, `SIGBUS`, `SIGFPE`) to explain segmentation faults and NULL pointer dereferences safely without server crashes.

3. **Three Interactive Execution & Visualization Modes**
   - **Mode A: Automatic Visualization**: Continuous animated execution with adjustable playback speeds (0.25x, 0.5x, 1x, 1.5x, 2x), pause, and resume.
   - **Mode B: Step-by-Step Visualization**: Granular line-by-line stepping (Next Step, Previous Step, Step Slider) with in-depth explanations of state transitions.
   - **Mode C: Combined Mode**: Seamlessly switch between automatic animation and manual step-by-step navigation without restarting or losing the program's live execution state.

4. **Data Structure Visualizer**
   - **Singly Linked Lists**: Nodes with hex addresses, data payloads, next pointer ports, and head/tail badges.
   - **Doubly Linked Lists**: Bidirectional linking with dual arrows (`next` and `prev`).
   - **Circular Linked Lists**: Long curved back-edge arc connecting the tail back to `head`.
   - **NULL Pointer Terminations**: Visual `NULL (0x0)` terminal indicators.

5. **Memory Layout Inspector**
   - **Stack Memory**: Active stack frames (`main()`, functions), local variables, addresses (`&x`), types, and stored pointer values.
   - **Heap Memory**: Real dynamically allocated memory blocks, byte sizes, allocation lines, and active vs. freed status.
   - **Pointer Mental Model**: Clear distinction between the address where a pointer is stored (`&ptr`), the address it holds (`ptr`), and the value at the target location (`*ptr`).

6. **Beginner-Friendly Step Explanations**
   - Plain-English breakdown for every executed line:
     - What the line does
     - Why it is executed
     - Which variables and memory locations changed
     - How pointers and links were affected
     - What happens next

7. **Program Management & SQLite Persistence**
   - Save, Open, Rename, Delete, and Download C programs (`.c` files).
   - Pre-loaded with 10 comprehensive educational templates (Singly, Doubly, Circular Linked Lists, Pointers, Structs, Dynamic Memory, Stack, Queue, Binary Search Trees).
   - Session state is automatically persisted in SQLite across browser reloads.

8. **AI Learning Assistant**
   - Context-aware tutor that inspects the current line, local variables, and heap state.
   - Quick questions: *"Why is head pointing to NULL?"*, *"What does malloc do here?"*, *"Explain *ptr vs ptr"*, *"Why am I getting a segmentation fault?"*.
   - Works offline with the built-in C contextual educator, with optional Google Gemini API key integration.

---

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Monaco Editor, Lucide React, Vite.
- **Backend**: Python 3.10+, FastAPI, Uvicorn, SQLAlchemy, SQLite, LibClang.
- **Compiler**: Clang (LLVM) with C11 support.

---

## Quickstart Guide

### 1. Backend Server
```bash
cd backend
python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
API docs available at `http://localhost:8000/docs`.

### 2. Frontend Development Server
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173/` in your browser.
