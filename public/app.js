(() => {
  const API=(window.GO7_CONFIG?.API_BASE||"").replace(/\/$/,"");
  const categories=["latest-jobs","results","admit-cards","answer-keys","documents","admissions","iti-jobs","outsourcing-jobs","syllabus"];
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const dateLabel=value=>{if(!value)return "Recently added";const d=new Date(value);return Number.isNaN(d.getTime())?"Recently added":d.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});};
  const postHref=post=>post.slug?"/"+encodeURIComponent(post.slug)+"/":"/detail.html?id="+encodeURIComponent(post.id);
  const postCard=post=>`<article class="post-card"><div class="post-meta"><span class="pill">${esc(post.category_label||post.category||"Update")}</span><span>${esc(dateLabel(post.published_at||post.created_at))}</span></div><h3>${esc(post.title||"Government Update")}</h3><p>${esc(post.summary||"Open the official notification for complete details.")}</p><a class="post-card-link" href="${postHref(post)}">View details →</a></article>`;
  async function getPosts(params){const r=await fetch(API+"/api/posts?"+new URLSearchParams(params),{cache:"no-store"});if(!r.ok)throw new Error("Updates service returned "+r.status);return r.json();}
  async function loadCategory(panel){
    const cat=panel.dataset.category, target=panel.querySelector(".panel-body");
    try{const data=await getPosts({category:cat,limit:"10",offset:"0"});const posts=data.posts||[];
      target.innerHTML=posts.length?posts.map(p=>`<a class="post-link feed-link" href="${postHref(p)}">${esc(p.title||"Government Update")}</a>`).join(""):`<p class="empty-panel">No updates published in this category yet.</p>`;
    }catch(e){console.error("GO7 category load:",cat,e);target.innerHTML='<p class="empty-panel">Updates are temporarily unavailable. Please refresh.</p>';}
  }
  async function searchPosts(query){
    const section=$("searchResults"),list=$("searchPostList"),status=$("searchStatus");
    if(!section||!list||!status)return;
    section.hidden=false;status.textContent="Searching…";list.innerHTML="";
    try{const data=await getPosts({q:query,limit:"30",offset:"0"});const posts=data.posts||[];
      $("searchHeading").textContent="Search: "+query;
      status.textContent=posts.length?`${data.total??posts.length} matching updates`:"No matching updates found.";
      list.innerHTML=posts.map(postCard).join("");
    }catch(e){status.textContent="Search is temporarily unavailable. Please try again.";console.error(e);}
    section.scrollIntoView({behavior:"smooth",block:"start"});
  }
  if($("year"))$("year").textContent=new Date().getFullYear();
  if(!API){document.querySelectorAll(".home-category-panel .panel-body").forEach(x=>x.innerHTML='<p class="empty-panel">API configuration is missing.</p>');return;}
  document.querySelectorAll(".home-category-panel[data-category]").forEach(loadCategory);
  $("searchForm")?.addEventListener("submit",e=>{e.preventDefault();const q=$("searchInput")?.value.trim();if(q)searchPosts(q);});
  $("clearSearch")?.addEventListener("click",()=>{$("searchResults").hidden=true;$("searchInput").value="";});
  // Refresh category panels after the feed sync interval without duplicating the global latest feed.
  window.setInterval(()=>document.querySelectorAll(".home-category-panel[data-category]").forEach(loadCategory),60000);
})();