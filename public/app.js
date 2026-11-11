const API = (window.GO7_CONFIG?.API_BASE || "").replace(/\/$/, "");
const state = { category: "", search: "", offset: 0, limit: 20, hasMore: false };
const $ = (id) => document.getElementById(id);
$("year").textContent = new Date().getFullYear();

function esc(s="") {
  return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}
function dateLabel(value) {
  if (!value) return "Recently added";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "Recently added" : d.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
}
function renderPosts(posts, append=false) {
  const html = posts.map(p => `<article class="post">
    <div class="post-meta"><span class="pill">${esc(p.category_label || p.category || "Update")}</span><span>${esc(dateLabel(p.published_at || p.created_at))}</span></div>
    <h3>${esc(p.title)}</h3>
    <p>${esc(p.summary || "Open the original publisher's notice for complete details.")}</p>
    <a href="${esc(p.source_url)}" target="_blank" rel="noopener noreferrer">View original notification ↗</a>
  </article>`).join("");
  if (!append) $("postList").innerHTML = html;
  else $("postList").insertAdjacentHTML("beforeend", html);
}
async function loadPosts(append=false) {
  if (!append) state.offset = 0;
  $("status").textContent = "Loading updates…";
  const q = new URLSearchParams({limit:String(state.limit),offset:String(state.offset)});
  if (state.category) q.set("category",state.category);
  if (state.search) q.set("q",state.search);
  try {
    const r = await fetch(`${API}/api/posts?${q}`);
    if (!r.ok) throw new Error(`API returned ${r.status}`);
    const data = await r.json();
    renderPosts(data.posts || [], append);
    state.hasMore = Boolean(data.has_more);
    $("loadMore").hidden = !state.hasMore;
    $("status").textContent = data.posts?.length ? `${data.total ?? data.posts.length} published updates` : "No updates found yet. Check back soon.";
  } catch (e) {
    if (!append) $("postList").innerHTML = "";
    $("status").textContent = "Updates are not connected yet. Check the API deployment and configuration.";
    console.error(e);
  }
}
$("searchForm").addEventListener("submit", e => {
  e.preventDefault(); state.search = $("searchInput").value.trim(); state.category = "";
  document.querySelectorAll(".category-card").forEach(x=>x.classList.remove("active"));
  $("feedTitle").textContent = state.search ? `Search: ${state.search}` : "Latest updates";
  loadPosts();
});
$("categoryGrid").addEventListener("click", e => {
  const card = e.target.closest("[data-category]"); if (!card) return;
  state.category = card.dataset.category; state.search = ""; $("searchInput").value = "";
  document.querySelectorAll(".category-card").forEach(x=>x.classList.toggle("active",x===card));
  $("feedTitle").textContent = card.innerText.trim(); loadPosts();
});
$("refreshBtn").addEventListener("click",()=>loadPosts());
$("loadMore").addEventListener("click",()=>{state.offset += state.limit;loadPosts(true);});
loadPosts();
