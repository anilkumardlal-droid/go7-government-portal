const API = (window.GO7_CONFIG?.API_BASE || "").replace(/\/$/, "");
const state = { category: "", search: "", offset: 0, limit: 30, hasMore: false };
const $ = (id) => document.getElementById(id);
$("year").textContent = new Date().getFullYear();
function esc(s="") { return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])); }
function dateLabel(value) { if(!value)return "Recently added";const d=new Date(value);return Number.isNaN(d.getTime())?"Recently added":d.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}); }
function renderPosts(posts, append=false) {
  const html=posts.map(p=>`<article class="post"><div class="post-meta"><span class="pill">${esc(p.category_label||p.category||"Update")}</span><span>${esc(dateLabel(p.published_at||p.created_at))}</span></div><h3>${esc(p.title)}</h3><p>${esc(p.summary||"Open the original publisher's notice for complete details.")}</p><a href="/detail.html?id=${encodeURIComponent(p.id)}">View full details →</a></article>`).join("");
  if(!append)$("postList").innerHTML=html;else $("postList").insertAdjacentHTML("beforeend",html);
}
async function fetchCategory(category){
  const panel=document.querySelector(`[data-category="${category}"] .panel-body`);if(!panel)return;
  try{const r=await fetch(`${API}/api/posts?${new URLSearchParams({category,limit:"8",offset:"0"})}`);if(!r.ok)throw new Error("API unavailable");const data=await r.json();
    panel.innerHTML=(data.posts||[]).map(p=>`<a class="feed-link" href="/detail.html?id=${encodeURIComponent(p.id)}">${esc(p.title)}</a>`).join("")||'<div class="empty-panel">No updates published in this category yet.</div>';
  }catch(e){panel.innerHTML='<div class="empty-panel">Updates will appear here after the feed API is connected.</div>';}
}
async function loadPosts(append=false){if(!append)state.offset=0;$("status").textContent="Loading updates…";const q=new URLSearchParams({limit:String(state.limit),offset:String(state.offset)});if(state.category)q.set("category",state.category);if(state.search)q.set("q",state.search);
  try{const r=await fetch(`${API}/api/posts?${q}`);if(!r.ok)throw new Error(`API returned ${r.status}`);const data=await r.json();renderPosts(data.posts||[],append);state.hasMore=Boolean(data.has_more);$("loadMore").hidden=!state.hasMore;$("status").textContent=data.posts?.length?`${data.total??data.posts.length} published updates`:"No updates found yet. Check back soon.";
  }catch(e){if(!append)$("postList").innerHTML="";$("status").textContent="Updates are not connected yet. Complete the API and database setup to show live notices.";console.error(e);}}
$("searchForm").addEventListener("submit",e=>{e.preventDefault();state.search=$("searchInput").value.trim();state.category="";$("feedTitle").textContent=state.search?`Search: ${state.search}`:"Latest Updates";document.querySelectorAll(".info-panel").forEach(x=>x.classList.remove("selected"));loadPosts();document.querySelector("#latest").scrollIntoView({behavior:"smooth"});});
$("refreshBtn").addEventListener("click",()=>{loadPosts();document.querySelectorAll(".info-panel").forEach(x=>fetchCategory(x.dataset.category));});
$("loadMore").addEventListener("click",()=>{state.offset+=state.limit;loadPosts(true);});
document.querySelectorAll(".info-panel .view-all").forEach(link=>link.addEventListener("click",()=>{const panel=link.closest(".info-panel");state.category=panel.dataset.category;state.search="";$("searchInput").value="";$("feedTitle").textContent=panel.querySelector("h2").textContent;loadPosts();}));
document.querySelectorAll(".quick-links a").forEach(link=>link.addEventListener("click",()=>{const id=link.getAttribute("href").slice(1);const panel=document.getElementById(id);if(panel){state.category=panel.dataset.category;state.search="";$("feedTitle").textContent=panel.querySelector("h2").textContent;loadPosts();}}));
loadPosts();document.querySelectorAll(".info-panel").forEach(x=>fetchCategory(x.dataset.category));

const menuToggle=document.getElementById("menuToggle"),mainNav=document.getElementById("mainNav");
if(menuToggle&&mainNav){menuToggle.addEventListener("click",()=>{const open=mainNav.classList.toggle("open");menuToggle.setAttribute("aria-expanded",String(open));menuToggle.textContent=open?"✕ Close":"☰ Menu";});mainNav.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{mainNav.classList.remove("open");menuToggle.setAttribute("aria-expanded","false");menuToggle.textContent="☰ Menu";}));}
