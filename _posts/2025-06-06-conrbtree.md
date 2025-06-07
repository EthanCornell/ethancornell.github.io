---
layout: post
title: "Modern Concurrent Red-Black Tree Design in C++: A Practical Guide - Part 1"
date: 2025-06-06 16:09:00
description: Sharing ideas on making a Red-Black Tree thread-safe using C++ shared_mutex and multiple reader strategies, plus visual flowcharts for insert/delete under concurrency
tags: concurrent ds-and-algorithms
categories: computer-sciences
featured: true
giscus_comments: false
---

## Introduction

Red-Black Trees (RB-Trees) offer guaranteed $O(\log n)$ operations in single-threaded contexts. However, as soon as multiple threads try to query or modify the same tree concurrently, a naive implementation suffers from severe contention and potential deadlocks. In this post, we share a **modest** approach, neither world-beating nor lock-free—to transform a standard RB-Tree into a **thread-safe** data structure in C++. We will:

1. Present our **node layout** and sentinel (`NIL`) design.  
2. Describe **three reader synchronization strategies**:
   * Simple Serialization  
   * Lock Coupling  
   * Global Reader-Writer Lock  
3. Show the **core insertion and deletion** code under writer serialization.  
   * **New:** Include “flow-charts” illustrating how insert and delete steps happen under concurrency.  
4. Highlight a key portion of **delete fixup** with an diagram.  

Our goal is to share **ideas**, not claim ultimate performance. If you need maximum scalability, consider a lock-free skip list or a B-Tree with fine-grained latches. But if you already know RB-Trees and want a straightforward concurrency-safe version, read on.

---

## 1. Data Structures & Core Design

### 1.1 Node Layout

Each node holds:  
* `key` and `value`  
* A `Color` (RED or BLACK)  
* Pointers `parent`, `left`, `right`  
* A per-node `std::shared_mutex rw` for reader-writer locking  
* A unique `lock_id` (the node’s memory address) to enforce a consistent lock acquisition order  

```c++
enum class Color : uint8_t {
    RED,
    BLACK
};

template <typename K, typename V>
struct Node {
    K key;
    V val;
    Color color{ Color::RED };

    Node *parent{ nullptr };
    Node *left{ nullptr };
    Node *right{ nullptr };

    mutable std::shared_mutex rw;   // Shared for readers, exclusive for writers
    const uintptr_t lock_id;        // Based on 'this'; prevents deadlocks in lock coupling

    explicit Node(const K &k, const V &v, Color c = Color::RED)
        : key(k), val(v), color(c),
          lock_id(reinterpret_cast<uintptr_t>(this)) {}
};
````

* **Why `std::shared_mutex`?**
  It allows multiple concurrent readers while still ensuring exclusive access for writers.
* **Why `lock_id`?**
  When two threads attempt to acquire locks on adjacent nodes (parent and child) in opposite orders, a deadlock can occur. We break cycles by sorting the two `lock_id`s and acquiring locks in ascending order.

### 1.2 The `NIL` Sentinel

Instead of `nullptr` for missing children, we maintain a **single shared** `NIL` node:

```c++
template <typename K, typename V, typename Compare = std::less<K>>
class RBTree {
public:
    using NodeT = Node<K, V>;

    RBTree() {
        // Create one BLACK sentinel for all leaves
        NIL = new NodeT(K{}, V{}, Color::BLACK);
        NIL->left   = NIL;
        NIL->right  = NIL;
        NIL->parent = NIL;
        root = NIL;
    }

    ~RBTree() {
        destroy_rec(root);
        delete NIL;
    }

private:
    NodeT *root;   // Points to real root or NIL if empty
    NodeT *NIL;    // Shared black sentinel

