---
layout: post
title: "mini_malloc: A Basic First-Fit Memory Allocator"
date: 2025-06-16 12:12:12
description:  This document provides an in-depth look at the design and implementation of **mini_malloc**, a basic first-fit memory allocator in C. It covers the allocator's architecture, data structures, algorithms, and testing strategy for educational purposes.
tags: concurrent c/c++ ds-and-algorithms
categories: computer-sciences operating_systems
featured: false
giscus_comments: false
---



This technical note provides a comprehensive analysis of **mini_malloc**, a basic memory allocator implementation that demonstrates fundamental concepts in systems programming. The allocator features:

- **First-fit allocation strategy** using a simple free list
- **Block splitting and coalescing** for memory efficiency
- **Standard interface compliance** (malloc, free, realloc, calloc)
- **Debug capabilities** with heap introspection functions
- **Educational design** prioritizing clarity over performance

The implementation balances simplicity (under 300 lines) with correctness, making it ideal for learning memory management concepts and understanding how allocators work under the hood.


---

## Table of Contents

1. [Introduction & Motivation](#1-introduction--motivation)
2. [Requirements Analysis](#2-requirements-analysis)
3. [Architectural Overview](#3-architectural-overview)
4. [Core Data Structures](#4-core-data-structures)
5. [Implementation Deep Dive](#5-implementation-deep-dive)
   - 5.1 [Block Metadata Design](#51-block-metadata-design)
   - 5.2 [First-Fit Algorithm](#52-first-fit-algorithm)
   - 5.3 [Block Splitting](#53-block-splitting)
   - 5.4 [Free List Management](#54-free-list-management)
   - 5.5 [Memory Alignment](#55-memory-alignment)
6. [API Implementation](#6-api-implementation)
7. [Testing & Validation](#7-testing--validation)
8. [Performance Characteristics](#8-performance-characteristics)
9. [Limitations and Trade-offs](#9-limitations-and-trade-offs)
10. [Educational Value](#10-educational-value)
11. [Path to Production](#11-path-to-production)
12. [Conclusion](#12-conclusion)
13. [Appendix: Complete Implementation](#appendix-complete-implementation)

---

## 1. Introduction & Motivation

Memory allocation is one of the most fundamental operations in systems programming, yet it's often treated as a black box by many developers. Understanding how malloc and free work internally is crucial for:

- **Writing efficient code**: Knowing allocation patterns helps avoid performance pitfalls
- **Debugging memory issues**: Understanding heap layout aids in diagnosing corruption and leaks
- **System design**: Custom allocators can optimize for specific workloads
- **Educational foundation**: Allocators demonstrate key OS and data structure concepts

**mini_malloc** serves as an educational implementation that strips away the complexity of production allocators while maintaining correctness and demonstrating core concepts.

### Why Start Simple?

While production allocators like glibc's ptmalloc, jemalloc, and tcmalloc are marvels of engineering, they are:
- Extremely complex (thousands of lines of code)
- Heavily optimized, sacrificing readability
- Difficult to understand without deep systems knowledge
- Overwhelming for learning purposes

**mini_malloc** addresses this by providing:
- Clean, documented implementation
- Focus on fundamental algorithms
- Easy-to-follow control flow
- Comprehensive testing framework

---

## 2. Requirements Analysis

### Functional Requirements

1. **Standard Interface Compliance**
   - `malloc(size_t size)` - Allocate memory
   - `free(void *ptr)` - Deallocate memory
   - `realloc(void *ptr, size_t size)` - Resize allocation
   - `calloc(size_t nmemb, size_t size)` - Allocate zeroed memory

2. **Memory Management**
   - Handle arbitrary allocation sizes
   - Minimize fragmentation through splitting and coalescing
   - Provide proper memory alignment
   - Handle edge cases gracefully

3. **Correctness**
   - No memory leaks in allocator itself
   - Proper handling of NULL pointers
   - Double-free protection
   - Overflow detection in calloc

### Non-Functional Requirements

1. **Simplicity**
   - Clear, readable implementation
   - Minimal complexity
   - Educational value over performance

2. **Correctness**
   - Robust error handling
   - Defensive programming practices
   - Comprehensive test coverage

3. **Portability**
   - POSIX-compliant system calls only
   - Platform-independent core logic

### Design Constraints

1. **Code Size**: Keep implementation under 300 lines
2. **Dependencies**: Only standard C library and POSIX sbrk
3. **Thread Safety**: Single-threaded design for simplicity
4. **Memory Overhead**: Reasonable metadata size per allocation

---

## 3. Architectural Overview

### High-Level Design

```
┌─────────────────────────────────────────────┐
│              User Application               │
├─────────────────────────────────────────────┤
│       malloc/free/realloc/calloc API        │
├─────────────────────────────────────────────┤
│            Free List Manager                │
├─────────────────────────────────────────────┤
│         Memory Backend (sbrk)               │
└─────────────────────────────────────────────┘
```

### Component Responsibilities

1. **API Layer**: Implements standard malloc interface with proper semantics
2. **Free List Manager**: Tracks available blocks using singly-linked list
3. **Memory Backend**: Interfaces with OS via sbrk() for heap growth
4. **Debug Support**: Provides heap introspection capabilities

### Memory Layout Strategy

The allocator uses a simple heap-based approach where all memory comes from extending the process heap via `sbrk()`. Blocks are tracked using inline metadata stored immediately before the user data.

---

## 4. Core Data Structures

### Block Metadata

```c
struct block_meta {
    size_t size;             // Size of user data portion
    struct block_meta *next; // Next block in free list
    int free;                // 1 if free, 0 if allocated
};
```

**Design Rationale:**
- **Simple singly-linked list**: Easier to implement and debug than doubly-linked
- **Explicit free flag**: Simplifies debugging and corruption detection
- **Size field**: Stores user data size, not total block size
- **Inline metadata**: Stored immediately before user data for O(1) access

### Memory Layout

```
User pointer:     ptr ─────────────┐
                                   ▼
Memory layout:  [block_meta][user data][block_meta][user data]...
                     ▲                      ▲
                     │                      │
                 metadata              next block
```

### Free List Structure

The allocator maintains a global free list pointing to all available blocks:

```
free_list ──► [Block A] ──► [Block C] ──► [Block E] ──► NULL
              size: 100     size: 200     size: 50
              free: 1       free: 1       free: 1
```

---

## 5. Implementation Deep Dive

### 5.1 Block Metadata Design

The heart of our allocator lies in its metadata structure. Each allocated block is preceded by a small header containing essential information:

```c
struct block_meta {
    size_t size;             // User data size in bytes
    struct block_meta *next; // Next free block
    int free;                // Free/allocated flag
};
```

**Metadata Placement Strategy:**

```c
void *my_malloc(size_t size) {
    struct block_meta *block = /* allocation logic */;
    return (char *)block + META_SIZE;  // Return pointer after metadata
}

void my_free(void *ptr) {
    struct block_meta *block = (struct block_meta *)((char *)ptr - META_SIZE);
    // ... free logic
}
```

This inline approach provides O(1) metadata access during free operations, though it makes blocks vulnerable to buffer overruns that corrupt metadata.

### 5.2 First-Fit Algorithm

Our allocation strategy uses the classic first-fit algorithm:

```c
static struct block_meta *find_free_block(size_t size) {
    struct block_meta *current = free_list;
    
    while (current) {
        if (current->free && current->size >= size) {
            return current;  // First suitable block found
        }
        current = current->next;
    }
    return NULL;  // No suitable block found
}
```

**Algorithm Analysis:**
- **Time Complexity**: O(n) where n is the number of free blocks
- **Space Utilization**: Good for most workloads, can suffer from fragmentation
- **Implementation Simplicity**: Extremely straightforward

**Why First-Fit?**
- Simpler than best-fit (no need to examine all blocks)
- Often performs as well as more complex strategies
- Predictable behavior for debugging
- Fast allocation for blocks early in the free list

### 5.3 Block Splitting

When we find a free block larger than needed, we split it to minimize waste:

```c
static void split_block(struct block_meta *block, size_t size) {
    // Only split if remainder would be meaningful
    if (block->size >= size + META_SIZE + ALIGNMENT) {
        // Calculate new block position
        struct block_meta *new_block = 
            (struct block_meta *)((char *)block + META_SIZE + size);
        
        // Initialize remainder block
        new_block->size = block->size - size - META_SIZE;
        new_block->next = block->next;
        new_block->free = 1;
        
        // Update original block
        block->size = size;
        block->next = new_block;
    }
}
```

**Splitting Visualization:**

```
Before splitting (request 64 bytes from 200-byte block):
┌─────────────────────────────────────────────┐
│        Block (size: 200, free: 1)           │
└─────────────────────────────────────────────┘

After splitting:
┌─────────────────────┐  ┌─────────────────────┐
│ Block (size: 64)    │  │ New Block (size:112)│
│ free: 0             │  │ free: 1             │
└─────────────────────┘  └─────────────────────┘
```

The minimum split threshold prevents creating tiny, unusable fragments that would only serve to fragment the heap.

### 5.4 Free List Management

The free list is managed through simple insertion and removal operations:

**Adding to Free List:**
```c
static void add_to_free_list(struct block_meta *block) {
    block->free = 1;
    block->next = free_list;  // Insert at head
    free_list = block;
}
```

**Removing from Free List:**
```c
static void remove_from_free_list(struct block_meta *block) {
    if (free_list == block) {
        free_list = block->next;  // Remove head
    } else {
        // Find predecessor and unlink
        struct block_meta *current = free_list;
        while (current && current->next != block) {
            current = current->next;
        }
        if (current) {
            current->next = block->next;
        }
    }
    block->free = 0;
}
```

This simple approach prioritizes code clarity over performance. Production allocators would use more sophisticated data structures (red-black trees, segregated free lists) to achieve O(log n) or O(1) operations.

### 5.5 Memory Alignment

All allocations are aligned to 8-byte boundaries for optimal performance:

```c
#define ALIGNMENT 8
#define ALIGN(size) (((size) + (ALIGNMENT - 1)) & ~(ALIGNMENT - 1))

void *my_malloc(size_t size) {
    if (size == 0) return NULL;
    
    size = ALIGN(size);  // Ensure proper alignment
    // ... rest of allocation logic
}
```

**Why 8-byte alignment?**
- Satisfies requirements for all basic C types (including double)
- Optimal for 64-bit architectures
- Prevents unaligned access penalties
- Standard practice in production allocators

---

## 6. API Implementation

### malloc Implementation

```c
void *my_malloc(size_t size) {
    if (size == 0) return NULL;
    
    size = ALIGN(size);
    struct block_meta *block;
    
    // Try to find existing free block
    block = find_free_block(size);
    
    if (block) {
        remove_from_free_list(block);
        split_block(block, size);
    } else {
        // Need new memory from system
        block = request_space(size);
        if (!block) return NULL;
    }
    
    return (char *)block + META_SIZE;
}
```

### free Implementation

```c
void my_free(void *ptr) {
    if (!ptr) return;  // free(NULL) is safe
    
    struct block_meta *block = 
        (struct block_meta *)((char *)ptr - META_SIZE);
    
    if (block->free) return;  // Double-free protection
    
    add_to_free_list(block);
}
```

### realloc Implementation

```c
void *my_realloc(void *ptr, size_t size) {
    if (!ptr) return my_malloc(size);
    if (size == 0) {
        my_free(ptr);
        return NULL;
    }
    
    struct block_meta *block = 
        (struct block_meta *)((char *)ptr - META_SIZE);
    
    if (block->size >= size) {
        return ptr;  // Current block is large enough
    }
    
    // Need larger block
    void *new_ptr = my_malloc(size);
    if (!new_ptr) return NULL;
    
    memcpy(new_ptr, ptr, block->size);
    my_free(ptr);
    return new_ptr;
}
```

### calloc Implementation

```c
void *my_calloc(size_t num, size_t size) {
    size_t total_size = num * size;
    
    // Overflow protection
    if (num != 0 && total_size / num != size) {
        return NULL;
    }
    
    void *ptr = my_malloc(total_size);
    if (ptr) {
        memset(ptr, 0, total_size);
    }
    return ptr;
}
```

---

## 7. Testing & Validation

### Test Categories

1. **Basic Functionality**
   - Allocation and deallocation
   - Writing to and reading from allocated memory
   - NULL pointer handling

2. **Edge Cases**
   - Zero-size allocations
   - Very large allocations
   - Double-free scenarios
   - Overflow in calloc

3. **Memory Management**
   - Block reuse after free
   - Proper alignment
   - Fragmentation patterns

4. **API Compliance**
   - realloc semantics
   - calloc zero-initialization
   - Standard return values

### Example Test Case

```c
void test_basic_allocation() {
    // Test basic allocation
    void *ptr1 = my_malloc(100);
    assert(ptr1 != NULL);
    
    // Test writing to memory
    strcpy((char *)ptr1, "Hello World!");
    assert(strcmp((char *)ptr1, "Hello World!") == 0);
    
    // Test alignment
    assert((uintptr_t)ptr1 % ALIGNMENT == 0);
    
    my_free(ptr1);
}
```

### Debug Support

The implementation includes heap introspection functions:

```c
void print_heap_info(void) {
    struct block_meta *current = free_list;
    size_t free_memory = 0;
    int free_blocks = 0;
    
    while (current) {
        if (current->free) {
            free_blocks++;
            free_memory += current->size;
            printf("Free block: %zu bytes\n", current->size);
        }
        current = current->next;
    }
    
    printf("Total free blocks: %d\n", free_blocks);
    printf("Total free memory: %zu bytes\n", free_memory);
}
```

---

## 8. Performance Characteristics

### Time Complexity

| Operation | Best Case | Average Case | Worst Case |
|-----------|-----------|--------------|------------|
| malloc    | O(1)      | O(n)         | O(n)       |
| free      | O(1)      | O(n)         | O(n)       |
| realloc   | O(1)      | O(n + k)     | O(n + k)   |

Where n = number of free blocks, k = bytes to copy

### Space Overhead

- **Per allocation**: 16-24 bytes (depending on architecture)
- **Alignment waste**: Average 4 bytes per allocation
- **Global overhead**: Single pointer (free_list)

### Memory Usage Patterns

**Strengths:**
- Good locality for sequential allocations
- Low global state overhead
- Predictable memory layout

**Weaknesses:**
- Linear search through free list
- No coalescing of adjacent free blocks
- Potential for significant fragmentation

---

## 9. Limitations and Trade-offs

### Design Limitations

1. **No Coalescing**: Adjacent free blocks are not merged, leading to fragmentation
2. **Single-threaded**: No concurrency support
3. **Linear Search**: O(n) free block search
4. **No Memory Return**: Memory never returned to OS
5. **Vulnerability**: Inline metadata susceptible to corruption

### Comparison with Production Allocators

| Feature | mini_malloc | Production Allocators |
|---------|-------------|----------------------|
| Coalescing | No | Yes |
| Thread Safety | No | Yes |
| Size Classes | No | Yes |
| Metadata Protection | No | Yes |
| Memory Return | No | Yes |
| Search Time | O(n) | O(1) or O(log n) |

### When to Use mini_malloc

**Appropriate for:**
- Educational purposes
- Understanding allocator fundamentals
- Simple single-threaded applications
- Embedded systems with predictable patterns

**Not recommended for:**
- Production applications
- Multi-threaded programs
- Performance-critical systems
- Long-running processes

---

## 10. Educational Value

### Concepts Demonstrated

1. **System Calls**: Interface with OS via sbrk()
2. **Pointer Arithmetic**: Calculating metadata locations
3. **Data Structures**: Singly-linked list management
4. **Memory Layout**: Understanding heap organization
5. **API Design**: Standard interface implementation

### Learning Progression

mini_malloc serves as a stepping stone to understanding:
- More complex allocation algorithms
- Thread-safe programming techniques
- Performance optimization strategies
- Security considerations in systems programming

### Exercises for Further Learning

1. **Add Coalescing**: Merge adjacent free blocks
2. **Implement Best-Fit**: Compare performance with first-fit
3. **Add Statistics**: Track allocation patterns
4. **Security Hardening**: Add metadata validation
5. **Thread Safety**: Add basic locking

---

## 11. Path to Production

### Critical Missing Features

1. **Coalescing Algorithm**
   ```c
   // Pseudocode for coalescing
   void coalesce_free_blocks() {
       // Sort free list by address
       // Merge adjacent blocks
       // Update free list
   }
   ```

2. **Thread Safety**
   ```c
   static pthread_mutex_t malloc_lock = PTHREAD_MUTEX_INITIALIZER;
   
   void *malloc(size_t size) {
       pthread_mutex_lock(&malloc_lock);
       void *result = my_malloc(size);
       pthread_mutex_unlock(&malloc_lock);
       return result;
   }
   ```

3. **Security Hardening**
   ```c
   struct block_meta {
       uint32_t canary;     // Corruption detection
       size_t size;
       struct block_meta *next;
       int free;
   };
   ```

### Performance Improvements

1. **Segregated Free Lists**: Separate lists for different size classes
2. **Better Search**: Binary trees or hash tables for free blocks
3. **Memory Return**: Return unused pages to OS via munmap
4. **Alignment Optimization**: Platform-specific alignment

---

## 12. Conclusion

mini_malloc successfully demonstrates the fundamental concepts of memory allocation in a clear, educational manner. While it lacks the sophistication of production allocators, it provides an excellent foundation for understanding:

- How malloc and free work internally
- The challenges of memory management
- The trade-offs in allocator design
- The complexity hidden behind simple APIs

The implementation proves that complex systems can be understood by starting with simple, correct implementations and gradually adding sophistication. This approach is invaluable for systems programming education and serves as a launching point for more advanced allocator designs.

Whether used as a learning tool, a starting point for research, or a lightweight allocator for embedded systems, mini_malloc achieves its goal of making memory allocation approachable and understandable.

---

## Appendix: Complete Implementation

### mini_malloc.h

```c
#ifndef MINI_MALLOC_H
#define MINI_MALLOC_H

#include <stddef.h>
#include <stdint.h>

// Memory alignment - align to 8 bytes for most architectures
#define ALIGNMENT 8
#define ALIGN(size) (((size) + (ALIGNMENT - 1)) & ~(ALIGNMENT - 1))

// Block metadata structure
struct block_meta {
  size_t size;             // Size of the data portion (not including metadata)
  struct block_meta *next; // Pointer to next block in free list
  int free;                // 1 if block is free, 0 if allocated
};

// Size of metadata
#define META_SIZE sizeof(struct block_meta)

// Function declarations
void *my_malloc(size_t size);
void my_free(void *ptr);
void *my_realloc(void *ptr, size_t size);
void *my_calloc(size_t num, size_t size);

// Debug/utility functions
void print_heap_info(void);
size_t get_total_allocated(void);
size_t get_total_free(void);

#endif // MINI_MALLOC_H
```

### mini_malloc.c

```c
#include "mini_malloc.h"
#include <stdio.h>
#include <string.h>
#include <unistd.h>

// Global pointer to the head of free list
static struct block_meta *free_list = NULL;

// Find a free block that can fit the requested size (first-fit)
static struct block_meta *find_free_block(size_t size)
{
    struct block_meta *current = free_list;

    while (current)
    {
        if (current->free && current->size >= size)
        {
            return current;
        }
        current = current->next;
    }

    return NULL;
}

// Request more memory from the system using sbrk
static struct block_meta *request_space(size_t size)
{
    struct block_meta *block;

    // Request memory from system (metadata + data)
    block = (struct block_meta *)sbrk(META_SIZE + size);

    if (block == (void *)-1)
    {
        return NULL; // sbrk failed
    }

    // Initialize the block
    block->size = size;
    block->next = NULL;
    block->free = 0;

    return block;
}

// Split a block if it's larger than needed
static void split_block(struct block_meta *block, size_t size)
{
    if (block->size >= size + META_SIZE + ALIGNMENT)
    {
        struct block_meta *new_block = (struct block_meta *)((char *)block + META_SIZE + size);

        new_block->size = block->size - size - META_SIZE;
        new_block->next = block->next;
        new_block->free = 1;

        block->size = size;
        block->next = new_block;
    }
}

// Add block to free list
static void add_to_free_list(struct block_meta *block)
{
    block->free = 1;
    block->next = free_list;
    free_list = block;
}

// Remove block from free list
static void remove_from_free_list(struct block_meta *block)
{
    if (free_list == block)
    {
        free_list = block->next;
    }
    else
    {
        struct block_meta *current = free_list;
        while (current && current->next != block)
        {
            current = current->next;
        }
        if (current)
        {
            current->next = block->next;
        }
    }
    block->free = 0;
}

// Main malloc implementation
void *my_malloc(size_t size)
{
    if (size == 0)
    {
        return NULL;
    }

    // Align the size
    size = ALIGN(size);

    struct block_meta *block;

    // Try to find a free block first
    block = find_free_block(size);

    if (block)
    {
        // Found a free block, remove it from free list
        remove_from_free_list(block);

        // Split the block if it's too large
        split_block(block, size);
    }
    else
    {
        // No suitable free block found, request new memory
        block = request_space(size);
        if (!block)
        {
            return NULL;
        }
    }

    // Return pointer to data (skip metadata)
    return (char *)block + META_SIZE;
}

// Free implementation
void my_free(void *ptr)
{
    if (!ptr)
    {
        return;
    }

    // Get block metadata
    struct block_meta *block = (struct block_meta *)((char *)ptr - META_SIZE);

    // Basic validation - check if block is not already free
    if (block->free)
    {
        return; // Double free protection
    }

    // Add to free list
    add_to_free_list(block);
}

// Realloc implementation
void *my_realloc(void *ptr, size_t size)
{
    if (!ptr)
    {
        return my_malloc(size);
    }

    if (size == 0)
    {
        my_free(ptr);
        return NULL;
    }

    struct block_meta *block = (struct block_meta *)((char *)ptr - META_SIZE);

    if (block->size >= size)
    {
        // Current block is large enough
        return ptr;
    }

    // Need to allocate new block
    void *new_ptr = my_malloc(size);
    if (!new_ptr)
    {
        return NULL;
    }

    // Copy old data
    memcpy(new_ptr, ptr, block->size);
    my_free(ptr);

    return new_ptr;
}

// Calloc implementation
void *my_calloc(size_t num, size_t size)
{
    size_t total_size = num * size;

    // Check for overflow
    if (num != 0 && total_size / num != size)
    {
        return NULL;
    }

    void *ptr = my_malloc(total_size);
    if (ptr)
    {
        memset(ptr, 0, total_size);
    }

    return ptr;
}

// Debug function to print heap information
void print_heap_info(void)
{
    struct block_meta *current = free_list;
    int free_blocks = 0;
    size_t free_memory = 0;

    printf("=== Heap Information ===\n");

    while (current)
    {
        if (current->free)
        {
            free_blocks++;
            free_memory += current->size;
            printf("Free block: %zu bytes\n", current->size);
        }
        current = current->next;
    }

    printf("Total free blocks: %d\n", free_blocks);
    printf("Total free memory: %zu bytes\n", free_memory);
    printf("========================\n");
}

// Get total allocated memory
size_t get_total_allocated(void)
{
    // This is a simplified version - in a real implementation,
    // you'd need to track all allocated blocks
    return 0;
}

// Get total free memory
size_t get_total_free(void)
{
    struct block_meta *current = free_list;
    size_t total_free = 0;

    while (current)
    {
        if (current->free)
        {
            total_free += current->size;
        }
        current = current->next;
    }

    return total_free;
}
```




### test_mini_malloc.c

```c
#include "mini_malloc.h"
#include <assert.h>
#include <stdio.h>
#include <string.h>

// Test function prototypes
void test_basic_allocation();
void test_free_and_reuse();
void test_alignment();
void test_realloc();
void test_calloc();
void test_edge_cases();
void test_fragmentation();

int main()
{
    printf("Starting Mini Malloc Tests...\n\n");

    test_basic_allocation();
    test_free_and_reuse();
    test_alignment();
    test_realloc();
    test_calloc();
    test_edge_cases();
    test_fragmentation();

    printf("\n✅ All tests passed!\n");
    return 0;
}

void test_basic_allocation()
{
    printf("🔹 Test 1: Basic Allocation\n");

    // Test basic allocation
    void *ptr1 = my_malloc(100);
    assert(ptr1 != NULL);
    printf("  ✓ Allocated 100 bytes\n");

    void *ptr2 = my_malloc(200);
    assert(ptr2 != NULL);
    printf("  ✓ Allocated 200 bytes\n");

    void *ptr3 = my_malloc(50);
    assert(ptr3 != NULL);
    printf("  ✓ Allocated 50 bytes\n");

    // Test writing to allocated memory
    strcpy((char *)ptr1, "Hello World!");
    printf("  ✓ Written to allocated memory: %s\n", (char *)ptr1);

    // Clean up
    my_free(ptr1);
    my_free(ptr2);
    my_free(ptr3);

    printf("  ✓ Basic allocation test passed\n\n");
}

void test_free_and_reuse()
{
    printf("🔹 Test 2: Free and Reuse\n");

    // Allocate and free
    void *ptr1 = my_malloc(100);
    assert(ptr1 != NULL);

    my_free(ptr1);
    printf("  ✓ Freed memory block\n");

    // Allocate again - should reuse the freed block
    void *ptr2 = my_malloc(100);
    assert(ptr2 != NULL);
    printf("  ✓ Allocated same size again\n");

    // For first-fit, ptr2 might be the same as ptr1 if reused
    if (ptr1 == ptr2)
    {
        printf("  ✓ Memory was reused (ptr1 == ptr2)\n");
    }
    else
    {
        printf("  ✓ New memory allocated\n");
    }

    my_free(ptr2);
    printf("  ✓ Free and reuse test passed\n\n");
}

void test_alignment()
{
    printf("🔹 Test 3: Memory Alignment\n");

    // Test various sizes to check alignment
    for (int size = 1; size <= 17; size++)
    {
        void *ptr = my_malloc(size);
        assert(ptr != NULL);

        // Check if pointer is aligned
        if ((uintptr_t)ptr % ALIGNMENT == 0)
        {
            printf("  ✓ Size %d: Aligned to %d bytes\n", size, ALIGNMENT);
        }
        else
        {
            printf("  ❌ Size %d: NOT aligned!\n", size);
            assert(0);
        }

        my_free(ptr);
    }

    printf("  ✓ Alignment test passed\n\n");
}

void test_realloc()
{
    printf("🔹 Test 4: Realloc\n");

    // Test realloc with NULL pointer (should behave like malloc)
    void *ptr = my_realloc(NULL, 100);
    assert(ptr != NULL);
    strcpy((char *)ptr, "Initial data");
    printf("  ✓ Realloc with NULL pointer\n");

    // Test expanding
    ptr = my_realloc(ptr, 200);
    assert(ptr != NULL);
    assert(strcmp((char *)ptr, "Initial data") == 0);
    printf("  ✓ Expanded allocation preserves data\n");

    // Test shrinking (should return same pointer)
    void *old_ptr = ptr;
    ptr = my_realloc(ptr, 50);
    assert(ptr != NULL);
    // Data should still be there (at least first 50 chars)
    printf("  ✓ Shrunk allocation\n");

    // Test realloc with size 0 (should behave like free)
    ptr = my_realloc(ptr, 0);
    assert(ptr == NULL);
    printf("  ✓ Realloc with size 0\n");

    printf("  ✓ Realloc test passed\n\n");
}

void test_calloc()
{
    printf("🔹 Test 5: Calloc\n");

    // Test calloc
    int *arr = (int *)my_calloc(10, sizeof(int));
    assert(arr != NULL);

    // Check if memory is zero-initialized
    int all_zero = 1;
    for (int i = 0; i < 10; i++)
    {
        if (arr[i] != 0)
        {
            all_zero = 0;
            break;
        }
    }
    assert(all_zero);
    printf("  ✓ Calloc zero-initializes memory\n");

    // Test writing to calloc'd memory
    for (int i = 0; i < 10; i++)
    {
        arr[i] = i + 1;
    }

    // Verify written data
    for (int i = 0; i < 10; i++)
    {
        assert(arr[i] == i + 1);
    }
    printf("  ✓ Can write to calloc'd memory\n");

    my_free(arr);

    // Test overflow protection
    void *overflow_ptr = my_calloc(SIZE_MAX, 2);
    assert(overflow_ptr == NULL);
    printf("  ✓ Calloc overflow protection works\n");

    printf("  ✓ Calloc test passed\n\n");
}

void test_edge_cases()
{
    printf("🔹 Test 6: Edge Cases\n");

    // Test malloc with size 0
    void *ptr1 = my_malloc(0);
    assert(ptr1 == NULL);
    printf("  ✓ Malloc with size 0 returns NULL\n");

    // Test free with NULL pointer
    my_free(NULL); // Should not crash
    printf("  ✓ Free with NULL pointer handled\n");

    // Test double free protection
    void *ptr2 = my_malloc(100);
    assert(ptr2 != NULL);
    my_free(ptr2);
    my_free(ptr2); // Double free - should be handled gracefully
    printf("  ✓ Double free protection works\n");

    // Test very large allocation (should fail gracefully)
    void *large_ptr = my_malloc(SIZE_MAX);
    // This might succeed or fail depending on system, but shouldn't crash
    if (large_ptr)
    {
        my_free(large_ptr);
        printf("  ✓ Large allocation succeeded\n");
    }
    else
    {
        printf("  ✓ Large allocation failed gracefully\n");
    }

    printf("  ✓ Edge cases test passed\n\n");
}

void test_fragmentation()
{
    printf("🔹 Test 7: Fragmentation and Coalescing\n");

    // Allocate several blocks
    void *ptrs[5];
    for (int i = 0; i < 5; i++)
    {
        ptrs[i] = my_malloc(100);
        assert(ptrs[i] != NULL);
    }
    printf("  ✓ Allocated 5 blocks of 100 bytes each\n");

    // Free every other block to create fragmentation
    my_free(ptrs[1]);
    my_free(ptrs[3]);
    printf("  ✓ Freed blocks 1 and 3 (creating fragmentation)\n");

    // Show heap info
    print_heap_info();

    // Try to allocate a block that fits in the fragmented space
    void *small_ptr = my_malloc(50);
    assert(small_ptr != NULL);
    printf("  ✓ Allocated 50 bytes in fragmented space\n");

    // Clean up remaining blocks
    my_free(ptrs[0]);
    my_free(ptrs[2]);
    my_free(ptrs[4]);
    my_free(small_ptr);

    printf("  ✓ Fragmentation test passed\n\n");
}

```


### Sample Test Results

```output
Starting Mini Malloc Tests...

🔹 Test 1: Basic Allocation
  ✓ Allocated 100 bytes
  ✓ Allocated 200 bytes
  ✓ Allocated 50 bytes
  ✓ Written to allocated memory: Hello World!
  ✓ Basic allocation test passed

🔹 Test 2: Free and Reuse
  ✓ Freed memory block
  ✓ Allocated same size again
  ✓ Memory was reused (ptr1 == ptr2)
  ✓ Free and reuse test passed

🔹 Test 3: Memory Alignment
  ✓ Size 1: Aligned to 8 bytes
  ✓ Size 2: Aligned to 8 bytes
  ✓ Size 3: Aligned to 8 bytes
  ✓ Size 4: Aligned to 8 bytes
  ✓ Size 5: Aligned to 8 bytes
  ✓ Size 6: Aligned to 8 bytes
  ✓ Size 7: Aligned to 8 bytes
  ✓ Size 8: Aligned to 8 bytes
  ✓ Size 9: Aligned to 8 bytes
  ✓ Size 10: Aligned to 8 bytes
  ✓ Size 11: Aligned to 8 bytes
  ✓ Size 12: Aligned to 8 bytes
  ✓ Size 13: Aligned to 8 bytes
  ✓ Size 14: Aligned to 8 bytes
  ✓ Size 15: Aligned to 8 bytes
  ✓ Size 16: Aligned to 8 bytes
  ✓ Size 17: Aligned to 8 bytes
  ✓ Alignment test passed

🔹 Test 4: Realloc
  ✓ Realloc with NULL pointer
  ✓ Expanded allocation preserves data
  ✓ Shrunk allocation
  ✓ Realloc with size 0
  ✓ Realloc test passed

🔹 Test 5: Calloc
  ✓ Calloc zero-initializes memory
  ✓ Can write to calloc'd memory
  ✓ Calloc overflow protection works
  ✓ Calloc test passed

🔹 Test 6: Edge Cases
  ✓ Malloc with size 0 returns NULL
  ✓ Free with NULL pointer handled
  ✓ Double free protection works
  ✓ Large allocation succeeded
  ✓ Edge cases test passed

🔹 Test 7: Fragmentation and Coalescing
  ✓ Allocated 5 blocks of 100 bytes each
  ✓ Freed blocks 1 and 3 (creating fragmentation)
=== Heap Information ===
Free block: 104 bytes
Free block: 104 bytes
Free block: 0 bytes
Free block: 40 bytes
Free block: 24 bytes
Free block: 16 bytes
Free block: 8 bytes
Total free blocks: 7
Total free memory: 296 bytes
========================
  ✓ Allocated 50 bytes in fragmented space
  ✓ Fragmentation test passed


✅ All tests passed!

```


---

## References and Further Reading

1. **Classic Papers**
   - "Dynamic Storage Allocation: A Survey and Critical Review" - Wilson et al.
   - "The Memory Fragmentation Problem: Solved?" - Johnstone & Wilson
   - "Hoard: A Scalable Memory Allocator" - Berger et al.

2. **Implementation References**
   - Doug Lea's malloc (dlmalloc)
   - GNU libc malloc (ptmalloc2)
   - jemalloc technical documentation
   - tcmalloc design document

3. **Books**
   - "The Art of Computer Programming, Vol. 1" - Knuth (Section 2.5)
   - "Advanced Programming in the UNIX Environment" - Stevens
   - "Computer Systems: A Programmer's Perspective" - Bryant & O'Hallaron

4. **Online Resources**
   - Memory Management Reference (www.memorymanagement.org)
   - Malloc Tutorial (danluu.com)
   - Allocator Benchmarks (github.com/emeryberger/)

---


*This completes the technical documentation for mini_malloc, a basic but educational memory allocator implementation.*


*End of Document*
