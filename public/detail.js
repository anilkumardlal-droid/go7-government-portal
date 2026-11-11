
const API = (window.GO7_CONFIG?.API_BASE || "").replace(/\/$/, "");

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));

function dateTimeLabel(value) {
  if (!value) return "Not provided";

  const d = new Date(value);

  if (Number.isNaN(d.getTime())) {
    return "Not provided";
  }

  return (
    d.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    }) + " IST"
  );
}

const yearElement = document.getElementById("year");
if (yearElement) yearElement.textContent = new Date().getFullYear();

async function loadRelatedPosts(category, currentId) {
  const section = document.getElementById("relatedSection");
  const target = document.getElementById("relatedPosts");
  if (!section || !target || !category) return;
  try {
    const q = new URLSearchParams({ category, limit: "6", offset: "0" });
    const r = await fetch(`${API}/api/posts?${q}`, { cache: "no-store" });
    if (!r.ok) return;
    const data = await r.json();
    const related = (data.posts || []).filter(post => String(post.id) !== String(currentId)).slice(0, 5);
    if (!related.length) return;
    target.innerHTML = related.map(post => `
      <article class="post related-post">
        <div class="post-meta"><span class="pill">${esc(post.category_label || post.category || "Update")}</span><span>${esc(post.published_at || post.created_at ? new Date(post.published_at || post.created_at).toLocaleDateString("en-IN") : "Recently added")}</span></div>
        <h3><a class="post-title-link" href="/detail.html?id=${encodeURIComponent(post.id)}">${esc(post.title || "Government Update")}</a></h3>
        <p>${esc(post.summary || "Open the original publisher's notice for complete details.")}</p>
        <a href="/detail.html?id=${encodeURIComponent(post.id)}">View details →</a>
      </article>`).join("");
    section.hidden = false;
  } catch (error) { console.warn("Related posts unavailable:", error); }
}

const id = new URLSearchParams(location.search).get("id");

const box = document.getElementById("detailContent");
const status = document.getElementById("detailStatus");

if (!box || !status) {
  console.error("GO7 detail page is missing #detailContent or #detailStatus.");
}

if (!id || !/^\d+$/.test(id)) {
  status.textContent =
    "Update not found. Return to the homepage and choose a listing.";
} else {
  async function fetchPostById(postId) {
    // Prefer the dedicated detail endpoint.
    try {
      const response = await fetch(`${API}/api/posts/${encodeURIComponent(postId)}`, { cache: "no-store" });
      if (response.ok) {
        const payload = await response.json();
        const directPost = payload.post || payload.data?.post || payload.data || payload;
        if (directPost && String(directPost.id) === String(postId)) return directPost;
      }
    } catch (error) {
      console.warn("Dedicated post endpoint unavailable; trying feed lookup.", error);
    }

    // Compatibility fallback: find the same post through the public paginated feed.
    for (let offset = 0; offset < 500; offset += 25) {
      const query = new URLSearchParams({ limit: "25", offset: String(offset) });
      const response = await fetch(`${API}/api/posts?${query}`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Updates service returned ${response.status}.`);
      const payload = await response.json();
      const posts = payload.posts || [];
      const found = posts.find(item => String(item.id) === String(postId));
      if (found) return found;
      if (!payload.has_more || posts.length === 0) break;
    }
    throw new Error("Update not found. It may have been removed or is not published.");
  }

  fetchPostById(id)
    .then((p) => {
      if (!p) {
        throw new Error("Update not found.");
      }

      status.textContent = "";
      document.title = `${p.title} | GO7`;

      const publishedDate = dateTimeLabel(
        p.published_at || p.created_at
      );

      box.innerHTML = `
        <p class="eyebrow">
          ${esc(p.category_label || p.category)}
        </p>

        <h1 class="detail-title">
          ${esc(p.title)}
        </h1>

        <p>
          <strong>Department / Source:</strong>
          ${esc(p.source_name || "Original publisher")}
          &nbsp;
          <strong>Published:</strong>
          ${esc(publishedDate)}
        </p>

        <div class="detail-section">
          <h2>Overview</h2>
          <p>
            ${esc(
              p.summary ||
              "Please open the official notice for complete information and eligibility details."
            )}
          </p>
        </div>

        ${p.category === "results" ? `
        <div class="detail-section result-detail-section">
          <h2>Result Details</h2>
          <p><strong>Result / Exam:</strong> ${esc(p.title)}</p>
          <p><strong>Result source:</strong> ${esc(p.source_name || "Original publisher")}</p>
          <p><strong>Published on:</strong> ${esc(publishedDate)}</p>
          <p>For scorecard, roll-number search, cut-off, merit list, qualifying status and any correction notice, open the original result notice below. Only information supplied by the publisher is shown here.</p>
        </div>` : ""}

        <div class="detail-section">
          <h2>Important Information</h2>

          <table class="detail-table">
            <tr>
              <th>Update Category</th>
              <td>${esc(p.category_label || p.category)}</td>
            </tr>

            <tr>
              <th>Publishing Source</th>
              <td>${esc(p.source_name || "Original publisher")}</td>
            </tr>

            <tr>
              <th>Publication Date</th>
              <td>${esc(publishedDate)}</td>
            </tr>

            <tr>
              <th>Full Details</th>
              <td>
                See the official notice for dates, fees,
                eligibility, vacancies, selection process
                and instructions.
              </td>
            </tr>
          </table>
        </div>

        <div class="detail-section">
          <h2>Important Links</h2>

          <div class="detail-links">
            <a
              href="${esc(p.source_url || "#")}"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Official / Original Notice ↗
            </a>

            <a href="/">
              Back to GO7 Home
            </a>
          </div>
        </div>
      `;
      loadRelatedPosts(p.category, p.id);
    })
    .catch((e) => {
      status.textContent =
        e.message + " The API may not be connected yet.";
    });
}