    void destroy_rec(NodeT *n) {
        if (n == NIL) return;
        destroy_rec(n->left);
        destroy_rec(n->right);
        delete n;
    }
    // ...
};
```

**Benefits of a sentinel:**

1. **Uniform traversal:** Instead of `if (child != nullptr)`, we check `if (child != NIL)`.
2. **RB Invariant (#3):** All leaf pointers reference a single black `NIL`, so every root-to-leaf path counts correctly.
3. **Rotation simplicity:** We never have to handle `nullptr`; a child is either another node or the `NIL` sentinel.

---

## 2. Three Concurrency Strategies for Lookups

Readers can run in parallel—or not—depending on how aggressively you lock. We offer **three** strategies, from simplest to more concurrent:

1. **Simple Serialization** (`lookup_simple`)
2. **Lock Coupling** (`lookup`)
3. **Global Reader-Writer Lock** (`lookup_hybrid`)

### 2.1 Strategy 1: Simple Serialization (`lookup_simple`)

All readers and writers grab the same global `writers_mutex`. Under that lock, we perform a normal BST search. This ensures correctness and is trivial to implement, but there is **no parallelism** among readers.

```c++
template <typename K, typename V, typename Compare>
class RBTree {
public:
    mutable std::mutex writers_mutex;

    std::optional<V> lookup_simple(const K &k) const {
        // 1. Lock the global mutex (blocks other readers & writers)
        std::lock_guard<std::mutex> guard(writers_mutex);

        // 2. Standard BST traversal under the lock
        const NodeT *curr = root;
        while (curr != NIL) {
            if (Compare{}(k, curr->key)) {
                curr = curr->left;
            }
            else if (Compare{}(curr->key, k)) {
                curr = curr->right;
            }
            else {
                return curr->val; // Found
            }
        }
        return std::nullopt; // Not found
    }
    // ...
};
```

**Pros:**

* Deadlock-free and straightforward.
* Under heavy write contention, per-node locking overhead can be higher anyway, so this may be simpler.

**Cons:**

* No simultaneous readers: everything serializes.

Use this when simplicity or moderate concurrency is acceptable.

---

### 2.2 Strategy 2: Lock Coupling (`lookup`)

Also known as “hand-over-hand locking.” A reader holds a shared lock on the current node. Before moving to a child, it acquires the child’s shared lock, then releases the parent. This way, readers in different subtrees do not contend for the same locks.

```c++
template <typename K, typename V, typename Compare>
class RBTree {
public:
    std::optional<V> lookup(const K &k) const {
        if (root == NIL) return std::nullopt;

        // 1. Start by grabbing a shared lock on root.
        std::shared_lock<std::shared_mutex> curr_lock(root->rw);
        const NodeT *curr = root;

        while (curr != NIL) {
            if (Compare{}(k, curr->key)) {
                NodeT *next = curr->left;
                if (next == NIL) break;

                if (curr->lock_id < next->lock_id) {
                    // Safe: parent lock_id < child lock_id
                    std::shared_lock<std::shared_mutex> next_lock(next->rw);
                    curr_lock.unlock();
                    curr = next;
                    curr_lock = std::move(next_lock);
                }
                else {
                    // Inverted order: parent->lock_id > child->lock_id
                    // Acquire both locks in ascending order to prevent deadlock.
                    std::vector<NodeT*> nodes = {
                        const_cast<NodeT*>(curr),
                        const_cast<NodeT*>(next)
                    };
                    OrderedLockGuard<K, V> guard(nodes);
                    curr_lock.unlock();
                    curr = next;
                    curr_lock = std::shared_lock<std::shared_mutex>(curr->rw);
                }
            }
            else if (Compare{}(curr->key, k)) {
                NodeT *next = curr->right;
                if (next == NIL) break;

                if (curr->lock_id < next->lock_id) {
                    std::shared_lock<std::shared_mutex> next_lock(next->rw);
                    curr_lock.unlock();
                    curr = next;
                    curr_lock = std::move(next_lock);
                }
                else {
                    std::vector<NodeT*> nodes = {
                        const_cast<NodeT*>(curr),
                        const_cast<NodeT*>(next)
                    };
                    OrderedLockGuard<K, V> guard(nodes);
                    curr_lock.unlock();
                    curr = next;
                    curr_lock = std::shared_lock<std::shared_mutex>(curr->rw);
                }
            }
            else {
                // Exact match
                return curr->val;
            }
        }
        return std::nullopt;
    }
    // ...
};
```

#### OrderedLockGuard

```c++
template <typename K, typename V>
class OrderedLockGuard {
private:
    using NodeT = Node<K, V>;
    std::vector<std::shared_lock<std::shared_mutex>> locks_;

public:
    explicit OrderedLockGuard(std::vector<NodeT*> nodes) {
        // 1. Sort by lock_id ascending
        std::sort(nodes.begin(), nodes.end(),
                  [](const NodeT* a, const NodeT* b) {
                      return a->lock_id < b->lock_id;
                  });
        nodes.erase(std::unique(nodes.begin(), nodes.end()), nodes.end());

        // 2. Acquire shared_locks in sorted order
        locks_.reserve(nodes.size());
        for (NodeT* nd : nodes) {
            locks_.emplace_back(nd->rw);
        }
    }
    // Destructor releases all locks in reverse order (RAII).
};
```

**Pros:**

* Readers only contend when they actually traverse the same node.
* Allows significant parallelism in read-heavy workloads.

**Cons:**

* Every step does at least one lock/unlock operation, plus potential `OrderedLockGuard` overhead.
* Slightly more complex to implement and reason about.

---

### 2.3 Strategy 3: Global Reader-Writer Lock (`lookup_hybrid`)

Simplify further by using one global `std::shared_mutex`. Readers acquire a shared lock on the entire tree; writers acquire an exclusive lock. No per-node locking is needed during traversal.

```c++
template <typename K, typename V, typename Compare>
class RBTree {
public:
    mutable std::shared_mutex global_rw_lock;

