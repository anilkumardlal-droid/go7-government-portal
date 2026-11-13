(() => {
 const API=(window.GO7_CONFIG?.API_BASE||"").replace(/\/$/,"");
 const $=id=>document.getElementById(id);
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const nice=s=>String(s||"").replace(/[_-]+/g," ").replace(/\b\w/g,c=>c.toUpperCase());
 const date=s=>{if(!s)return"Not provided";const d=new Date(s);return Number.isNaN(d.getTime())?"Not provided":d.toLocaleString("en-IN",{timeZone:"Asia/Kolkata",day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:true})+" IST";};
 const slugParam=new URLSearchParams(location.search).get("slug");
 const pathParts=location.pathname.split("/").filter(Boolean);
 const pathSlug=pathParts[0]==="detail"?(pathParts[1]||""):(pathParts.length===1?pathParts[0]:"");
 const categorySlugs=["latest-jobs","results","admit-cards","answer-keys","documents","admissions","iti-jobs","outsourcing-jobs","syllabus"];
 const slug=slugParam||((pathSlug&&!pathSlug.includes(".")&&!categorySlugs.includes(pathSlug))?pathSlug:"");
 const id=new URLSearchParams(location.search).get("id");
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
 async function load(){
  if(!API)throw Error("API configuration is missing.");
  if(!slug&&!id)throw Error("Update not found. Return to the homepage and choose a listing.");
  const endpoint=slug?API+"/api/posts/slug/"+encodeURIComponent(slug):API+"/api/posts/"+encodeURIComponent(id);
  const r=await fetch(endpoint,{cache:"no-store"});
  if(!r.ok)throw Error(r.status===404?"This update could not be found.":"The update service is temporarily unavailable.");
  const data=await r.json(),p=data.post;if(!p)throw Error("Update not found.");
  document.title=(p.title||"Update Details")+" | Jobs GO7";
  const canonical=document.querySelector('link[rel="canonical"]');if(canonical)canonical.href="https://jobs.go7.in/detail/"+encodeURIComponent(p.slug||slug||"")+"/";
  $("detailBreadcrumb").innerHTML=' › <a href="/'+esc(p.category)+'/">'+esc(p.category_label||p.category||"Updates")+'</a> › '+esc(p.title||"Details");
  $("detailCategory").textContent=p.category_label||p.category||"GO7 Update";
  $("detailTitle").textContent=p.title||"Government Update";
  $("detailMeta").innerHTML='<span><strong>Department / Source:</strong> '+esc(p.source_name||p.ai_details?.department||"Original publisher")+'</span><span><strong>Published:</strong> '+esc(date(p.published_at||p.created_at))+'</span>';
  $("detailSummary").textContent=p.ai_details?.overview||p.summary||"The publisher has not supplied a full text description. Open the original notification for complete information.";
  $("extractedDetails").innerHTML=renderDetails(p.ai_details);
  $("extractedSection").hidden=!$("extractedDetails").innerHTML;
  $("detailTable").innerHTML=[["Update Category",p.category_label||p.category],["Publishing Source",p.source_name||"Original publisher"],["Publication Date",date(p.published_at||p.created_at)]].map(([k,v])=>'<tr><th>'+esc(k)+'</th><td>'+esc(v)+'</td></tr>').join("");
  const links=Array.isArray(p.ai_details?.official_links)?p.ai_details.official_links:[];
  const validLinks=links.filter(x=>x&&/^https?:\/\//i.test(String(x.url||"")));
  const mainLink=p.source_url||p.ai_details?.sourceUrl;
  $("detailLinks").innerHTML=(mainLink&&/^https?:\/\//i.test(mainLink)?'<a class="official-link" href="'+esc(mainLink)+'" target="_blank" rel="noopener noreferrer">Open Official / Original Notice ↗</a>':'')+validLinks.map(x=>'<a href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">'+esc(x.label||"Official Link")+' ↗</a>').join("")+'<a href="/'+esc(p.category||"latest-jobs")+'/">More '+esc(p.category_label||"Updates")+'</a><a href="/">Back to Jobs GO7 Home</a>';
  $("detailContent").hidden=false;status.textContent="";
 }
 load().catch(e=>{status.textContent=e.message;console.error(e);});
 if($("year"))$("year").textContent=new Date().getFullYear();
})();