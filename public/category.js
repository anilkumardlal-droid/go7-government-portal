(() => {
 const API=(window.GO7_CONFIG?.API_BASE||"").replace(/\/$/,"");
 const category=window.GO7_CATEGORY||new URLSearchParams(location.search).get("category")||"jobs-vacancies";
 const $=id=>document.getElementById(id);const limit=24;let offset=0,loading=false;
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const date=s=>{if(!s)return"Date not provided";const d=new Date(s);return Number.isNaN(d.getTime())?"Date not provided":d.toLocaleDateString("en-IN",{timeZone:"Asia/Kolkata",day:"numeric",month:"short",year:"numeric"});};
 const href=p=>p.id?"/detail.html?id="+encodeURIComponent(p.id):"#";
 const isNewPost=p=>{const value=p?.published_at;if(!value)return false;const time=new Date(value).getTime(),age=Date.now()-time;return Number.isFinite(time)&&age>=0&&age<=259200000;};
 const newBadge=p=>isNewPost(p)?'<span class="new-post-badge" aria-label="New post">NEW</span> ':"";
 const closedBadge=p=>{if(!p?.application_last_date)return"";const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());return String(p.application_last_date).slice(0,10)<today?'<span class="pill">Closed</span> ':"";};
 const excerpt=value=>{const text=String(value||"").replace(/\s+/g," ").trim();return text.length>260?text.slice(0,257).trimEnd()+"…":text;};
 function render(posts,append){const html=posts.map(p=>`<li class="category-post-card"><span class="post-list-marker" aria-hidden="true">*</span><h2><a href="${href(p)}">${esc(p.title||"Government Update")}</a></h2></li>`).join("");if(append)$("postList").insertAdjacentHTML("beforeend",html);else $("postList").innerHTML=html;}
 async function load(append=false){if(loading||!API)return;loading=true;const btn=$("loadMore");if(btn){btn.disabled=true;btn.textContent="Loading…";}if(!append)offset=0;$("status").textContent=append?"Loading more updates…":"Loading updates…";
  try{const q=new URLSearchParams({category,limit:String(limit),offset:String(offset)});const r=await fetch(API+"/api/posts?"+q,{cache:"no-store"});if(!r.ok)throw Error("Service returned "+r.status);const d=await r.json();const posts=d.posts||[];render(posts,append);$("status").textContent=posts.length?`Showing ${Math.min(offset+posts.length,d.total||offset+posts.length)} of ${d.total??posts.length} updates`:"No updates published in this category yet.";if(btn)btn.hidden=!d.has_more;}
  catch(e){$("status").textContent="Updates are temporarily unavailable. Please refresh.";console.error("GO7 category:",e);}
  finally{loading=false;if(btn){btn.disabled=false;btn.textContent="Load More";}}
 }
 $("loadMore")?.addEventListener("click",()=>{offset+=limit;load(true);});if($("year"))$("year").textContent=new Date().getFullYear();if(!API)$("status").textContent="API configuration is missing.";else load();
})();