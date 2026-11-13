(() => {
 const API=(window.GO7_CONFIG?.API_BASE||"").replace(/\/$/,"");
 const $=id=>document.getElementById(id);
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const nice=s=>String(s||"").replace(/[_-]+/g," ").replace(/\b\w/g,c=>c.toUpperCase());
 const date=s=>{if(!s)return"Date not provided";const d=new Date(s);return Number.isNaN(d.getTime())?"Date not provided":d.toLocaleDateString("en-IN",{timeZone:"Asia/Kolkata",day:"2-digit",month:"short",year:"numeric"});};
 const isExpired=s=>{if(!s)return false;const today=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());return String(s).slice(0,10)<today;};
 const excerpt=value=>{const text=String(value||"").replace(/\s+/g," ").trim();return text.length>220?text.slice(0,217).trimEnd()+"…":text;};
 const params=new URLSearchParams(location.search);
 const slugParam=params.get("slug");
 const pathParts=location.pathname.split("/").filter(Boolean);
 const isDetailPath=pathParts[0]==="detail";
 const pathSlug=isDetailPath?(pathParts[1]||""):(pathParts.length===1?pathParts[0]:"");
 const routeIdMatch=isDetailPath?pathSlug.match(/-(\d+)$/):null;
 const slug=routeIdMatch?"":(slugParam||(pathSlug&&!pathSlug.includes(".")?pathSlug:""));
 const id=params.get("id")||(routeIdMatch?routeIdMatch[1]:"");
 const status=$("detailStatus");
 const hasValue=v=>{if(v===null||v===undefined)return false;if(typeof v==="string")return v.trim()!==""&&!/^not mentioned in official notification$/i.test(v.trim())&&!/^not provided$/i.test(v.trim());if(Array.isArray(v))return v.length>0;if(typeof v==="object")return Object.values(v).some(hasValue);return true;};
 const valueHtml=v=>Array.isArray(v)?'<ul>'+v.filter(hasValue).map(x=>'<li>'+esc(x)+'</li>').join("")+'</ul>':esc(v);
 function renderDetails(d){
  if(!d||typeof d!=="object")return "";
  const groups=[
   ["Notice Overview",[["Notice Type",d.notice_type],["Department",d.department],["Post Names",d.post_names],["Total Vacancies",d.total_vacancies],["Overview",d.overview]]],
   ["Important Dates",Object.entries(d.important_dates||{}).map(([k,v])=>[nice(k),v])],
   ["Eligibility, Age & Fee",[["Eligibility",d.eligibility],["Educational Qualification",d.educational_qualification],["Age Limit",d.age_limit],["Age Relaxation",d.age_relaxation],["Salary / Pay",d.salary],["Application Fee",d.application_fee]]],
   ["Selection Process",[["Stages",d.selection_process]]],
   ["How to Apply",[["Application Steps",d.how_to_apply]]],
   ["Documents Required",[["Required Documents",d.documents_required]]],
   ["Source Evidence",[["Evidence in Official Notice",d.source_evidence]]]
  ];
  return groups.map(([title,rows])=>{
   const valid=rows.filter(([,v])=>hasValue(v));
   if(!valid.length)return "";
   return '<section class="detail-section"><h2>'+esc(title)+'</h2><table class="detail-table">'+valid.map(([label,v])=>'<tr><th>'+esc(label)+'</th><td>'+valueHtml(v)+'</td></tr>').join("")+'</table></section>';
  }).join("");
 }
 async function loadRelatedPosts(current){
  const section=$("relatedSection"),target=$("relatedPosts");
  if(!section||!target||!current?.category||!current?.id)return;
  try{
   const q=new URLSearchParams({category:current.category,limit:"8",offset:"0"});
   const r=await fetch(API+"/api/posts?"+q,{cache:"no-store"});
   if(!r.ok)throw Error("Related updates service returned "+r.status);
   const data=await r.json();
   const posts=(data.posts||[]).filter(item=>Number(item.id)!==Number(current.id)).slice(0,4);
   if(!posts.length){section.hidden=true;return;}
   target.innerHTML=posts.map(item=>'<article class="related-post-card"><h3><a href="/detail.html?id='+encodeURIComponent(item.id)+'">'+esc(item.title||"Government Update")+'</a></h3></article>').join("");
   section.hidden=false;
  }catch(error){
   section.hidden=true;
   console.error("GO7 related updates:",error);
  }
 }
 async function load(){
  if(!API)throw Error("API configuration is missing.");
  if(!slug&&!id)throw Error("Update not found. Return to the homepage and choose a listing.");
  const endpoint=slug?API+"/api/posts/slug/"+encodeURIComponent(slug):API+"/api/posts/"+encodeURIComponent(id);
  const r=await fetch(endpoint,{cache:"no-store"});
  if(!r.ok)throw Error(r.status===404?"This update could not be found.":"The update service is temporarily unavailable.");
  const data=await r.json(),p=data.post;if(!p)throw Error("Update not found.");
  document.title=(p.title||"Update Details")+" | Jobs GO7";
  const permalink="/detail.html?id="+encodeURIComponent(p.id);
  const canonical=document.querySelector('link[rel="canonical"]');
  if(canonical)canonical.href="https://jobs.go7.in"+permalink;
  $("detailBreadcrumb").innerHTML=' › <a href="/'+esc(p.category)+'/">'+esc(p.category_label||p.category||"Updates")+'</a> › '+esc(p.title||"Details");
  $("detailCategory").textContent=p.category_label||p.category||"GO7 Update";
  $("detailTitle").textContent=p.title||"Government Update";
  const applicationStatus=p.application_last_date?(isExpired(p.application_last_date)?"Closed — archived notice":"Deadline not passed"):"Not provided";
  $("detailMeta").innerHTML='<span><strong>Department / Source:</strong> '+esc(p.source_name||p.ai_details?.department||"Original publisher")+'</span><span><strong>Published:</strong> '+esc(date(p.published_at))+'</span><span><strong>Application last date:</strong> '+esc(date(p.application_last_date))+'</span><span><strong>Application status:</strong> '+esc(applicationStatus)+'</span>';
  $("detailSummary").textContent=p.ai_details?.overview||p.summary||"The publisher has not supplied a full text description. Open the original notification for complete information.";
  $("extractedDetails").innerHTML=renderDetails(p.ai_details);
  $("extractedSection").hidden=!$("extractedDetails").innerHTML;
  $("detailTable").innerHTML=[["Update Category",p.category_label||p.category],["Publishing Source",p.source_name||"Original publisher"],["Publication Date",date(p.published_at)],["Application Last Date",date(p.application_last_date)],["Application Status",applicationStatus]].map(([k,v])=>'<tr><th>'+esc(k)+'</th><td>'+esc(v)+'</td></tr>').join("");
  const links=Array.isArray(p.ai_details?.official_links)?p.ai_details.official_links:[];
  const validLinks=links.filter(x=>x&&/^https?:\/\//i.test(String(x.url||"")));
  const mainLink=p.source_url||p.ai_details?.sourceUrl;
  $("detailLinks").innerHTML=(mainLink&&/^https?:\/\//i.test(mainLink)?'<a class="official-link" href="'+esc(mainLink)+'" target="_blank" rel="noopener noreferrer">Open Official / Original Notice ↗</a>':'')+validLinks.map(x=>'<a href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">'+esc(x.label||"Official Link")+' ↗</a>').join("")+'<a href="/'+esc(p.category||"latest-jobs")+'/">More '+esc(p.category_label||"Updates")+'</a><a href="/">Back to Jobs GO7 Home</a>';
  $("detailContent").hidden=false;status.textContent="";
  loadRelatedPosts(p);
 }
 load().catch(e=>{status.textContent=e.message;console.error(e);});
 if($("year"))$("year").textContent=new Date().getFullYear();
})();