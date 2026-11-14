(() => {
  const API=(window.GO7_CONFIG?.API_BASE||"").replace(/\/$/,"");
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const dateLabel=value=>{if(!value)return "Date not provided";const d=new Date(value);return Number.isNaN(d.getTime())?"Date not provided":d.toLocaleDateString("en-IN",{timeZone:"Asia/Kolkata",day:"numeric",month:"short",year:"numeric"});};
  const postHref=post=>post.id?"/detail.html?id="+encodeURIComponent(post.id):"#";
  const isNewPost=post=>{const value=post?.published_at;if(!value)return false;const time=new Date(value).getTime(),age=Date.now()-time;return Number.isFinite(time)&&age>=0&&age<=259200000;};
  const isExpired=value=>{if(!value)return false;const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());return String(value).slice(0,10)<today;};
  const closedBadge=post=>isExpired(post?.application_last_date)?'<span class="pill">Closed</span> ':"";
  const newBadge=post=>isNewPost(post)?'<span class="new-post-badge" aria-label="New post">NEW</span> ':"";
  async function loadCategory(panel){
    const cat=panel.dataset.category,target=panel.querySelector(".panel-body"),refresh=panel.querySelector(".panel-refresh");
    if(refresh){refresh.disabled=true;refresh.classList.add("is-loading");}
    try{
      const url=API+"/api/posts?"+new URLSearchParams({category:cat,limit:"20",offset:"0"});
      const r=await fetch(url,{cache:"no-store"});
      if(!r.ok)throw new Error("Updates service returned "+r.status);
      const data=await r.json(),posts=data.posts||[];
      target.innerHTML=posts.length?posts.map(p=>'<a class="post-link feed-link" href="'+postHref(p)+'"><span class="post-list-marker" aria-hidden="true">*</span>'+newBadge(p)+closedBadge(p)+'<span class="home-post-title">'+esc(p.title||"Government Update")+'</span></a>').join(""):'<p class="empty-panel">No updates published in this category yet.</p>';
    }catch(e){
      console.error("GO7 category load:",cat,e);
      target.innerHTML='<p class="empty-panel">Updates are temporarily unavailable. Please refresh.</p>';
    }finally{
      if(refresh){refresh.disabled=false;refresh.classList.remove("is-loading");}
    }
  }
  if($("year"))$("year").textContent="2026";
  document.querySelectorAll(".home-category-panel[data-category]").forEach(panel=>{
    panel.querySelector(".panel-refresh")?.addEventListener("click",()=>loadCategory(panel));
  });
  if(!API){
    document.querySelectorAll(".home-category-panel .panel-body").forEach(x=>x.innerHTML='<p class="empty-panel">API configuration is missing.</p>');
    return;
  }
  document.querySelectorAll(".home-category-panel[data-category]").forEach(loadCategory);
  window.setInterval(()=>document.querySelectorAll(".home-category-panel[data-category]").forEach(loadCategory),60000);
})();