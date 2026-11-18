import urllib.request
import json
import sys

BASE = "http://127.0.0.1:8000/api/trace"

def run_trace(name, code, stdin=""):
    req = urllib.request.Request(
        BASE,
        data=json.dumps({"code": code, "stdin": stdin}).encode(),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
    assert data.get("success") == True, f"{name} failed: {data.get('error')}"
    steps = data.get("steps", [])
    assert len(steps) > 0, f"{name} generated 0 steps"
    return steps

print("=================================================================")
print("RUNNING COMPREHENSIVE VERIFICATION: 11 LINKED LIST MICRO-STEP SUITES")
print("=================================================================")

# Suite 1: Empty Linked List
print("\n--- Suite 1: Empty Linked List ---")
code1 = """#include <stdio.h>
struct Node { int data; struct Node *next; };
int main() {
    struct Node *head = NULL;
    return 0;
}"""
steps1 = run_trace("Suite 1: Empty List", code1)
assert len(steps1[1]["linked_list"]["nodes"]) == 0
print(f"✓ Step 1: Head is initialized to NULL. Total nodes: {len(steps1[1]['linked_list']['nodes'])}")

# Suite 2: Create One Node
print("\n--- Suite 2: Create One Node ---")
code2 = """#include <stdio.h>
#include <stdlib.h>
struct Node { int data; struct Node *next; };
int main() {
    struct Node *head = NULL;
    struct Node *newNode = (struct Node*)malloc(sizeof(struct Node));
    newNode->data = 10;
    newNode->next = NULL;
    head = newNode;
    return 0;
}"""
steps2 = run_trace("Suite 2: Create One Node", code2)
# Check Step 2 (after malloc): node is staged
assert len(steps2[2]["linked_list"]["staged_nodes"]) == 1
assert len(steps2[2]["linked_list"]["main_chain"]) == 0
# Check Step 3 (data assignment)
assert steps2[3]["explanation"]["what_is_happening"] is not None
# Check Step 5 (head reassignment): node is now in main chain
assert len(steps2[5]["linked_list"]["main_chain"]) == 1
assert steps2[5]["linked_list"]["main_chain"][0]["data"] == 10
print(f"✓ Verified 5 distinct micro-steps from malloc (staged) to data assign to head reassignment.")

# Suite 3: Insert Multiple Nodes
print("\n--- Suite 3: Insert Multiple Nodes ---")
code3 = """#include <stdio.h>
#include <stdlib.h>
struct Node { int data; struct Node *next; };
int main() {
    struct Node *head = (struct Node*)malloc(sizeof(struct Node));
    head->data = 10;
    head->next = (struct Node*)malloc(sizeof(struct Node));
    head->next->data = 20;
    head->next->next = (struct Node*)malloc(sizeof(struct Node));
    head->next->next->data = 30;
    head->next->next->next = NULL;
    return 0;
}"""
steps3 = run_trace("Suite 3: Insert Multiple Nodes", code3)
last_chain = steps3[-1]["linked_list"]["main_chain"]
assert len(last_chain) == 3
assert [n["data"] for n in last_chain] == [10, 20, 30]
print(f"✓ Successfully built chain with 3 nodes: {[n['data'] for n in last_chain]}")

# Suite 4: Insert at Beginning
print("\n--- Suite 4: Insert at Beginning ---")
code4 = """#include <stdio.h>
#include <stdlib.h>
struct Node { int data; struct Node *next; };
int main() {
    struct Node *head = (struct Node*)malloc(sizeof(struct Node));
    head->data = 10;
    head->next = NULL;

    // Insert 5 at beginning
    struct Node *newNode = (struct Node*)malloc(sizeof(struct Node));
    newNode->data = 5;
    newNode->next = head;
    head = newNode;
    return 0;
}"""
steps4 = run_trace("Suite 4: Insert at Beginning", code4)
# Find the step where head = newNode executes
step_head = next(s for s in steps4 if "head = newNode" in s["code"])
assert [n["data"] for n in step_head["linked_list"]["main_chain"]] == [5, 10]
print(f"✓ Verified insert at beginning: intermediate staged node linked and head moved to 5 -> {[n['data'] for n in step_head['linked_list']['main_chain']]}")

# Suite 5: Insert at End
print("\n--- Suite 5: Insert at End ---")
code5 = """#include <stdio.h>
#include <stdlib.h>
struct Node { int data; struct Node *next; };
int main() {
    struct Node *head = (struct Node*)malloc(sizeof(struct Node));
    head->data = 10;
    head->next = NULL;

    struct Node *newNode = (struct Node*)malloc(sizeof(struct Node));
    newNode->data = 20;
    newNode->next = NULL;
    head->next = newNode;
    return 0;
}"""
steps5 = run_trace("Suite 5: Insert at End", code5)
last_step5 = steps5[-1]["linked_list"]["main_chain"]
assert len(last_step5) == 2
assert [n["data"] for n in last_step5] == [10, 20]
print(f"✓ Verified insert at end: {[n['data'] for n in last_step5]}")

# Suite 6: Delete First Node
print("\n--- Suite 6: Delete First Node ---")
code6 = """#include <stdio.h>
#include <stdlib.h>
struct Node { int data; struct Node *next; };
int main() {
    struct Node *head = (struct Node*)malloc(sizeof(struct Node));
    head->data = 10;
    struct Node *second = (struct Node*)malloc(sizeof(struct Node));
    second->data = 20;
    second->next = NULL;
    head->next = second;

    // Delete first node
    struct Node *temp = head;
    head = head->next;
    free(temp);
    return 0;
}"""
steps6 = run_trace("Suite 6: Delete First Node", code6)
free_step = next(s for s in steps6 if "free(temp)" in s["code"])
assert len(free_step["linked_list"]["freed_nodes"]) == 1
assert len(free_step["linked_list"]["main_chain"]) == 1
assert free_step["linked_list"]["main_chain"][0]["data"] == 20
print(f"✓ First node freed. Main chain now starts at {free_step['linked_list']['main_chain'][0]['data']}. Freed count: {len(free_step['linked_list']['freed_nodes'])}")

# Suite 7: Delete Last Node
print("\n--- Suite 7: Delete Last Node ---")
code7 = """#include <stdio.h>
#include <stdlib.h>
struct Node { int data; struct Node *next; };
int main() {
    struct Node *head = (struct Node*)malloc(sizeof(struct Node));
    head->data = 100;
    struct Node *n2 = (struct Node*)malloc(sizeof(struct Node));
    n2->data = 200;
    n2->next = NULL;
    head->next = n2;

    // Delete last node
    struct Node *del = head->next;
    head->next = NULL;
    free(del);
    return 0;
}"""
steps7 = run_trace("Suite 7: Delete Last Node", code7)
free_step7 = next(s for s in steps7 if "free(del)" in s["code"])
assert len(free_step7["linked_list"]["freed_nodes"]) == 1
assert [n["data"] for n in free_step7["linked_list"]["main_chain"]] == [100]
print(f"✓ Last node deleted and freed. Remaining list: {[n['data'] for n in free_step7['linked_list']['main_chain']]}")

# Suite 8: Traverse the List
print("\n--- Suite 8: Traverse the List ---")
code8 = """#include <stdio.h>
#include <stdlib.h>
struct Node { int data; struct Node *next; };
int main() {
    struct Node *head = (struct Node*)malloc(sizeof(struct Node));
    head->data = 1;
    head->next = (struct Node*)malloc(sizeof(struct Node));
    head->next->data = 2;
    head->next->next = NULL;

    struct Node *curr = head;
    while (curr != NULL) {
        printf("%d ", curr->data);
        curr = curr->next;
    }
    return 0;
}"""
steps8 = run_trace("Suite 8: Traverse the List", code8)
assert steps8[-1]["stdout"] == "1 2 "
print(f"✓ Traversal completed with output: {steps8[-1]['stdout']!r}")

# Suite 9: Search for a Node
print("\n--- Suite 9: Search for a Node ---")
code9 = """#include <stdio.h>
#include <stdlib.h>
struct Node { int data; struct Node *next; };
int main() {
    struct Node *head = (struct Node*)malloc(sizeof(struct Node));
    head->data = 40;
    head->next = (struct Node*)malloc(sizeof(struct Node));
    head->next->data = 50;
    head->next->next = NULL;

    int target = 50;
    int found = 0;
    struct Node *curr = head;
    while (curr != NULL) {
        if (curr->data == target) {
            found = 1;
            break;
        }
        curr = curr->next;
    }
    printf("Found: %d\\n", found);
    return 0;
}"""
steps9 = run_trace("Suite 9: Search for a Node", code9)
assert "Found: 1" in steps9[-1]["stdout"]
print(f"✓ Search algorithm found target value 50: {steps9[-1]['stdout'].strip()!r}")

# Suite 10: Reverse a Linked List
print("\n--- Suite 10: Reverse a Linked List ---")
code10 = """#include <stdio.h>
#include <stdlib.h>
struct Node { int data; struct Node *next; };
int main() {
    struct Node *head = (struct Node*)malloc(sizeof(struct Node));
    head->data = 1;
    head->next = (struct Node*)malloc(sizeof(struct Node));
    head->next->data = 2;
    head->next->next = (struct Node*)malloc(sizeof(struct Node));
    head->next->next->data = 3;
    head->next->next->next = NULL;

    struct Node *prev = NULL;
    struct Node *curr = head;
    struct Node *next = NULL;
    while (curr != NULL) {
        next = curr->next;
        curr->next = prev;
        prev = curr;
        curr = next;
    }
    head = prev;
    return 0;
}"""
steps10 = run_trace("Suite 10: Reverse a Linked List", code10)
final_reversed = [n["data"] for n in steps10[-1]["linked_list"]["main_chain"]]
assert final_reversed == [3, 2, 1], f"Expected [3, 2, 1], got {final_reversed}"
print(f"✓ Reverse linked list completed! 1 -> 2 -> 3 reversed to: {final_reversed}")

# Suite 11: Free Allocated Memory
print("\n--- Suite 11: Free Allocated Memory ---")
code11 = """#include <stdio.h>
#include <stdlib.h>
struct Node { int data; struct Node *next; };
int main() {
    struct Node *n1 = (struct Node*)malloc(sizeof(struct Node));
    n1->data = 10;
    struct Node *n2 = (struct Node*)malloc(sizeof(struct Node));
    n2->data = 20;

    free(n1);
    free(n2);
    return 0;
}"""
steps11 = run_trace("Suite 11: Free Memory", code11)
last_step11 = steps11[-1]
assert len(last_step11["linked_list"]["freed_nodes"]) == 2
assert last_step11["linked_list"]["freed_nodes"][0]["is_freed"] == True
assert last_step11["linked_list"]["freed_nodes"][1]["is_freed"] == True
print(f"✓ All allocated memory properly freed: {len(last_step11['linked_list']['freed_nodes'])} freed blocks verified.")

print("\n=================================================================")
print("ALL 11 LINKED LIST MICRO-STEP VERIFICATION SUITES PASSED 100%!")
print("=================================================================")
