---
layout: page
permalink: /repositories/
title: repositories
# description: Edit the `_data/repositories.yml` and change the `github_users` and `github_repos` lists to include your own GitHub profile and repositories.
description:
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
  <img src="https://github-profile-trophy.vercel.app/?username={{ user }}&theme=flat&column=6&no-bg=true&no-frame=true&exclude=Issues,Reviews" alt="{{ user }} GitHub Trophy Stats" />
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

## GitHub Repositories

<div class="repositories d-flex flex-wrap flex-md-row flex-column justify-content-between align-items-center">
  {% for repo in site.data.repositories.github_repos %}
    {% include repository/repo.liquid repository=repo %}
  {% endfor %}
</div>
{% endif %}
