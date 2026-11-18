#ifndef CVL_RUNTIME_H
#define CVL_RUNTIME_H

#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <stdbool.h>
#include <string.h>
#include <stdarg.h>
#include <signal.h>
#include <unistd.h>
#include <fcntl.h>

#ifdef __cplusplus
extern "C" {
#endif

#define CVL_MAX_HEAP_BLOCKS 512
#define CVL_MAX_VARS 128
#define CVL_MAX_STEPS 2000
#define CVL_STDOUT_BUF_SIZE 16384

typedef struct {
    uintptr_t addr;
    size_t size;
    int alloc_line;
    bool is_freed;
    int freed_line;
} CVLHeapBlock;

typedef enum {
    CVL_TYPE_INT,
    CVL_TYPE_FLOAT,
    CVL_TYPE_DOUBLE,
    CVL_TYPE_CHAR,
    CVL_TYPE_PTR,
    CVL_TYPE_STRUCT,
    CVL_TYPE_ARRAY,
    CVL_TYPE_OTHER
} CVLVarType;

typedef struct {
    char name[48];
    char type_str[64];
    void* ptr_to_var;
    size_t size;
    CVLVarType var_type;
    char struct_tag[48];
    int scope_depth;
} CVLVarInfo;

// Runtime lifecycle
void __cvl_init(const char* trace_json_path);
void __cvl_finish(int exit_code);

// Variable tracking
void __cvl_reg_var(const char* name, const char* type_str, void* ptr_to_var, size_t sz, CVLVarType var_type, const char* struct_tag);
void __cvl_unreg_var(const char* name);

// Function scope tracking
void __cvl_enter_func(const char* func_name);
void __cvl_exit_func(const char* func_name);

// Line step tracking
void __cvl_step(int line, const char* code_snippet);

// Printf interceptor
int __cvl_printf(const char* format, ...);

// Memory interceptors
void* __cvl_malloc(size_t size, int line);
void* __cvl_calloc(size_t count, size_t size, int line);
void* __cvl_realloc(void* ptr, size_t size, int line);
void __cvl_free(void* ptr, int line);

// Standard library wraps
#define printf(...) __cvl_printf(__VA_ARGS__)
#define malloc(sz) __cvl_malloc((sz), __LINE__)
#define calloc(c, sz) __cvl_calloc((c), (sz), __LINE__)
#define realloc(p, sz) __cvl_realloc((p), (sz), __LINE__)
#define free(p) __cvl_free((p), __LINE__)

#ifdef __cplusplus
}
#endif

#endif // CVL_RUNTIME_H
