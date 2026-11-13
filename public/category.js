(() => {
 const API=(window.GO7_CONFIG?.API_BASE||"").replace(/\/$/,"");
 const category=window.GO7_CATEGORY||new URLSearchParams(location.search).get("category")||"jobs-vacancies";
 const $=id=>document.getElementById(id);const limit=24;let offset=0,loading=false;
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const date=s=>{if(!s)return"Recently added";const d=new Date(s);return Number.isNaN(d.getTime())?"Recently added":d.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});};
 const href=p=>p.id?"/detail.html?id="+encodeURIComponent(p.id):"#";
 const isNewPost=p=>{const value=p?.created_at||p?.published_at;if(!value)return false;const time=new Date(value).getTime(),age=Date.now()-time;return Number.isFinite(time)&&age>=0&&age<=259200000;};
 const newBadge=p=>isNewPost(p)?'<span class="new-post-badge" aria-label="New post">NEW</span> ':"";
 const excerpt=value=>{const text=String(value||"").replace(/\s+/g," ").trim();return text.length>260?text.slice(0,257).trimEnd()+"…":text;};
 function render(posts,append){const html=posts.map(p=>`<article class="category-post-card"><div class="post-meta"><span class="pill">${esc(p.category_label||p.category||"Update")}</span><span>${esc(date(p.published_at||p.created_at))}</span></div><h2>${newBadge(p)}${esc(p.title||"Government Update")}</h2><p>${esc(excerpt(p.summary||"Open the official notification for full information."))}</p><a href="${href(p)}">View details →</a></article>`).join("");if(append)$("postList").insertAdjacentHTML("beforeend",html);else $("postList").innerHTML=html;}
 async function load(append=false){if(loading||!API)return;loading=true;const btn=$("loadMore");if(btn){btn.disabled=true;btn.textContent="Loading…";}if(!append)offset=0;$("status").textContent=append?"Loading more updates…":"Loading updates…";
  try{const q=new URLSearchParams({category,limit:String(limit),offset:String(offset)});const r=await fetch(API+"/api/posts?"+q,{cache:"no-store"});if(!r.ok)throw Error("Service returned "+r.status);const d=await r.json();const posts=d.posts||[];render(posts,append);$("status").textContent=posts.length?`Showing ${Math.min(offset+posts.length,d.total||offset+posts.length)} of ${d.total??posts.length} updates`:"No updates published in this category yet.";if(btn)btn.hidden=!d.has_more;}
  catch(e){$("status").textContent="Updates are temporarily unavailable. Please refresh.";console.error("GO7 category:",e);}
  finally{loading=false;if(btn){btn.disabled=false;btn.textContent="Load More";}}
 }
 $("loadMore")?.addEventListener("click",()=>{offset+=limit;load(true);});if($("year"))$("year").textContent=new Date().getFullYear();if(!API)$("status").textContent="API configuration is missing.";else load();
})();