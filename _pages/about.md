---
layout: about
title: about
permalink: /
# subtitle: <a href='#'>Affiliations</a>. Address. Contacts. Motto. Etc.

# profile:
#   align: right
#   image: prof_pic.jpg
#   image_circular: false # crops the image to make it circular
#   more_info: >
#     <p>555 your office number</p>
#     <p>123 your address street</p>
#     <p>Your City, State 12345</p>

profile:
  align: right
  image: mypic1.png
  image_circular: false # crops the image to make it circular
  more_info: >

    <p>New York, NY</p>

selected_papers: false # includes a list of papers marked as "selected={true}"
selected_projects: false # includes a list of projects marked as "selected={true}"
social: true # includes social icons at the bottom of the page

announcements:
  enabled: true # includes a list of news items
  scrollable: true # adds a vertical scroll bar if there are more than 3 news items
  limit: 6 # leave blank to include all the news in the `_news` folder

latest_posts:
  enabled: true
  scrollable: true # adds a vertical scroll bar if there are more than 3 new posts items
  limit: 10 # leave blank to include all the blog posts
---

<!-- Write your biography here. Tell the world about yourself. Link to your favorite [subreddit](http://reddit.com). You can put a picture in, too. The code is already in, just name your picture `prof_pic.jpg` and put it in the `img/` folder.

Put your address / P.O. box / other info right below your picture. You can also disable any of these elements by editing `profile` property of the YAML header of your `_pages/about.md`. Edit `_bibliography/papers.bib` and Jekyll will render your [publications page](/al-folio/publications/) automatically.

Link to your social media connections, too. This theme is set up to use [Font Awesome icons](https://fontawesome.com/) and [Academicons](https://jpswalsh.github.io/academicons/), like the ones below. Add your Facebook, Twitter, LinkedIn, Google Scholar, or just disable all of them. -->


I’m a systems-focused software engineer with a background in operating systems, concurrency, and performance-critical backend development. I earned my Master’s in Computer Science from  from [Cornell Tech](https://tech.cornell.edu/), [Cornell University](https://www.cornell.edu/), where I specialized in building reliable, low-level infrastructure and lock-free data structures.

My work spans across academic research, industry, and open source. At Cornell, I built a sanitizer-clean Michael–Scott queue with hybrid memory reclamation (hazard pointers + epoch-based reclamation), achieving strong throughput under high contention with zero ABA or use-after-free issues. I also designed a UDP-based, crash-resilient distributed file system with a POSIX-style client API and idempotent RPC handling. In addition, I contributed to the Harmony model checker by optimizing its concurrency model and scaling its performance on multi-core systems, and enhanced the egos-2000 RISC-V OS with a soft TLB and two-level page table for better memory efficiency and robustness.

In open source, I’ve worked on the FreeBSD networking stack, improving Netgraph concurrency with lock-free programming and memory-safe synchronization under heavy network load. Prior to Cornell, I gained industry experience at ASUS, PCPartner, and Viking Family International, where I built real-time inventory engines, media apps, and CI pipelines, always with a focus on correctness, scalability, and performance.

Currently based in New York, I enjoy working on problems that push the limits of concurrency, fault tolerance, and system efficiency, whether in kernel code, backend services, or distributed infrastructure.
