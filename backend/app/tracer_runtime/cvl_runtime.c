#include "cvl_runtime.h"

// Undefine macros within runtime implementation so we call real libc functions
#undef malloc
#undef calloc
#undef realloc
#undef free
#undef printf

static CVLHeapBlock g_heap_blocks[CVL_MAX_HEAP_BLOCKS];
static int g_heap_count = 0;

static CVLVarInfo g_vars[CVL_MAX_VARS];
static int g_var_count = 0;

static char g_call_stack[32][64];
static int g_call_depth = 0;

static char g_stdout_accum[CVL_STDOUT_BUF_SIZE] = {0};
static int g_stdout_accum_len = 0;
static char g_stdout_delta[CVL_STDOUT_BUF_SIZE] = {0};
static int g_stdout_delta_len = 0;

static FILE* g_trace_fp = NULL;
static int g_step_index = 0;
static int g_current_line = 0;
static const char* g_current_code = "";
static char g_runtime_error[256] = {0};
static bool g_finished = false;

// Forward declaration
static void cvl_write_step_json(int line, const char* code, const char* error_msg);

static void __cvl_atexit_handler(void) {
    __cvl_finish(0);
}

static void cvl_sig_handler(int sig) {
    if (sig == SIGSEGV || sig == SIGBUS) {
        snprintf(g_runtime_error, sizeof(g_runtime_error), 
                 "Segmentation Fault: Attempted invalid memory access or NULL pointer dereference at line %d.", 
                 g_current_line);
    } else if (sig == SIGFPE) {
        snprintf(g_runtime_error, sizeof(g_runtime_error), 
                 "Arithmetic Exception: Division by zero or overflow at line %d.", 
                 g_current_line);
    } else if (sig == SIGABRT) {
        snprintf(g_runtime_error, sizeof(g_runtime_error), 
                 "Process Aborted (SIGABRT) at line %d.", 
                 g_current_line);
    } else if (sig == SIGILL) {
        snprintf(g_runtime_error, sizeof(g_runtime_error), 
                 "Illegal Instruction (SIGILL) at line %d.", 
                 g_current_line);
    } else {
        snprintf(g_runtime_error, sizeof(g_runtime_error), 
                 "Fatal Signal %d received at line %d.", sig, g_current_line);
    }
    cvl_write_step_json(g_current_line, g_current_code, g_runtime_error);
    __cvl_finish(1);
    _exit(0);
}

void __cvl_init(const char* trace_json_path) {
    g_heap_count = 0;
    g_var_count = 0;
    g_call_depth = 0;
    g_stdout_accum_len = 0;
    g_stdout_delta_len = 0;
    g_step_index = 0;
    g_finished = false;
    g_runtime_error[0] = '\0';

    // Register atexit handler so exit(), return in main, or falling off main always closes trace
    atexit(__cvl_atexit_handler);

    // Set up signal handlers for safe runtime crash reporting
    struct sigaction sa;
    memset(&sa, 0, sizeof(sa));
    sa.sa_handler = cvl_sig_handler;
    sigemptyset(&sa.sa_mask);
    sigaction(SIGSEGV, &sa, NULL);
    sigaction(SIGBUS, &sa, NULL);
    sigaction(SIGFPE, &sa, NULL);
    sigaction(SIGABRT, &sa, NULL);
    sigaction(SIGTERM, &sa, NULL);
    sigaction(SIGINT, &sa, NULL);
    sigaction(SIGILL, &sa, NULL);

    g_trace_fp = fopen(trace_json_path, "w");

    __cvl_enter_func("main");
}

int __cvl_printf(const char* format, ...) {
    char buf[2048];
    va_list args;
    va_start(args, format);
    int written = vsnprintf(buf, sizeof(buf), format, args);
    va_end(args);

    // Write to real stdout
    fputs(buf, stdout);
    fflush(stdout);

    // Append to delta and accum
    if (written > 0) {
        if (g_stdout_delta_len + written < (int)sizeof(g_stdout_delta) - 1) {
            strncat(g_stdout_delta, buf, sizeof(g_stdout_delta) - g_stdout_delta_len - 1);
            g_stdout_delta_len += written;
        }
        if (g_stdout_accum_len + written < (int)sizeof(g_stdout_accum) - 1) {
            strncat(g_stdout_accum, buf, sizeof(g_stdout_accum) - g_stdout_accum_len - 1);
            g_stdout_accum_len += written;
        }
    }
    return written;
}

