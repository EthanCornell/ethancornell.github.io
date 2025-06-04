---
layout: page
permalink: /repositories/
title: repositories
# description: Edit the `_data/repositories.yml` and change the `github_users` and `github_repos` lists to include your own GitHub profile and repositories.
description: A curated collection of my system-level and backend engineering projects, focused on concurrency, distributed systems, memory management, and performance optimization. These include a sanitizer-clean Michael–Scott queue with hybrid memory reclamation, a crash-resilient UDP-based distributed file system, enhancements to the Harmony model checker, memory subsystem improvements for the egos-2000 RISC-V OS, lock-free concurrency work on FreeBSD’s Netgraph, and a fault-tolerant file migration tool with real-time telemetry. Each project emphasizes robustness, efficiency, and maintainability, with source code, documentation, and CI pipelines available for review.
nav: true
nav_order: 4

---

{% if site.data.repositories.github_users %}

<!-- ## GitHub users

<div class="repositories d-flex flex-wrap flex-md-row flex-column justify-content-between align-items-center">
  {% for user in site.data.repositories.github_users %}
    {% include repository/repo_user.liquid username=user %}
  {% endfor %}
</div> -->

---

<!-- {% if site.repo_trophies.enabled %}
{% for user in site.data.repositories.github_users %}
{% if site.data.repositories.github_users.size > 1 %}

  <h4>{{ user }}</h4>
  {% endif %}
  <div class="repositories d-flex flex-wrap flex-md-row flex-column justify-content-between align-items-center">
  {% include repository/repo_trophies.liquid username=user %}
  </div> -->


{% if site.repo_trophies.enabled %}
{% for user in site.data.repositories.github_users %}
<div class="repositories d-flex flex-wrap flex-md-row flex-column justify-content-between align-items-center">
  <img src="https://github-profile-trophy.vercel.app/?username={{ user }}&theme=flat&column=6&no-bg=true&no-frame=true&exclude=issues,reviews" alt="{{ user }} GitHub Trophy Stats" />
</div>
{% endfor %}
{% endif %}



---

{% endfor %}
{% endif %}
{% endif %}

{% if site.data.repositories.github_repos %}

<!-- --- -->
## Most Used Programming Languages

<img src="https://github-readme-stats.vercel.app/api/top-langs/?username=EthanCornell&layout=compact&langs_count=8&theme=default&hide=html,terra,perl,javascript,raku,scss,roff" alt="Top Languages" />


---

<!-- ## GitHub Repositories

<div class="repositories d-flex flex-wrap flex-md-row flex-column justify-content-between align-items-center">
  {% for repo in site.data.repositories.github_repos %}
    {% include repository/repo.liquid repository=repo %}
  {% endfor %}
</div>
{% endif %} -->


<!-- --- -->

## Selected Projects
<div class="repositories d-flex flex-wrap flex-md-row flex-column justify-content-between align-items-center">
  {% for repo in site.data.repositories.github_repos %}
    {% if repo.selected %}
      {% include repository/repo.liquid repository=repo.repo %}
    {% endif %}
  {% endfor %}
</div>

---

## GitHub Repositories
<div class="repositories d-flex flex-wrap flex-md-row flex-column justify-content-between align-items-center">
  {% for repo in site.data.repositories.github_repos %}
    {% unless repo.selected %}
      {% include repository/repo.liquid repository=repo.repo %}
    {% endunless %}
  {% endfor %}
</div>