    std::optional<V> lookup_hybrid(const K &k) const {
        // 1. Grab a shared lock for all readers.
        std::shared_lock<std::shared_mutex> gl(global_rw_lock);

        // 2. Plain BST traversal under that shared lock.
        const NodeT *curr = root;
        while (curr != NIL) {
            if (Compare{}(k, curr->key)) {
                curr = curr->left;
            }
            else if (Compare{}(curr->key, k)) {
                curr = curr->right;
            }
            else {
                return curr->val;
            }
        }
        return std::nullopt;
    }

    void insert_hybrid(const K &k, const V &v) {
        std::unique_lock<std::shared_mutex> wl(global_rw_lock);
        // ... same insertion code, but under wl.
    }
    // Similarly for erase_hybrid.
};
```

**Pros:**

* Very simple: readers never touch per-node locks.
* All readers run in parallel unless a writer holds the exclusive lock.

**Cons:**

* A single write blocks *every* reader. Frequent writes can cause high reader latency.
* Potential **writer starvation**: if readers continuously arrive, a writer may wait indefinitely.

---

## 3. Insert & Delete: Core Code Excerpts with Concurrency Flowcharts

All three strategies share the **same** writer logic: any insertion or deletion obtains a global writer lock (either `writers_mutex` or the exclusive `global_rw_lock`). Below are key excerpts, now augmented with “flow-charts” to illustrate the sequence of steps under concurrency.

---

### 3.1 Insertion (`insert`)

```c++
template <typename K, typename V, typename Compare>
class RBTree {
public:
    // Strategy 1 & 2 use this:
    mutable std::mutex writers_mutex;