void* __cvl_malloc(size_t size, int line) {
    void* ptr = malloc(size);
    if (ptr && g_heap_count < CVL_MAX_HEAP_BLOCKS) {
        memset(ptr, 0, size);
        g_heap_blocks[g_heap_count].addr = (uintptr_t)ptr;
        g_heap_blocks[g_heap_count].size = size;
        g_heap_blocks[g_heap_count].alloc_line = line;
        g_heap_blocks[g_heap_count].is_freed = false;
        g_heap_blocks[g_heap_count].freed_line = 0;
        g_heap_count++;
    }
    return ptr;
}

void* __cvl_calloc(size_t count, size_t size, int line) {
    size_t total = count * size;
    return __cvl_malloc(total, line);
}

void* __cvl_realloc(void* ptr, size_t size, int line) {
    if (!ptr) return __cvl_malloc(size, line);
    if (size == 0) {
        __cvl_free(ptr, line);
        return NULL;
    }
    void* new_ptr = realloc(ptr, size);
    if (new_ptr) {
        bool found = false;
        for (int i = 0; i < g_heap_count; i++) {
            if (g_heap_blocks[i].addr == (uintptr_t)ptr) {
                g_heap_blocks[i].addr = (uintptr_t)new_ptr;
                g_heap_blocks[i].size = size;
                found = true;
                break;
            }
        }
        if (!found && g_heap_count < CVL_MAX_HEAP_BLOCKS) {
            g_heap_blocks[g_heap_count].addr = (uintptr_t)new_ptr;
            g_heap_blocks[g_heap_count].size = size;
            g_heap_blocks[g_heap_count].alloc_line = line;
            g_heap_blocks[g_heap_count].is_freed = false;
            g_heap_count++;
        }
    }
    return new_ptr;
}

void __cvl_free(void* ptr, int line) {
    if (!ptr) return;
    for (int i = 0; i < g_heap_count; i++) {
        if (g_heap_blocks[i].addr == (uintptr_t)ptr) {
            if (g_heap_blocks[i].is_freed) {
                snprintf(g_runtime_error, sizeof(g_runtime_error), 
                         "Double Free Detected: Pointer at 0x%lx was already freed at line %d.", 
                         (unsigned long)ptr, g_heap_blocks[i].freed_line);
            } else {
                g_heap_blocks[i].is_freed = true;
                g_heap_blocks[i].freed_line = line;
            }
            break;
        }
    }
    // We don't free immediately to allow detecting dangling pointers and use-after-free
}

void __cvl_enter_func(const char* func_name) {
    if (g_call_depth < 32) {
        strncpy(g_call_stack[g_call_depth], func_name, 63);
        g_call_depth++;
    }
}

void __cvl_exit_func(const char* func_name) {
    if (g_call_depth > 0 && strcmp(g_call_stack[g_call_depth - 1], func_name) == 0) {
        // Pop all local variables belonging to this stack frame
        int write_idx = 0;
        for (int i = 0; i < g_var_count; i++) {
            if (g_vars[i].scope_depth < g_call_depth) {
                if (write_idx != i) {
                    g_vars[write_idx] = g_vars[i];
                }
                write_idx++;
            }
        }
        g_var_count = write_idx;
        g_call_depth--;
    }
}

void __cvl_reg_var(const char* name, const char* type_str, void* ptr_to_var, size_t sz, CVLVarType var_type, const char* struct_tag) {
    // Check if variable already registered in the CURRENT stack frame
    for (int i = 0; i < g_var_count; i++) {
        if (strcmp(g_vars[i].name, name) == 0 && g_vars[i].scope_depth == g_call_depth) {
            g_vars[i].ptr_to_var = ptr_to_var;
            g_vars[i].size = sz;
            g_vars[i].var_type = var_type;
            if (struct_tag) strncpy(g_vars[i].struct_tag, struct_tag, 47);
            return;
        }
    }
    if (g_var_count < CVL_MAX_VARS) {
        strncpy(g_vars[g_var_count].name, name, 47);
        strncpy(g_vars[g_var_count].type_str, type_str, 63);
        g_vars[g_var_count].ptr_to_var = ptr_to_var;
        g_vars[g_var_count].size = sz;
        g_vars[g_var_count].var_type = var_type;
        g_vars[g_var_count].scope_depth = g_call_depth;
        if (struct_tag) strncpy(g_vars[g_var_count].struct_tag, struct_tag, 47);
        else g_vars[g_var_count].struct_tag[0] = '\0';
        g_var_count++;
    }
}

