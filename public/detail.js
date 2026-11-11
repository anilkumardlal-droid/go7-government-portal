
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

document.getElementById("year").textContent =
  new Date().getFullYear();

const id = new URLSearchParams(location.search).get("id");

const box = document.getElementById("detailContent");
const status = document.getElementById("detailStatus");

if (!id || !/^\d+$/.test(id)) {
  status.textContent =
    "Update not found. Return to the homepage and choose a listing.";
} else {
  fetch(`${API}/api/posts/${id}`)
    .then((r) => {
      if (!r.ok) {
        throw new Error("Update is not available yet.");
      }

      return r.json();
    })
    .then(({ post: p }) => {
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
    })
    .catch((e) => {
      status.textContent =
        e.message + " The API may not be connected yet.";
    });
}

const toggle = document.getElementById("menuToggle");
const nav = document.getElementById("mainNav");

toggle?.addEventListener("click", () => {
  const open = nav.classList.toggle("open");

  toggle.setAttribute("aria-expanded", String(open));
  toggle.textContent = open ? "✕ Close" : "☰ Menu";
});