    void insert(const K &k, const V &v) {
        // 1. Serialize all writers
        std::unique_lock<std::mutex> guard(writers_mutex);

        // 2. Allocate new RED node
        NodeT *z = new NodeT(k, v, Color::RED);
        z->left  = z->right  = z->parent = NIL;

        /*───────────────────────────────────────────────────────────────────
         * SPECIAL CASE: Empty Tree
         *───────────────────────────────────────────────────────────────────
         * When inserting into empty tree:
         * 1. New node becomes root
         * 2. Must be colored BLACK (RB property #2)
         * 3. No rebalancing needed
         *───────────────────────────────────────────────────────────────────*/
        if (root == NIL) {
            root = z;
            z->color = Color::BLACK;  // Root must be BLACK
            return;
        }

        /*───────────────────────────────────────────────────────────────────
         * SEARCH PHASE: Find Insertion Point
         *───────────────────────────────────────────────────────────────────
         * Standard BST search to find where new node should be inserted:
         * - y tracks the parent of the insertion point
         * - x traverses down the tree following BST ordering
         * - Loop terminates when x reaches NIL (insertion point found)
         *───────────────────────────────────────────────────────────────────*/
        NodeT *y = NIL;      // Parent of insertion point
        NodeT *x = root;     // Current node during traversal

        while (x != NIL) {
            y = x;
            if (comp(k, x->key))       x = x->left;
            else if (comp(x->key, k))  x = x->right;
            else { // Duplicate key
                x->val = v;
                delete z;
                return;
            }
        }

        /*───────────────────────────────────────────────────────────────────
         * LINK PHASE: Insert New Node into Tree Structure
         *───────────────────────────────────────────────────────────────────
         * Connect new node z as child of y:
         * - Set z's parent pointer
         * - Set appropriate child pointer in parent y
         * - Maintain BST ordering invariant
         *───────────────────────────────────────────────────────────────────*/
        z->parent = y;
        if (comp(z->key, y->key))  y->left  = z;
        else                        y->right = z;

        /*───────────────────────────────────────────────────────────────────
         * REBALANCE PHASE: Restore Red-Black Properties
         *───────────────────────────────────────────────────────────────────
         * New RED node may violate RB-tree properties:
         * - Property #4: RED node with RED parent (red-red violation)
         * - Property #5: Potentially unbalanced black heights
         * 
         * insert_fixup() performs rotations and recoloring to fix violations
         *───────────────────────────────────────────────────────────────────*/
        insert_fixup(z);
    }

private:
    void insert_fixup(NodeT *z) {
        // Standard CLRS cases (omitted for brevity; see above).
    }
    // Rotations...
};
```

#### 3.1.1 Concurrency Flowchart for **Insert**

Below is an flowchart showing the **sequence of steps** that happen under a concurrent workload—where multiple writers may attempt to insert or delete at once, but only one actually proceeds at a time because of `writers_mutex`.

```
Insert(k, v):
  |
  |  [THREAD T₁] calls insert(k,v)
  |     1. unique_lock(writers_mutex)   ←  (Blocks if another writer is in progress)
  |     2. allocate new Node z (RED)
  |     3. if (root == NIL):
  |          root = z; z.color = BLACK; unlock; return
  |     4. else: BST search (no other writer can interleave)
  |             x = root; while (x != NIL) { ... }
  |     5. link z as child of y
  |     6. insert_fixup(z)—rotate & recolor under same lock
  |     7. unlock(writers_mutex)       ←  (Now next writer can proceed)
  |
  └──> Completed insertion
```

**Key points under concurrency:**

1. Once `writers_mutex` is acquired, no other writer can modify the tree until the current writer releases it.
2. **Readers** using either `lookup_simple`, `lookup`, or `lookup_hybrid` may still run concurrently, depending on the chosen strategy:

   * Under **`lookup_simple`**, readers also block until the writer finishes.
   * Under **`lookup`**, per-node shared locks ensure readers only block if they traverse a node currently being rotated or recolored by a writer.
   * Under **`lookup_hybrid`**, readers block on the global `shared_mutex` if the writer holds the exclusive lock.

Below is a closer look at the “link + fixup” step inside `insert_fixup`, still holding `writers_mutex`:

```typograms
[Inside insert_fixup(z)]
  ┌─────────────────────────────────────────────────────────────────┐
  │   z is RED, parent p = z->parent, grandparent g                 │
  │   while (p.color == RED):                                       │
  │     if (p == g.left):                                           │
  │       y = g.right        ← Uncle                                │
  │       if (y.color == RED):                                      │
  │         // Case 1: p and y are RED                              │
  │         p.color = BLACK; y.color = BLACK; g.color = RED;        │
  │         z = g;                                                  │
  │       else                                                      │
  │         if (z == p.right):                                      │
  │           // Case 2: z is inner child                           │
  │           z = p; left_rotate(z);                                │
  │         // Case 3: z is outer child (after possible Case 2)     │
  │         p.color = BLACK; g.color = RED; right_rotate(g);        │
  │     else  // mirror when p == g.right                           │
  │       ...                                                       │
  │   root.color = BLACK;   ← Guarantee root is BLACK               │
  └─────────────────────────────────────────────────────────────────┘