void __cvl_unreg_var(const char* name) {
    for (int i = 0; i < g_var_count; i++) {
        if (strcmp(g_vars[i].name, name) == 0) {
            for (int j = i; j < g_var_count - 1; j++) {
                g_vars[j] = g_vars[j + 1];
            }
            g_var_count--;
            break;
        }
    }
}

// Robust JSON string escaping: handles quotes, backslashes, control characters < 32
static void json_escape(const char* src, char* dst, size_t max_dst) {
    if (!src) {
        if (max_dst > 0) dst[0] = '\0';
        return;
    }
    size_t d = 0;
    for (size_t s = 0; src[s] && d < max_dst - 8; s++) {
        unsigned char c = (unsigned char)src[s];
        if (c == '"') {
            dst[d++] = '\\'; dst[d++] = '"';
        } else if (c == '\\') {
            dst[d++] = '\\'; dst[d++] = '\\';
        } else if (c == '\n') {
            dst[d++] = '\\'; dst[d++] = 'n';
        } else if (c == '\r') {
            dst[d++] = '\\'; dst[d++] = 'r';
        } else if (c == '\t') {
            dst[d++] = '\\'; dst[d++] = 't';
        } else if (c == '\b') {
            dst[d++] = '\\'; dst[d++] = 'b';
        } else if (c == '\f') {
            dst[d++] = '\\'; dst[d++] = 'f';
        } else if (c < 32) {
            d += snprintf(&dst[d], max_dst - d, "\\u%04x", c);
        } else {
            dst[d++] = (char)c;
        }
    }
    dst[d] = '\0';
}

