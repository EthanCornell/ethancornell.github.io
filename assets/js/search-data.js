// get the ninja-keys element
const ninja = document.querySelector('ninja-keys');

// add the home and posts menu items
ninja.data = [{
    id: "nav-about",
    title: "about",
    section: "Navigation",
    handler: () => {
      window.location.href = "/";
    },
  },{id: "nav-blog",
          title: "blog",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/blog/";
          },
        },{id: "nav-repositories",
          title: "repositories",
          description: "A curated collection of my system-level and backend engineering projects, focused on concurrency, distributed systems, memory management, and performance optimization. These include a sanitizer-clean Michael–Scott queue with hybrid memory reclamation, a crash-resilient UDP-based distributed file system, enhancements to the Harmony model checker, memory subsystem improvements for the egos-2000 RISC-V OS, lock-free concurrency work on FreeBSD’s Netgraph, and a fault-tolerant file migration tool with real-time telemetry. Each project emphasizes robustness, efficiency, and maintainability, with source code, documentation, and CI pipelines available for review.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/repositories/";
          },
        },{id: "nav-cv",
          title: "cv",
          description: "Systems-focused software engineer with experience in concurrency, backend infrastructure, and performance optimization. Skilled in designing efficient, low-level systems for distributed environments, and passionate about building reliable, scalable software. Currently expanding expertise in large-scale computing, OS internals, and cloud-native architectures, with a strong interest in contributing to high-impact engineering teams.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/cv/";
          },
        },{id: "post-real-time-cryptocurrency-trade-correlation-engine-a-high-performance-c-implementation",
        
          title: "Real-Time Cryptocurrency Trade Correlation Engine: A High-Performance C++ Implementation",
        
        description: "Production-quality C++ system for real-time cryptocurrency trade aggregation and correlation detection across multiple exchanges",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2025/RESTFULAPI/";
          
        },
      },{id: "post-from-0-37x-to-18-7x-building-a-high-performance-simd-library-with-avx-512-speedups-in-data-science-inference-amp-hpc-workloads",
        
          title: "From 0.37x to 18.7x: Building a High-Performance SIMD Library with AVX-512 Speedups in...",
        
        description: "A comprehensive technical journey through building a high-performance SIMD library, achieving extraordinary speedups through masked operations, multiple data types, and advanced CPU feature detection.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2025/SIMD/";
          
        },
      },{id: "post-lock-free-queues-with-advanced-memory-reclamation-a-deep-dive-into-epoch-based-reclamation-and-hazard-pointers",
        
          title: "Lock-Free Queues with Advanced Memory Reclamation: A Deep Dive into Epoch-Based Reclamation and...",
        
        description: "Understanding how modern concurrent systems solve the memory reclamation problem in lock-free data structures",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2025/LFQ_EBR/";
          
        },
      },{id: "post-from-245s-to-0-37s-optimizing-an-mpi-traveling-salesman-solver",
        
          title: "From 245s to 0.37s: Optimizing an MPI Traveling Salesman Solver",
        
        description: "A comprehensive technical journey through four iterations of MPI-based TSP solver optimization, achieving a 635× performance improvement through algorithmic enhancements, hybrid parallelization, and careful engineering.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2025/TSPMP/";
          
        },
      },{id: "post-level-3-mini-malloc-a-security-enhanced-memory-allocator-with-debugging-features",
        
          title: "Level 3 mini_malloc: A Security-Enhanced Memory Allocator with Debugging Features",
        
        description: "Technical deep-dive into mini_malloc - a memory allocator showcasing security-enhanced design patterns and debugging infrastructure. Demonstrates arena-based concurrency, immediate coalescing, dual allocation strategies, and corruption detection mechanisms. Features complete implementation (~800 lines), comprehensive test coverage, and detailed performance analysis comparing against system malloc.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2025/adv_memory/";
          
        },
      },{id: "post-level-2-mini-malloc-from-scratch-to-safe-building-a-thread-safe-memory-allocator-in-c",
        
          title: "Level 2 mini_malloc: From Scratch to Safe: Building a Thread-Safe Memory Allocator in...",
        
        description: "This document provides an in-depth look at the design and implementation of **mini_malloc**, a small, first-fit, thread-safe memory allocator in C. It covers the allocator’s architecture, data structures, algorithms, debugging facilities, and testing strategy.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2025/memory/";
          
        },
      },{id: "post-level-1-mini-malloc-a-basic-first-fit-memory-allocator",
        
          title: "Level 1 mini_malloc: A Basic First-Fit Memory Allocator",
        
        description: "",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2025/basic_memory/";
          
        },
      },{id: "post-modern-concurrent-red-black-tree-design-in-c-a-practical-guide-part-1",
        
          title: "Modern Concurrent Red-Black Tree Design in C++: A Practical Guide - Part 1...",
        
        description: "Sharing ideas on making a Red-Black Tree thread-safe using C++ shared_mutex and multiple reader strategies, plus visual flowcharts for insert/delete under concurrency",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2025/conrbtree/";
          
        },
      },{id: "news-may-2023-graduated-from-cornell-tech-cornell-university-with-m-eng-in-computer-science",
          title: 'May 2023 – Graduated from Cornell Tech, Cornell University with M.Eng in Computer...',
          description: "",
          section: "News",},{id: "news-in-april-2024-i-joined-the-freebsd-community-as-an-independent-contributor-focusing-on-kernel-module-optimization-netgraph-subsystem-refactoring-and-experimenting-with-zero-copy-ipc-using-epoch-9-epoch-based-memory-reclamation",
          title: 'In April 2024, I joined the FreeBSD community as an independent contributor, focusing...',
          description: "",
          section: "News",},{
        id: 'social-email',
        title: 'email',
        section: 'Socials',
        handler: () => {
          window.open("mailto:%65%74%68%61%6E.%68%75%61%6E%67.%69%68@%67%6D%61%69%6C.%63%6F%6D", "_blank");
        },
      },{
        id: 'social-github',
        title: 'GitHub',
        section: 'Socials',
        handler: () => {
          window.open("https://github.com/EthanCornell", "_blank");
        },
      },{
        id: 'social-linkedin',
        title: 'LinkedIn',
        section: 'Socials',
        handler: () => {
          window.open("https://www.linkedin.com/in/ethanhuang-ih", "_blank");
        },
      },{
      id: 'light-theme',
      title: 'Change theme to light',
      description: 'Change the theme of the site to Light',
      section: 'Theme',
      handler: () => {
        setThemeSetting("light");
      },
    },
    {
      id: 'dark-theme',
      title: 'Change theme to dark',
      description: 'Change the theme of the site to Dark',
      section: 'Theme',
      handler: () => {
        setThemeSetting("dark");
      },
    },
    {
      id: 'system-theme',
      title: 'Use system default theme',
      description: 'Change the theme of the site to System Default',
      section: 'Theme',
      handler: () => {
        setThemeSetting("system");
      },
    },];