```

Because `writers_mutex` is held the entire time, **no other writer** can interleave, and **no incremental per-node locking** is needed here.

---

### 3.2 Deletion (`erase`)

```c++
template <typename K, typename V, typename Compare>
class RBTree {
public:
    bool erase(const K &k) {
        std::unique_lock<std::mutex> guard(writers_mutex);

        /*───────────────────────────────────────────────────────────────────
         * FIND PHASE: Locate Node to Delete
         *───────────────────────────────────────────────────────────────────*/
        NodeT *z = root;
        while (z != NIL && z->key != k)
            z = comp(k, z->key) ? z->left : z->right;

        if (z == NIL) return false; // Key not found

        /*───────────────────────────────────────────────────────────────────
         * SPLICE PHASE: Remove Node from Tree Structure
         *───────────────────────────────────────────────────────────────────*/
        NodeT *y = z;
        NodeT *x = nullptr;
        Color y_original = y->color;

        if (z->left == NIL) {
            x = z->right;
            transplant(z, z->right);
        }
        else if (z->right == NIL) {
            x = z->left;
            transplant(z, z->left);
        }
        else {
            // Two children → find successor y
            y = minimum(z->right);
            y_original = y->color;
            x = y->right;
            if (y->parent == z) {
                x->parent = y;
            }
            else {
                transplant(y, y->right);
                y->right = z->right;
                y->right->parent = y;
            }
            transplant(z, y);
            y->left = z->left;
            y->left->parent = y;
            y->color = z->color;
        }
        delete z; // Remove actual node

        /*───────────────────────────────────────────────────────────────────
         * FIXUP PHASE: Restore Red-Black Properties if needed
         *───────────────────────────────────────────────────────────────────*/
        if (y_original == Color::BLACK) {
            delete_fixup(x);
        }
        return true;
    }

private:
    void delete_fixup(NodeT *x) {
        // Standard CLRS delete_fixup (omitted for brevity; see above).
    }

    void transplant(NodeT *u, NodeT *v) {
        if (u->parent == NIL)          root = v;
        else if (u == u->parent->left) u->parent->left  = v;
        else                           u->parent->right = v;
        v->parent = u->parent;
    }

    NodeT *minimum(NodeT *x) const {
        while (x->left != NIL) x = x->left;
        return x;
    }
    // Rotations and delete_fixup code...
};
```

#### 3.2.1 Concurrency Flowchart for **Delete**

Below is an flowchart illustrating how deletion proceeds under concurrent workloads. Again, the **writer** holds the single `writers_mutex` from start to finish, ensuring no other writer can modify the tree simultaneously:

```typograms
Erase(k):
  |
  |  [THREAD T₁] calls erase(k)
  |     1. unique_lock(writers_mutex)   ←  (Blocks if another writer is in progress)
  |     2. Find phase:
  |          z = root
  |          while (z != NIL && z->key != k) {
  |            if (k < z->key) z = z->left; else z = z->right;
  |          }
  |          if (z == NIL): unlock; return false
  |     3. Splice phase:
  |          if (z has ≤1 child):
  |            x = (child or NIL)
  |            transplant(z, x)
  |          else: // two children
  |            y = minimum(z->right)   // in-order successor
  |            y_original = y->color
  |            x = y->right
  |            if (y.parent == z) x.parent = y
  |            else {
  |              transplant(y, y->right)
  |              y.right = z->right
  |              y.right->parent = y
  |            }
  |            transplant(z, y)
  |            y.left = z->left
  |            y.left->parent = y
  |            y.color = z->color
  |          delete z
  |     4. If (y_original == BLACK) delete_fixup(x)
  |          // delete_fixup does rotations & recolors under writers_mutex
  |     5. unlock(writers_mutex)
  |
  └──> Completed deletion