static void cvl_write_step_json(int line, const char* code, const char* error_msg) {
    if (!g_trace_fp || g_step_index >= CVL_MAX_STEPS) return;

    char esc_code[1024];
    json_escape(code ? code : "", esc_code, sizeof(esc_code));

    char esc_stdout[CVL_STDOUT_BUF_SIZE * 2];
    json_escape(g_stdout_accum, esc_stdout, sizeof(esc_stdout));

    char esc_delta[CVL_STDOUT_BUF_SIZE * 2];
    json_escape(g_stdout_delta, esc_delta, sizeof(esc_delta));

    // Write as a self-contained line-delimited JSON object (JSONL)
    fprintf(g_trace_fp, "{\"event\":\"step\",\"step\":%d,\"line\":%d,\"code\":\"%s\",\"func\":\"%s\",",
            g_step_index, line, esc_code, g_call_depth > 0 ? g_call_stack[g_call_depth - 1] : "global");

    // Call stack
    fprintf(g_trace_fp, "\"call_stack\":[");
    for (int i = 0; i < g_call_depth; i++) {
        fprintf(g_trace_fp, "\"%s\"%s", g_call_stack[i], (i == g_call_depth - 1) ? "" : ",");
    }
    fprintf(g_trace_fp, "],");

    // Stdout
    fprintf(g_trace_fp, "\"stdout\":\"%s\",\"stdout_delta\":\"%s\",", esc_stdout, esc_delta);

    // Variables
    fprintf(g_trace_fp, "\"variables\":[");
    int emitted_var_count = 0;
    for (int i = 0; i < g_var_count; i++) {
        CVLVarInfo* v = &g_vars[i];
        if (v->scope_depth > g_call_depth) continue;

        // If shadowed by an inner-scope variable of the same name, skip this outer one
        bool shadowed = false;
        for (int j = i + 1; j < g_var_count; j++) {
            if (strcmp(g_vars[j].name, v->name) == 0 && g_vars[j].scope_depth <= g_call_depth) {
                shadowed = true;
                break;
            }
        }
        if (shadowed) continue;

        uintptr_t val = 0;
        bool is_dangling = false;
        bool is_null = false;

        if (v->ptr_to_var) {
            if (v->var_type == CVL_TYPE_PTR || v->size == sizeof(void*)) {
                val = *(uintptr_t*)v->ptr_to_var;
                if (val == 0) {
                    is_null = true;
                } else {
                    for (int h = 0; h < g_heap_count; h++) {
                        if (g_heap_blocks[h].addr == val && g_heap_blocks[h].is_freed) {
                            is_dangling = true;
                            break;
                        }
                    }
                }
            } else if (v->size == sizeof(int)) {
                val = (uintptr_t)(*(int*)v->ptr_to_var);
            } else if (v->size == sizeof(char)) {
                val = (uintptr_t)(*(char*)v->ptr_to_var);
            } else if (v->size == sizeof(short)) {
                val = (uintptr_t)(*(short*)v->ptr_to_var);
            } else if (v->size == sizeof(long)) {
                val = (uintptr_t)(*(long*)v->ptr_to_var);
            }
        }

        fprintf(g_trace_fp, "%s{\"name\":\"%s\",\"type\":\"%s\",\"address\":\"0x%lx\",\"value_hex\":\"0x%lx\",\"value_int\":%ld,\"is_pointer\":%s,\"is_null\":%s,\"is_dangling\":%s,\"struct_tag\":\"%s\"}",
                (emitted_var_count > 0) ? "," : "",
                v->name,
                v->type_str,
                (unsigned long)(uintptr_t)v->ptr_to_var,
                (unsigned long)val,
                (long)val,
                (v->var_type == CVL_TYPE_PTR) ? "true" : "false",
                is_null ? "true" : "false",
                is_dangling ? "true" : "false",
                v->struct_tag);
        emitted_var_count++;
    }
    fprintf(g_trace_fp, "],");

    // Heap blocks
    fprintf(g_trace_fp, "\"heap\":[");
    for (int i = 0; i < g_heap_count; i++) {
        CVLHeapBlock* hb = &g_heap_blocks[i];
        fprintf(g_trace_fp, "%s{\"address\":\"0x%lx\",\"size\":%zu,\"alloc_line\":%d,\"is_freed\":%s,\"freed_line\":%d,",
                (i > 0) ? "," : "",
                (unsigned long)hb->addr,
                hb->size,
                hb->alloc_line,
                hb->is_freed ? "true" : "false",
                hb->freed_line);

        // Serialize exact raw bytes in hex so backend parses fields with 100% architectural precision
        fprintf(g_trace_fp, "\"hex_bytes\":\"");
        if (hb->addr && !hb->is_freed) {
            unsigned char* bytes = (unsigned char*)hb->addr;
            size_t max_b = hb->size > 64 ? 64 : hb->size;
            for (size_t b = 0; b < max_b; b++) {
                fprintf(g_trace_fp, "%02x", bytes[b]);
            }
        }
        fprintf(g_trace_fp, "\",\"raw_data\":[");

        if (hb->addr && hb->size >= sizeof(int)) {
            int num_words = (int)(hb->size / sizeof(uintptr_t));
            if (num_words > 8) num_words = 8;
            if (num_words == 0 && hb->size >= sizeof(int)) num_words = 1;
            uintptr_t* words = (uintptr_t*)hb->addr;
            for (int w = 0; w < num_words; w++) {
                fprintf(g_trace_fp, "\"0x%lx\"%s", (unsigned long)words[w], (w == num_words - 1) ? "" : ",");
            }
        }
        fprintf(g_trace_fp, "]}");
    }
    fprintf(g_trace_fp, "]");

    if (error_msg && error_msg[0] != '\0') {
        char esc_err[512];
        json_escape(error_msg, esc_err, sizeof(esc_err));
        fprintf(g_trace_fp, ",\"error\":\"%s\"", esc_err);
    }

    fprintf(g_trace_fp, "}\n");
    fflush(g_trace_fp);

    // Reset delta
    g_stdout_delta[0] = '\0';
    g_stdout_delta_len = 0;

    g_step_index++;
}

void __cvl_step(int line, const char* code_snippet) {
    if (g_finished || g_step_index >= CVL_MAX_STEPS) return;
    g_current_line = line;
    g_current_code = code_snippet ? code_snippet : "";
    cvl_write_step_json(line, code_snippet, g_runtime_error[0] ? g_runtime_error : NULL);
}

void __cvl_finish(int exit_code) {
    if (g_finished) return;
    g_finished = true;

    // Check for memory leaks
    int leak_count = 0;
    size_t leaked_bytes = 0;
    for (int i = 0; i < g_heap_count; i++) {
        if (!g_heap_blocks[i].is_freed) {
            leak_count++;
            leaked_bytes += g_heap_blocks[i].size;
        }
    }

    if (g_trace_fp) {
        // Write summary as a self-contained line-delimited JSON object
        fprintf(g_trace_fp, "{\"event\":\"summary\",\"total_steps\":%d,\"exit_code\":%d,\"leak_count\":%d,\"leaked_bytes\":%zu,\"has_error\":%s}\n",
                g_step_index, exit_code, leak_count, leaked_bytes, (g_runtime_error[0] != '\0') ? "true" : "false");
        fflush(g_trace_fp);
        fclose(g_trace_fp);
        g_trace_fp = NULL;
    }
}
