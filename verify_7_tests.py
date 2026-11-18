import urllib.request
import json
import sys

BASE = "http://127.0.0.1:8000/api/trace"

def run_test(name, code, stdin=""):
    req = urllib.request.Request(
        BASE,
        data=json.dumps({"code": code, "stdin": stdin}).encode(),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
    err_msg = data.get("error")
    assert data.get("success") == True, f"{name} failed: {err_msg}"
    steps = data.get("steps", [])
    assert len(steps) > 0, f"{name} had 0 steps"
    stdout_preview = str(steps[-1].get("stdout", ""))[:40]
    print(f"PASS: {name} -> {len(steps)} steps generated. Stdout preview: {stdout_preview!r}")
    return data

# Test 1: Simple Hello World program
code1 = """#include <stdio.h>
int main() {
    printf("Hello, World!\\n");
    return 0;
}"""
run_test("Test 1: Hello World", code1)

# Test 2: Basic variable and pointer program
code2 = """#include <stdio.h>
int main() {
    int x = 42;
    int *p = &x;
    *p = 99;
    printf("x = %d, *p = %d\\n", x, *p);
    return 0;
}"""
d2 = run_test("Test 2: Variables and Pointers", code2)
v_names = [v["name"] for v in d2["steps"][-1]["variables"]]
assert "x" in v_names and "p" in v_names, f"Missing vars: {v_names}"

# Test 3: Linked-list creation program
code3 = """#include <stdio.h>
#include <stdlib.h>
struct Node {
    int data;
    struct Node *next;
};
int main() {
    struct Node *head = (struct Node*)malloc(sizeof(struct Node));
    head->data = 10;
    head->next = NULL;
    printf("Head: %d\\n", head->data);
    free(head);
    return 0;
}"""
d3 = run_test("Test 3: Linked-List Creation", code3)
assert len(d3["steps"][-1]["linked_list"]["nodes"]) >= 1

# Test 4: Linked-list insertion and deletion
code4 = """#include <stdio.h>
#include <stdlib.h>
struct Node {
    int data;
    struct Node *next;
};
int main() {
    struct Node *head = (struct Node*)malloc(sizeof(struct Node));
    head->data = 10;
    head->next = NULL;

    // Insertion
    struct Node *second = (struct Node*)malloc(sizeof(struct Node));
    second->data = 20;
    second->next = NULL;
    head->next = second;

    // Deletion
    struct Node *temp = head;
    head = head->next;
    free(temp);

    printf("Remaining head: %d\\n", head->data);
    free(second);
    return 0;
}"""
d4 = run_test("Test 4: Insertion and Deletion", code4)

# Test 5: Linked-list traversal
code5 = """#include <stdio.h>
#include <stdlib.h>
struct Node {
    int data;
    struct Node *next;
};
int main() {
    struct Node *n1 = (struct Node*)malloc(sizeof(struct Node));
    struct Node *n2 = (struct Node*)malloc(sizeof(struct Node));
    struct Node *n3 = (struct Node*)malloc(sizeof(struct Node));
    n1->data = 1; n1->next = n2;
    n2->data = 2; n2->next = n3;
    n3->data = 3; n3->next = NULL;

    struct Node *curr = n1;
    while (curr != NULL) {
        printf("%d ", curr->data);
        curr = curr->next;
    }
    printf("\\n");
    free(n1); free(n2); free(n3);
    return 0;
}"""
d5 = run_test("Test 5: Linked-List Traversal", code5)

# Test 6: Special characters in printf
code6 = """#include <stdio.h>
int main() {
    printf("Quotes: \\"test\\" \\n Tab: \\t Backslash: \\\\ Percent: 100%%\\n");
    printf("Symbols: @#$%^&*()_+-=[]{}|;:<>?,./~`\\n");
    return 0;
}"""
d6 = run_test("Test 6: Special characters in printf", code6)

# Test 7: Large execution trace (loop > 2000 steps)
code7 = """#include <stdio.h>
int main() {
    int sum = 0;
    for (int i = 0; i < 2500; i++) {
        sum += i;
    }
    printf("Sum: %d\\n", sum);
    return 0;
}"""
d7 = run_test("Test 7: Large Execution Trace (>2000 steps)", code7)
assert d7["steps"][-1]["step_index"] >= 1000

print("\nALL 7 TESTS COMPLETED SUCCESSFULLY WITH 100% PASS RATE!")