```

**Key points under concurrency:**

1. Once `writers_mutex` is acquired, no other writer can modify the tree until the current writer releases it.
2. **Readers**:

   * Under **`lookup_simple`**, readers block until the writer finishes.
   * Under **`lookup`**, readers hold per-node shared locks—if a delete’s rotation touches a node a reader currently holds a shared lock on, the delete will block until that shared lock is released.
   * Under **`lookup_hybrid`**, readers block on `global_rw_lock` if the writer holds the exclusive lock.

Below are two delete\_fixup cases (Case 2 and Case 4) illustrated with diagrams:

```typograms
/*───────────────────────────────────────────────────────────────────────
 * CASE 2: Sibling BLACK, both nephews BLACK
 *───────────────────────────────────────────────────────────────────────
 * No BLACK nodes to "borrow" from sibling subtree.
 * Push extra black up to parent:
 * 
 * Before:               After:
 *      p(?)              p(+1 black)
 *     /    \             /        \
 *  x(DB)  w(B)   →    x(B)     w(R)
 *         /  \                  /   \
 *       a(B) b(B)            a(B)  b(B)
 *───────────────────────────────────────────────────────────────────────*/
```

```
/*───────────────────────────────────────────────────────────────────────
 * CASE 4: Sibling BLACK, far nephew RED
 *───────────────────────────────────────────────────────────────────────
 * Final rotation to absorb extra black:
 * 
 * Before:                After:
 *      p(?)               w(?)
 *     /    \            /     \
 *  x(DB)  w(B)   →   p(B)    c(B)
 *         /  \       /   \
 *       a(?) c(R)  x(B) a(?)
 * 
 * Extra black absorbed, algorithm terminates
 *───────────────────────────────────────────────────────────────────────*/
```

Although those two cases are **inside** `delete_fixup`, they do not illustrate concurrency per se, they illustrate local color/rotation adjustments. Concurrency comes into play if a reader holds a shared lock on any of these nodes; the writer will wait for the reader to release that lock.

---

## 4. Summary & Next Steps

In this post, we have sketched a **straightforward** approach to make a Red-Black Tree thread-safe in C++:

1. **Node Layout & Sentinel**

   * Each node carries a `std::shared_mutex rw` and a `lock_id`.
   * A single `NIL` sentinel replaces `nullptr` children, always colored BLACK.

2. **Three Reader Strategies**

   * **Simple Serialization:** All readers/writers share one mutex—easy, but no parallel reads.
   * **Lock Coupling:** Per-node shared locks and an ordered guard to prevent deadlocks. Readers in disjoint subtrees can proceed concurrently.
   * **Global RW Lock:** One `std::shared_mutex` for the entire tree. Readers run in parallel, but writers block everyone.

3. **Writer Serialization for Insert & Delete**

   * All modifications (`insert`, `erase`) acquire a global mutex (or exclusive lock) to maintain the RB invariants.
   * Standard CLRS-style rotations and fixups restore color and black-height properties.

4. **Concurrency Flowcharts for Insert & Delete**

   * **Insert:** acquire `writers_mutex` → link new node → `insert_fixup` → release.
   * **Delete:** acquire `writers_mutex` → splice out node → `delete_fixup` → release.
   * Readers may block or progress concurrently depending on chosen lookup strategy.

5. **Delete Fixup Cases** (Case 2 and Case 4 shown with diagrams)

Although a specialized lock-free or latch-coupled B-Tree may offer better raw performance on large, highly contested workloads, this approach is easy to understand and maintain if you already know single-threaded Red-Black Trees. It preserves \$O(\log n)\$ complexity in the absence of contention, and it offers three clear points of trade-off between simplicity and reader parallelism.

You can find the full example code (including a simple demo `main()` with TSAN/ASAN tests) on GitHub:

> **GitHub Repository:** [https://github.com/EthanCornell/RedLockTree/blob/main/lock\_based\_rb\_tree.cpp](https://github.com/EthanCornell/RedLockTree/blob/main/lock_based_rb_tree.cpp)

In the next article, **“Verification: Ensuring Correctness with Sanitizers and Self-Checks,”** we will demonstrate how to:

* Integrate **ThreadSanitizer (TSAN)** to detect data races.
* Use **AddressSanitizer (ASAN)** to catch memory errors.
* Write a `validate()` routine that continuously checks RB-Tree invariants during concurrent operations.

Stay tuned for more on making sure your concurrent data structures remain correct under stress!

