(() => {
  const API=(window.GO7_CONFIG?.API_BASE||"").replace(/\/$/,"");
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const dateLabel=value=>{if(!value)return "Recently added";const d=new Date(value);return Number.isNaN(d.getTime())?"Recently added":d.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});};
  const postPermalink=post=>{
      const base=String(post.slug||post.title||"government-update").normalize("NFKD")
        .replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/&/g," and ")
        .replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"")
        .slice(0,90).replace(/-+$/g,"")||"government-update";
      return "/detail/"+encodeURIComponent(base+"-"+post.id)+"/";
    };
  const postHref=post=>post.id?postPermalink(post):"/detail.html?id="+encodeURIComponent(post.id);
  const isNewPost=post=>{const value=post?.created_at||post?.published_at;if(!value)return false;const time=new Date(value).getTime(),age=Date.now()-time;return Number.isFinite(time)&&age>=0&&age<=259200000;};
  const newBadge=post=>isNewPost(post)?'<span class="new-post-badge" aria-label="New post">NEW</span> ':"";
  async function loadCategory(panel){
    const cat=panel.dataset.category,target=panel.querySelector(".panel-body"),refresh=panel.querySelector(".panel-refresh");
    if(refresh){refresh.disabled=true;refresh.classList.add("is-loading");}
    try{
      const url=API+"/api/posts?"+new URLSearchParams({category:cat,limit:"10",offset:"0"});
      const r=await fetch(url,{cache:"no-store"});
      if(!r.ok)throw new Error("Updates service returned "+r.status);
      const data=await r.json(),posts=data.posts||[];
      target.innerHTML=posts.length?posts.map(p=>'<a class="post-link feed-link" href="'+postHref(p)+'">'+newBadge(p)+esc(p.title||"Government Update")+'</a>').join(""):'<p class="empty-panel">No updates published in this category yet.</p>';
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