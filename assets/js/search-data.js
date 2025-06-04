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

