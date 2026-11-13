(() => {
 const API=(window.GO7_CONFIG?.API_BASE||"").replace(/\/$/,"");
 const $=id=>document.getElementById(id);
 const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const nice=s=>String(s||"").replace(/[_-]+/g," ").replace(/\b\w/g,c=>c.toUpperCase());
 const date=s=>{if(!s)return"Not provided";const d=new Date(s);return Number.isNaN(d.getTime())?"Not provided":d.toLocaleString("en-IN",{timeZone:"Asia/Kolkata",day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",hour12:true})+" IST";};
 const slugParam=new URLSearchParams(location.search).get("slug");
 const pathSlug=decodeURIComponent(location.pathname.replace(/^\/+|\/+$/g,""));
 const slug=slugParam||((pathSlug&&!pathSlug.includes(".")&&!["latest-jobs","results","admit-cards","answer-keys","documents","admissions","iti-jobs","outsourcing-jobs","syllabus"].includes(pathSlug))?pathSlug:"");
 const id=new URLSearchParams(location.search).get("id");
 const status=$("detailStatus");
 function values(object){if(!object||typeof object!=="object")return[];const source=object.details&&typeof object.details==="object"?object.details:object;return Object.entries(source).filter(([k,v])=>!["sourceUrl","isPdf","details"].includes(k)&&v!==null&&v!==""&&typeof v!=="object").slice(0,30);}
 async function load(){if(!API)throw Error("API configuration is missing.");if(!slug&&!id)throw Error("Update not found. Return to the homepage and choose a listing.");const endpoint=slug?API+"/api/posts/slug/"+encodeURIComponent(slug):API+"/api/posts/"+encodeURIComponent(id);const r=await fetch(endpoint,{cache:"no-store"});if(!r.ok)throw Error(r.status===404?"This update could not be found.":"The update service is temporarily unavailable.");const data=await r.json();const p=data.post;if(!p)throw Error("Update not found.");
  document.title=(p.title||"Update Details")+" | Jobs GO7";
  const canonical=document.querySelector('link[rel="canonical"]');if(canonical)canonical.href="https://jobs.go7.in/"+(p.slug||slug||"")+"/";
  $("detailBreadcrumb").innerHTML=' › <a href="/'+esc(p.category)+'/"> '+esc(p.category_label||p.category||"Updates")+'</a> › '+esc(p.title||"Details");
  $("detailCategory").textContent=p.category_label||p.category||"GO7 Update";$("detailTitle").textContent=p.title||"Government Update";
  $("detailMeta").innerHTML='<span><strong>Department / Source:</strong> '+esc(p.source_name||"Original publisher")+'</span><span><strong>Published:</strong> '+esc(date(p.published_at||p.created_at))+'</span>';
  $("detailSummary").textContent=p.summary||"Please open the original notification for complete information and eligibility details.";
  const details=values(p.ai_details);if(details.length){$("extractedDetails").innerHTML='<table class="detail-table">'+details.map(([k,v])=>'<tr><th>'+esc(nice(k))+'</th><td>'+esc(v)+'</td></tr>').join("")+'</table>';$("extractedSection").hidden=false;}
  $("detailTable").innerHTML=[["Update Category",p.category_label||p.category],["Publishing Source",p.source_name||"Original publisher"],["Publication Date",date(p.published_at||p.created_at)]].map(([k,v])=>'<tr><th>'+esc(k)+'</th><td>'+esc(v)+'</td></tr>').join("");
  const link=p.source_url||p.ai_details?.sourceUrl;$("detailLinks").innerHTML=(link?'<a class="official-link" href="'+esc(link)+'" target="_blank" rel="noopener noreferrer">Open Official / Original Notice ↗</a>':'<span>Official notice link not supplied.</span>')+'<a href="/">Back to Jobs GO7 Home</a>';
  $("detailContent").hidden=false;status.textContent="";
 }
 load().catch(e=>{status.textContent=e.message;console.error(e);});
 if($("year"))$("year").textContent=new Date().getFullYear();
})();