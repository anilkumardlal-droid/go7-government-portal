(() => {
  const API=(window.GO7_CONFIG?.API_BASE||"").replace(/\/$/,"");
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const date=value=>{if(!value)return"Date not provided";const d=new Date(value);return Number.isNaN(d.getTime())?"Date not provided":d.toLocaleDateString("en-IN",{timeZone:"Asia/Kolkata",day:"numeric",month:"short",year:"numeric"});};
  const href=post=>post.id?"/detail.html?id="+encodeURIComponent(post.id):"#";
  const isNewPost=post=>{const value=post?.published_at;if(!value)return false;const time=new Date(value).getTime(),age=Date.now()-time;return Number.isFinite(time)&&age>=0&&age<=259200000;};
  const newBadge=post=>isNewPost(post)?'<span class="new-post-badge" aria-label="New post">NEW</span> ':"";
  const closedBadge=post=>{if(!post?.application_last_date)return"";const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());return String(post.application_last_date).slice(0,10)<today?'<span class="pill">APPLICATION CLOSED</span> ':"";};
  const excerpt=value=>{const text=String(value||"").replace(/\s+/g," ").trim();return text.length>260?text.slice(0,257).trimEnd()+"…":text;};
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
      list.innerHTML=posts.map(post=>'<article class="search-result-card"><div class="post-meta"><span class="pill">'+esc(post.category_label||post.category||"Update")+'</span><span>'+esc(date(post.published_at))+'</span></div><h2><a href="'+href(post)+'">'+newBadge(post)+closedBadge(post)+esc(post.title||"Government Update")+'</a></h2><p>'+esc(excerpt(post.summary||"Open the original official notice for complete information."))+'</p><a class="post-link" href="'+href(post)+'">View details →</a></article>').join("");
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