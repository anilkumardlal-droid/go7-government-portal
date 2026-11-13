(() => {
  const API=(window.GO7_CONFIG?.API_BASE||"").replace(/\/$/,"");
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const dateLabel=value=>{if(!value)return "Recently added";const d=new Date(value);return Number.isNaN(d.getTime())?"Recently added":d.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});};
  const postHref=post=>post.slug?"/"+encodeURIComponent(post.slug)+"/":"/detail.html?id="+encodeURIComponent(post.id);
  async function loadCategory(panel){
    const cat=panel.dataset.category,target=panel.querySelector(".panel-body"),refresh=panel.querySelector(".panel-refresh");
    if(refresh){refresh.disabled=true;refresh.classList.add("is-loading");}
    try{
      const url=API+"/api/posts?"+new URLSearchParams({category:cat,limit:"10",offset:"0"});
      const r=await fetch(url,{cache:"no-store"});
      if(!r.ok)throw new Error("Updates service returned "+r.status);
      const data=await r.json(),posts=data.posts||[];
      target.innerHTML=posts.length?posts.map(p=>'<a class="post-link feed-link" href="'+postHref(p)+'">'+esc(p.title||"Government Update")+'</a>').join(""):'<p class="empty-panel">No updates published in this category yet.</p>';
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