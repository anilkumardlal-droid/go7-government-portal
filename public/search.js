(() => {
  const API=(window.GO7_CONFIG?.API_BASE||"").replace(/\/$/,"");
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const date=value=>{if(!value)return"Recently added";const d=new Date(value);return Number.isNaN(d.getTime())?"Recently added":d.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});};
  const href=post=>post.slug?"/detail/"+encodeURIComponent(post.slug)+"/":"/detail.html?id="+encodeURIComponent(post.id);
  const isNewPost=post=>{const value=post?.created_at||post?.published_at;if(!value)return false;const time=new Date(value).getTime(),age=Date.now()-time;return Number.isFinite(time)&&age>=0&&age<=259200000;};
  const newBadge=post=>isNewPost(post)?'<span class="new-post-badge" aria-label="New post">NEW</span> ':"";
  const list=$("searchResultList"),status=$("searchStatus"),refresh=$("searchRefresh"),input=$("searchQuery");
  let currentQuery="";
  async function search(query){
    currentQuery=String(query||"").trim();
    list.innerHTML="";
    if(!currentQuery){$("searchHeading").textContent="Search Results";status.textContent="Enter a keyword to search available updates.";return;}
    if(!API){status.textContent="Search service is not configured.";return;}
    if(refresh){refresh.disabled=true;refresh.classList.add("is-loading");}
    status.textContent="Searching…";
    $("searchHeading").textContent='Results for "'+currentQuery+'"';
    try{
      const params=new URLSearchParams({q:currentQuery,limit:"30",offset:"0"});
      const response=await fetch(API+"/api/posts?"+params,{cache:"no-store"});
      if(!response.ok)throw new Error("Search service returned "+response.status);
      const data=await response.json(),posts=data.posts||[];
      status.textContent=posts.length?String(data.total??posts.length)+" matching updates found. Showing up to 30 results.":"No matching updates found. Try another keyword.";
      list.innerHTML=posts.map(post=>'<article class="search-result-card"><div class="post-meta"><span class="pill">'+esc(post.category_label||post.category||"Update")+'</span><span>'+esc(date(post.published_at||post.created_at))+'</span></div><h2><a href="'+href(post)+'">'+newBadge(post)+esc(post.title||"Government Update")+'</a></h2><p>'+esc(post.summary||"Open the original official notice for complete information.")+'</p><a class="post-link" href="'+href(post)+'">View details →</a></article>').join("");
    }catch(error){status.textContent="Search is temporarily unavailable. Please try again.";console.error("GO7 search:",error);}
    finally{if(refresh){refresh.disabled=false;refresh.classList.remove("is-loading");}}
  }
  const initial=new URLSearchParams(location.search).get("q")||"";
  input.value=initial;
  $("searchPageForm").addEventListener("submit",event=>{event.preventDefault();const q=input.value.trim();history.replaceState(null,"","/search.html"+(q?"?q="+encodeURIComponent(q):""));search(q);});
  refresh.addEventListener("click",()=>search(currentQuery));
  if(initial)search(initial);
  if($("year"))$("year").textContent="2026";
})();