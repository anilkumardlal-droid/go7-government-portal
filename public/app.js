
const API = (window.GO7_CONFIG?.API_BASE || "").replace(/\/$/, "");

const initialQuery = new URLSearchParams(window.location.search).get("q") || "";
const state = {
  category: "",
  search: initialQuery,
  offset: 0,
  limit: 10,
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
    <article class="post" data-post-id="${esc(post.id)}">
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
      limit: "11",
      offset: "0"
    });

    const response = await fetch(`${API}/api/posts?${query}`, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();

    const panelPosts = data.posts || [];
    const viewMore = panel.closest(".info-panel")?.querySelector(".view-all");
    if (viewMore) viewMore.hidden = !(panelPosts.length > 10 || data.has_more);
    panel.innerHTML = panelPosts.slice(0, 10).map((post) => `
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
    $("status").textContent = append ? "Loading more updates…" : "Loading updates…";
  }
  if (append && $("loadMore")) {
    $("loadMore").disabled = true;
    $("loadMore").textContent = "Loading…";
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
    const response = await fetch(`${API}/api/posts?${query}`, { cache: "no-store" });

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
    if ($("loadMore")) {
      $("loadMore").disabled = false;
      $("loadMore").textContent = "Load More";
    }
  }
}

// Live refresh every 60 seconds. New posts are inserted without replacing older
// posts that the visitor may already have loaded with the Load More button.
async function refreshLatestLive() {
  if (!API || state.loading) return;
  document.querySelectorAll(".info-panel[data-category]").forEach((panel) => fetchCategory(panel.dataset.category));
  try {
    const response = await fetch(`${API}/api/posts?limit=10&offset=0`, { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    const existing = new Set(Array.from(document.querySelectorAll("#postList [data-post-id]")).map((node) => String(node.dataset.postId)));
    const fresh = (data.posts || []).filter((post) => !existing.has(String(post.id)));
    if (!fresh.length) return;
    const html = fresh.map((post) => `
      <article class="post live-new" data-post-id="${esc(post.id)}">
        <div class="post-meta"><span class="pill">${esc(post.category_label || post.category || "Update")}</span><span>${esc(dateLabel(post.published_at || post.created_at))}</span></div>
        <h3>${esc(post.title || "Government Update")}</h3>
        <p>${esc(post.summary || "Open the original publisher's notice for complete details.")}</p>
        <a href="/detail.html?id=${encodeURIComponent(post.id)}">View full details →</a>
      </article>`).join("");
    $("postList")?.insertAdjacentHTML("afterbegin", html);
    if ($("status")) $("status").textContent = `${data.total ?? data.posts.length} published updates · New updates just arrived`;
  } catch (error) {
    console.warn("Live refresh skipped:", error);
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

// View More links intentionally navigate to dedicated category pages.


// Initial loading
if (API) {
  if (state.search && $("feedTitle")) {
    $("feedTitle").textContent = `Search: ${state.search}`;
  }
  loadPosts();

  document.querySelectorAll(".info-panel").forEach((panel) => {
    if (panel.dataset.category) {
      fetchCategory(panel.dataset.category);
    }
  });
  window.setInterval(refreshLatestLive, 60000);
} else {
  showEmpty("API configuration is missing.");
  if ($("status")) {
    $("status").textContent = "API configuration is missing.";
  }
}
