
const API = (window.GO7_CONFIG?.API_BASE || "").replace(/\/$/, "");

const state = {
  category: "",
  search: "",
  offset: 0,
  limit: 30,
  hasMore: false,
  loading: false
};

const $ = (id) => document.getElementById(id);

if ($("year")) {
  $("year").textContent = new Date().getFullYear();
}

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function dateLabel(value) {
  if (!value) return "Recently added";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently added";
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function showEmpty(message) {
  if ($("postList")) {
    $("postList").innerHTML =
      `<div class="empty-panel">${esc(message)}</div>`;
  }
}

function renderPosts(posts, append = false) {
  const html = posts.map((post) => `
    <article class="post">
      <div class="post-meta">
        <span class="pill">
          ${esc(post.category_label || post.category || "Update")}
        </span>
        <span>
          ${esc(dateLabel(post.published_at || post.created_at))}
        </span>
      </div>

      <h3>${esc(post.title || "Government Update")}</h3>

      <p>
        ${esc(
          post.summary ||
          "Open the original publisher's notice for complete details."
        )}
      </p>

      <a href="/detail.html?id=${encodeURIComponent(post.id)}">
        View full details →
      </a>
    </article>
  `).join("");

  if (!append) {
    $("postList").innerHTML = html;
  } else if (html) {
    $("postList").insertAdjacentHTML("beforeend", html);
  }
}

async function fetchCategory(category) {
  const panel = document.querySelector(
    `[data-category="${category}"] .panel-body`
  );

  if (!panel || !API) return;

  try {
    const query = new URLSearchParams({
      category,
      limit: "8",
      offset: "0"
    });

    const response = await fetch(`${API}/api/posts?${query}`);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();

    panel.innerHTML = (data.posts || []).map((post) => `
      <a class="feed-link"
         href="/detail.html?id=${encodeURIComponent(post.id)}">
        ${esc(post.title)}
      </a>
    `).join("") || `
      <div class="empty-panel">
        No updates published in this category yet.
      </div>
    `;
  } catch (error) {
    console.error("Category loading error:", category, error);

    panel.innerHTML = `
      <div class="empty-panel">
        Unable to load updates. Please try again.
      </div>
    `;
  }
}

async function loadPosts(append = false) {
  if (state.loading || !API) return;

  if (!append) {
    state.offset = 0;
  }

  state.loading = true;

  if ($("status")) {
    $("status").textContent = "Loading updates…";
  }

  const query = new URLSearchParams({
    limit: String(state.limit),
    offset: String(state.offset)
  });

  if (state.category) {
    query.set("category", state.category);
  }

  if (state.search) {
    query.set("q", state.search);
  }

  try {
    const response = await fetch(`${API}/api/posts?${query}`);

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    const posts = data.posts || [];

    renderPosts(posts, append);

    state.hasMore = Boolean(data.has_more);

    if ($("loadMore")) {
      $("loadMore").hidden = !state.hasMore;
    }

    if ($("status")) {
      $("status").textContent = posts.length
        ? `${data.total ?? posts.length} published updates`
        : "No updates found yet. Check back soon.";
    }
  } catch (error) {
    console.error("Posts loading error:", error);

    if (!append) {
      showEmpty("Unable to load updates. Please refresh the page.");
    }

    if ($("status")) {
      $("status").textContent =
        "Unable to connect to the updates service. Please try again.";
    }
  } finally {
    state.loading = false;
  }
}

// Search
if ($("searchForm")) {
  $("searchForm").addEventListener("submit", (event) => {
    event.preventDefault();

    state.search = $("searchInput")?.value.trim() || "";
    state.category = "";

    if ($("feedTitle")) {
      $("feedTitle").textContent = state.search
        ? `Search: ${state.search}`
        : "Latest Updates";
    }

    document.querySelectorAll(".info-panel").forEach((panel) => {
      panel.classList.remove("selected");
    });

    loadPosts();

    document.querySelector("#latest")?.scrollIntoView({
      behavior: "smooth"
    });
  });
}

// Refresh
if ($("refreshBtn")) {
  $("refreshBtn").addEventListener("click", () => {
    loadPosts();

    document.querySelectorAll(".info-panel").forEach((panel) => {
      fetchCategory(panel.dataset.category);
    });
  });
}

// Load more
if ($("loadMore")) {
  $("loadMore").addEventListener("click", () => {
    if (!state.hasMore || state.loading) return;

    state.offset += state.limit;
    loadPosts(true);
  });
}

// View all category links
document.querySelectorAll(".info-panel .view-all").forEach((link) => {
  link.addEventListener("click", () => {
    const panel = link.closest(".info-panel");

    if (!panel) return;

    state.category = panel.dataset.category;
    state.search = "";

    if ($("searchInput")) {
      $("searchInput").value = "";
    }

    if ($("feedTitle")) {
      $("feedTitle").textContent =
        panel.querySelector("h2")?.textContent || "Updates";
    }

    loadPosts();

    document.querySelector("#latest")?.scrollIntoView({
      behavior: "smooth"
    });
  });
});

// Quick category navigation
document.querySelectorAll(".quick-links a").forEach((link) => {
  link.addEventListener("click", () => {
    const href = link.getAttribute("href") || "";

    if (!href.startsWith("#")) return;

    const panel = document.getElementById(href.slice(1));

    if (!panel || !panel.dataset.category) return;

    state.category = panel.dataset.category;
    state.search = "";

    if ($("searchInput")) {
      $("searchInput").value = "";
    }

    if ($("feedTitle")) {
      $("feedTitle").textContent =
        panel.querySelector("h2")?.textContent || "Updates";
    }

    loadPosts();
  });
});

// Mobile navigation
const menuToggle = $("menuToggle");
const mainNav = $("mainNav");

if (menuToggle && mainNav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = mainNav.classList.toggle("open");

    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.textContent = isOpen ? "✕ Close" : "☰ Menu";
  });

  mainNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mainNav.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.textContent = "☰ Menu";
    });
  });
}

// Initial loading
if (API) {
  loadPosts();

  document.querySelectorAll(".info-panel").forEach((panel) => {
    if (panel.dataset.category) {
      fetchCategory(panel.dataset.category);
    }
  });
} else {
  showEmpty("API configuration is missing.");
  if ($("status")) {
    $("status").textContent = "API configuration is missing.";
  }
}
