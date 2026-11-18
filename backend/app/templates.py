"""
Pre-built educational templates for C Visual Lab.
Covers all required data structure categories.
"""

EDUCATIONAL_TEMPLATES = [
    {
        "title": "Singly Linked List — Creation & Insertion",
        "category": "linked_list",
        "description": "Step-by-step creation of nodes, malloc allocation, and chaining next pointers.",
        "code": """#include <stdio.h>
#include <stdlib.h>

// Definition of a singly linked list node
struct Node {
    int data;
    struct Node *next;
};

int main() {
    // 1. Initialize head pointer
    struct Node *head = NULL;

    // 2. Allocate memory for first node
    struct Node *first = (struct Node*)malloc(sizeof(struct Node));
    first->data = 10;
    first->next = NULL;
    head = first;

    // 3. Allocate memory for second node
    struct Node *second = (struct Node*)malloc(sizeof(struct Node));
    second->data = 20;
    second->next = NULL;
    head->next = second;

    // 4. Allocate memory for third node
    struct Node *third = (struct Node*)malloc(sizeof(struct Node));
    third->data = 30;
    third->next = NULL;
    second->next = third;

    printf("Linked list created: %d -> %d -> %d -> NULL\\n", 
           head->data, head->next->data, head->next->next->data);

    // Free allocated memory
    free(first);
    free(second);
    free(third);
    return 0;
}"""
    },
    {
        "title": "Doubly Linked List — Bidirectional Linking",
        "category": "linked_list",
        "description": "Nodes connected with both next and previous pointers.",
        "code": """#include <stdio.h>
#include <stdlib.h>

struct Node {
    int data;
    struct Node *next;
    struct Node *prev;
};

int main() {
    struct Node *head = NULL;

    // Node 1
    struct Node *n1 = (struct Node*)malloc(sizeof(struct Node));
    n1->data = 100;
    n1->prev = NULL;
    n1->next = NULL;
    head = n1;

    // Node 2
    struct Node *n2 = (struct Node*)malloc(sizeof(struct Node));
    n2->data = 200;
    n2->prev = n1;
    n2->next = NULL;
    n1->next = n2;

    // Node 3
    struct Node *n3 = (struct Node*)malloc(sizeof(struct Node));
    n3->data = 300;
    n3->prev = n2;
    n3->next = NULL;
    n2->next = n3;

    printf("Doubly linked list created: %d <-> %d <-> %d\\n", 
           head->data, head->next->data, head->next->next->data);

    free(n1);
    free(n2);
    free(n3);
    return 0;
}"""
    },
    {
        "title": "Circular Linked List — Cycle Wire",
        "category": "linked_list",
        "description": "The last node loops back to point to head, forming a circular list.",
        "code": """#include <stdio.h>
#include <stdlib.h>

struct Node {
    int data;
    struct Node *next;
};

int main() {
    struct Node *head = NULL;

    struct Node *n1 = (struct Node*)malloc(sizeof(struct Node));
    n1->data = 1;
    n1->next = NULL;
    head = n1;

    struct Node *n2 = (struct Node*)malloc(sizeof(struct Node));
    n2->data = 2;
    n2->next = NULL;
    n1->next = n2;

    struct Node *n3 = (struct Node*)malloc(sizeof(struct Node));
    n3->data = 3;
    n3->next = head; // Links back to head!
    n2->next = n3;

    printf("Circular list created: %d -> %d -> %d -> (back to %d)\\n", 
           head->data, head->next->data, n3->data, n3->next->data);

    free(n1);
    free(n2);
    free(n3);
    return 0;
}"""
    },
    {
        "title": "Pointers & Dereferencing (*ptr vs ptr)",
        "category": "pointers",
        "description": "Understand stored address vs target value and the dereference operator.",
        "code": """#include <stdio.h>

int main() {
    int x = 42;
    int *ptr = &x;

    printf("Value of x: %d\\n", x);
    printf("Address of x (&x): %p\\n", (void*)&x);
    printf("Pointer stored address (ptr): %p\\n", (void*)ptr);
    printf("Pointer dereference (*ptr): %d\\n", *ptr);

    // Modifying x through pointer dereferencing
    *ptr = 99;
    printf("New value of x after *ptr = 99: %d\\n", x);

    return 0;
}"""
    },
    {
        "title": "Pointer Swap Function",
        "category": "pointers",
        "description": "Passing pointers to functions to swap two numbers by reference.",
        "code": """#include <stdio.h>

int main() {
    int a = 10;
    int b = 20;
    int *p1 = &a;
    int *p2 = &b;

    printf("Before swap: a = %d, b = %d\\n", a, b);

    // Swap values using pointers
    int temp = *p1;
    *p1 = *p2;
    *p2 = temp;

    printf("After swap: a = %d, b = %d\\n", a, b);
    return 0;
}"""
    },
    {
        "title": "Structures — Dot (.) vs Arrow (->) Operators",
        "category": "structures",
        "description": "Declaring struct instances, pointers to structures, and member access.",
        "code": """#include <stdio.h>

struct Student {
    int id;
    int grade;
};

int main() {
    // Structure instance on stack
    struct Student s1;
    s1.id = 101;
    s1.grade = 95;

    // Pointer to structure
    struct Student *sPtr = &s1;

    printf("Access with dot: ID = %d, Grade = %d\\n", s1.id, s1.grade);
    printf("Access with arrow: ID = %d, Grade = %d\\n", sPtr->id, sPtr->grade);

    // Modify via pointer
    sPtr->grade = 98;
    printf("Updated Grade: %d\\n", s1.grade);

    return 0;
}"""
    },
    {
        "title": "Dynamic Memory — malloc, free & Leaks",
        "category": "dynamic_memory",
        "description": "Demonstrates heap allocation, proper deallocation, and memory leak detection.",
        "code": """#include <stdio.h>
#include <stdlib.h>

int main() {
    // 1. Allocate heap memory for 3 integers
    int *numbers = (int*)malloc(3 * sizeof(int));
    numbers[0] = 100;
    numbers[1] = 200;
    numbers[2] = 300;

    printf("Heap array: %d, %d, %d\\n", numbers[0], numbers[1], numbers[2]);

    // 2. Free allocated block
    free(numbers);

    // Notice: numbers still holds the address (dangling pointer)!
    numbers = NULL; // Safe practice: clear to NULL

    return 0;
}"""
    },
    {
        "title": "Stack (LIFO) Data Structure",
        "category": "stack_queue",
        "description": "Push and pop operations implemented with a linked list.",
        "code": """#include <stdio.h>
#include <stdlib.h>

struct StackNode {
    int data;
    struct StackNode *next;
};

int main() {
    struct StackNode *top = NULL;

    // Push 10
    struct StackNode *n1 = (struct StackNode*)malloc(sizeof(struct StackNode));
    n1->data = 10;
    n1->next = top;
    top = n1;

    // Push 20
    struct StackNode *n2 = (struct StackNode*)malloc(sizeof(struct StackNode));
    n2->data = 20;
    n2->next = top;
    top = n2;

    // Push 30
    struct StackNode *n3 = (struct StackNode*)malloc(sizeof(struct StackNode));
    n3->data = 30;
    n3->next = top;
    top = n3;

    printf("Stack Top is %d\\n", top->data);

    // Pop top element (30)
    struct StackNode *popped = top;
    top = top->next;
    printf("Popped element: %d\\n", popped->data);
    free(popped);

    printf("New Stack Top is %d\\n", top->data);

    free(n1);
    free(n2);
    return 0;
}"""
    },
    {
        "title": "Queue (FIFO) Data Structure",
        "category": "stack_queue",
        "description": "Enqueue and dequeue operations with front and rear pointers.",
        "code": """#include <stdio.h>
#include <stdlib.h>

struct QueueNode {
    int data;
    struct QueueNode *next;
};

int main() {
    struct QueueNode *front = NULL;
    struct QueueNode *rear = NULL;

    // Enqueue 5
    struct QueueNode *q1 = (struct QueueNode*)malloc(sizeof(struct QueueNode));
    q1->data = 5;
    q1->next = NULL;
    front = rear = q1;

    // Enqueue 15
    struct QueueNode *q2 = (struct QueueNode*)malloc(sizeof(struct QueueNode));
    q2->data = 15;
    q2->next = NULL;
    rear->next = q2;
    rear = q2;

    // Enqueue 25
    struct QueueNode *q3 = (struct QueueNode*)malloc(sizeof(struct QueueNode));
    q3->data = 25;
    q3->next = NULL;
    rear->next = q3;
    rear = q3;

    printf("Queue Front: %d, Rear: %d\\n", front->data, rear->data);

    // Dequeue (remove 5)
    struct QueueNode *temp = front;
    front = front->next;
    printf("Dequeued: %d, New Front: %d\\n", temp->data, front->data);
    free(temp);

    free(q2);
    free(q3);
    return 0;
}"""
    },
    {
        "title": "Binary Search Tree — Node Structure & Linking",
        "category": "trees",
        "description": "Constructing a binary search tree root and left/right child nodes.",
        "code": """#include <stdio.h>
#include <stdlib.h>

struct TreeNode {
    int val;
    struct TreeNode *left;
    struct TreeNode *right;
};

int main() {
    // Root node
    struct TreeNode *root = (struct TreeNode*)malloc(sizeof(struct TreeNode));
    root->val = 50;
    root->left = NULL;
    root->right = NULL;

    // Left child (30 < 50)
    struct TreeNode *leftNode = (struct TreeNode*)malloc(sizeof(struct TreeNode));
    leftNode->val = 30;
    leftNode->left = NULL;
    leftNode->right = NULL;
    root->left = leftNode;

    // Right child (70 > 50)
    struct TreeNode *rightNode = (struct TreeNode*)malloc(sizeof(struct TreeNode));
    rightNode->val = 70;
    rightNode->left = NULL;
    rightNode->right = NULL;
    root->right = rightNode;

    printf("BST created: Root=%d, Left=%d, Right=%d\\n", 
           root->val, root->left->val, root->right->val);

    free(leftNode);
    free(rightNode);
    free(root);
    return 0;
}"""
    }
]
