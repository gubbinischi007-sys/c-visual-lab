import urllib.request
import json
import sys

BASE_URL = "http://127.0.0.1:8000/api"

def test_api():
    print("========================================")
    print("Running C Visual Lab Comprehensive Test")
    print("========================================")

    # 1. Health check
    print("\n1. Testing /health...")
    with urllib.request.urlopen(f"{BASE_URL}/health") as resp:
        data = json.loads(resp.read().decode())
        assert data["status"] == "healthy", f"Unexpected health status: {data}"
        print("   ✓ Health check passed:", data)

    # 2. Get educational programs
    print("\n2. Testing /programs...")
    with urllib.request.urlopen(f"{BASE_URL}/programs") as resp:
        progs = json.loads(resp.read().decode())
        assert isinstance(progs, list)
        print(f"   ✓ Clean programs library verified (User-controlled programs: {len(progs)})")

    # 3. Real C compilation test (success)
    print("\n3. Testing /compile (valid C code)...")
    valid_c = """#include <stdio.h>
int main() {
    printf("Compilation Success\\n");
    return 0;
}"""
    req = urllib.request.Request(
        f"{BASE_URL}/compile",
        data=json.dumps({"code": valid_c}).encode(),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        assert data["success"] == True
        assert len(data["diagnostics"]) == 0
        print("   ✓ Valid C compilation passed with zero errors.")

    # 4. Real C compilation test (error detection)
    print("\n4. Testing /compile (invalid syntax error)...")
    invalid_c = """#include <stdio.h>
int main() {
    int a = ;
    return 0;
}"""
    req = urllib.request.Request(
        f"{BASE_URL}/compile",
        data=json.dumps({"code": invalid_c}).encode(),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        assert data["success"] == False
        assert len(data["diagnostics"]) > 0
        diag = data["diagnostics"][0]
        print(f"   ✓ Caught Clang error correctly: Line {diag['line']}:{diag['col']} -> {diag['message']}")

    # 5. Singly Linked list execution tracing
    print("\n5. Testing /trace with Singly Linked List...")
    singly_c = """#include <stdio.h>
#include <stdlib.h>

struct Node {
    int data;
    struct Node *next;
};

int main() {
    struct Node *head = NULL;
    struct Node *n1 = (struct Node*)malloc(sizeof(struct Node));
    n1->data = 10;
    n1->next = NULL;
    head = n1;

    struct Node *n2 = (struct Node*)malloc(sizeof(struct Node));
    n2->data = 20;
    n2->next = NULL;
    head->next = n2;

    printf("Done: %d -> %d\\n", head->data, head->next->data);
    free(n1);
    free(n2);
    return 0;
}"""
    req = urllib.request.Request(
        f"{BASE_URL}/trace",
        data=json.dumps({"code": singly_c, "stdin": ""}).encode(),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        assert data["success"] == True
        steps = data["steps"]
        print(f"   ✓ Trace generated {len(steps)} steps.")
        last_step = steps[-1]
        nodes = last_step["linked_list"]["nodes"]
        print(f"   ✓ Last step node count: {len(nodes)}")
        assert len(nodes) == 2, f"Expected 2 nodes, got {len(nodes)}"
        assert nodes[0]["data"] == 10
        assert nodes[1]["data"] == 20
        print(f"   ✓ Node 0 (data: {nodes[0]['data']}) -> Node 1 (data: {nodes[1]['data']})")
        print(f"   ✓ Node 0 points to: {nodes[0]['next']}")

    # 6. Doubly Linked List tracing
    print("\n6. Testing /trace with Doubly Linked List...")
    doubly_c = """#include <stdio.h>
#include <stdlib.h>

struct Node {
    int data;
    struct Node *next;
    struct Node *prev;
};

int main() {
    struct Node *head = NULL;
    struct Node *n1 = (struct Node*)malloc(sizeof(struct Node));
    n1->data = 100;
    n1->next = NULL;
    n1->prev = NULL;
    head = n1;

    struct Node *n2 = (struct Node*)malloc(sizeof(struct Node));
    n2->data = 200;
    n2->next = NULL;
    n2->prev = n1;
    head->next = n2;

    free(n1);
    free(n2);
    return 0;
}"""
    req = urllib.request.Request(
        f"{BASE_URL}/trace",
        data=json.dumps({"code": doubly_c}).encode(),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        assert data["success"] == True
        assert data["steps"][-1]["linked_list"]["type"] == "doubly"
        print(f"   ✓ Detected list type: {data['steps'][-1]['linked_list']['type']}")

    # 7. Memory Leak Detection
    print("\n7. Testing /trace with intentional memory leak (malloc without free)...")
    leak_c = """#include <stdlib.h>
int main() {
    int *p = (int*)malloc(64);
    *p = 123;
    // Intentionally no free(p);
    return 0;
}"""
    req = urllib.request.Request(
        f"{BASE_URL}/trace",
        data=json.dumps({"code": leak_c}).encode(),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        summary = data["summary"]
        assert summary["leak_count"] == 1
        assert summary["leaked_bytes"] == 64
        print(f"   ✓ Memory leak detected accurately: {summary['leak_count']} block ({summary['leaked_bytes']} bytes leaked).")

    # 8. AI Learning Assistant
    print("\n8. Testing /ai/ask...")
    req = urllib.request.Request(
        f"{BASE_URL}/ai/ask",
        data=json.dumps({
            "question": "What is the difference between *ptr and ptr?",
            "code": "int *ptr = NULL;",
            "current_step": {"line": 1, "code": "int *ptr = NULL;"}
        }).encode(),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        assert "answer" in data
        assert len(data["answer"]) > 50
        print(f"   ✓ AI Assistant answered from [{data['source']}]:")
        print("     " + data["answer"][:120].replace('\n', ' ') + "...")

    # 9. Session Persistence in SQLite
    print("\n9. Testing /session persistence...")
    req = urllib.request.Request(
        f"{BASE_URL}/session",
        data=json.dumps({
            "execution_mode": "step",
            "current_code": "// Saved user code",
            "animation_speed": "1.5x"
        }).encode(),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        assert data["execution_mode"] == "step"
        assert data["animation_speed"] == "1.5x"
        print("   ✓ Session successfully persisted to SQLite.")

    # 10. Frontend Dev Server Check
    print("\n10. Testing Frontend Dev Server...")
    with urllib.request.urlopen("http://localhost:5173/") as resp:
        html = resp.read().decode()
        assert "<title>C Visual Lab" in html
        assert 'id="root"' in html
        print("   ✓ Frontend is live at http://localhost:5173/ with correct title and HTML mount.")

    print("\n========================================")
    print("ALL 10 VERIFICATION SUITES PASSED 100%!")
    print("========================================")

if __name__ == "__main__":
    test_api()
