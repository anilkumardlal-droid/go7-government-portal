(() => {
  "use strict";
  const API=(window.GO7_CONFIG?.API_BASE||"").replace(/\/$/,"");
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const nice=value=>String(value||"").replace(/[_-]+/g," ").replace(/\b\w/g,c=>c.toUpperCase());
  const isMissing=value=>{
    if(value===null||value===undefined)return true;
    if(typeof value==="string"){
      const s=value.trim();
      return !s||/^not mentioned in official notification$/i.test(s)||/^not provided$/i.test(s)||/^not available$/i.test(s)||/^n\/?a$/i.test(s);
    }
    if(Array.isArray(value))return value.length===0||value.every(isMissing);
    return false;
  };
  const hasValue=value=>!isMissing(value);
  const dateLabel=value=>{
    if(!hasValue(value))return "Not provided";
    const d=new Date(value);
    return Number.isNaN(d.getTime())?String(value):d.toLocaleDateString("en-IN",{timeZone:"Asia/Kolkata",day:"2-digit",month:"long",year:"numeric"});
  };
  const isoDate=value=>{
    if(!hasValue(value))return "";
    const d=new Date(value);
    return Number.isNaN(d.getTime())?"":d.toISOString();
  };
  const todayIndia=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const isExpired=value=>hasValue(value)&&String(value).slice(0,10)<todayIndia();
  const arrayOf=value=>Array.isArray(value)?value.filter(hasValue):hasValue(value)?[value]:[];
  const safeUrl=value=>{
    try{const u=new URL(String(value||""));return ["https:","http:"].includes(u.protocol)&&!u.username&&!u.password?u.href:"";}
    catch{return "";}
  };
  const dateKeys={notification_date:"Notification Date",start_date:"Application Start Date",last_date:"Last Date to Apply",exam_date:"Examination Date",fee_last_date:"Fee Payment Last Date",correction_date:"Correction Window",admit_card_date:"Admit Card Date",result_date:"Result Date"};
  function section(title,body,extra=""){
    return body?'<section class="detail-section '+extra+'"><h2>'+esc(title)+'</h2>'+body+'</section>':"";
  }
  function renderList(items,ordered=false){
    const values=arrayOf(items).map(item=>typeof item==="object"?item.label||item.name||item.value||"":item).filter(hasValue);
    if(!values.length)return "";
    const tag=ordered?"ol":"ul";
    return '<'+tag+' class="detail-bullet-list">'+values.map(value=>'<li>'+esc(value)+'</li>').join("")+'</'+tag+'>';
  }
  function renderTable(headers,rows){
    const cleanRows=(rows||[]).filter(row=>Array.isArray(row)&&row.some(value=>hasValue(value)));
    if(!cleanRows.length)return "";
    return '<div class="detail-table-wrap"><table class="detail-table"><thead><tr>'+headers.map(h=>'<th scope="col">'+esc(h)+'</th>').join("")+'</tr></thead><tbody>'+cleanRows.map(row=>'<tr>'+row.map(value=>'<td>'+esc(Array.isArray(value)?value.filter(hasValue).join(", "):value)+'</td>').join("")+'</tr>').join("")+'</tbody></table></div>';
  }
  function renderFactGrid(items){
    const valid=items.filter(item=>hasValue(item.value));
    if(!valid.length)return "";
    return '<div class="detail-facts-grid">'+valid.map(item=>'<div class="detail-fact"><span>'+esc(item.label)+'</span><strong>'+esc(item.value)+'</strong></div>').join("")+'</div>';
  }
  function renderDetails(d,p){
    d=d&&typeof d==="object"?d:{};
    let html="";
    const overview=d.overview||p.summary;
    if(hasValue(overview))html+=section("Recruitment Overview",'<p class="detail-overview">'+esc(overview)+'</p>');
    html+=section("Quick Information",renderFactGrid([
      {label:"Department",value:d.department},
      {label:"Total Vacancies",value:d.total_vacancies},
      {label:"Qualification",value:d.educational_qualification||d.eligibility},
      {label:"Age Limit",value:d.age_limit},
      {label:"Application Fee",value:d.application_fee},
      {label:"Salary / Pay Scale",value:d.salary}
    ]));
    const dates=d.important_dates&&typeof d.important_dates==="object"?d.important_dates:{};
    const dateRows=Object.entries(dates).filter(([,v])=>hasValue(v)).map(([k,v])=>[dateKeys[k]||nice(k),v]);
    if(hasValue(p.published_at)&&!dateRows.some(row=>/notification|publication/i.test(row[0])))dateRows.unshift(["GO7 Listed Date",dateLabel(p.published_at)]);
    const deadline=p.application_last_date||dates.last_date;
    if(hasValue(deadline)&&!dateRows.some(row=>/last date|deadline/i.test(row[0])))dateRows.push(["Application Last Date",dateLabel(deadline)]);
    html+=section("Important Dates",renderTable(["Event","Date"],dateRows));
    html+=section("Application Fee",renderTable(["Fee Details","Information"],hasValue(d.application_fee)?[["Application Fee",d.application_fee]]:[]));
    const vacancyRows=arrayOf(d.vacancy_breakdown).map(row=>[
      row.category||row.category_name||row.post_name||row.name,
      row.vacancies||row.posts||row.total||row.count
    ]);
    html+=section("Category-wise Vacancy Details",renderTable(["Category / Post","Vacancies"],vacancyRows));
    const eligibilityRows=arrayOf(d.post_wise_eligibility).map(row=>[
      row.post_name||row.post||row.name,
      row.educational_qualification||row.qualification,
      row.age_limit,
      row.typing_requirement||row.skill_requirement
    ]);
    html+=section("Post-wise Eligibility",renderTable(["Post Name","Educational Qualification","Age Limit","Typing / Skill Requirement"],eligibilityRows));
    html+=section("Eligibility & Age Limit",renderTable(["Requirement","Details"],[
      ["Eligibility",d.eligibility],["Educational Qualification",d.educational_qualification],
      ["Age Limit",d.age_limit],["Age Relaxation",d.age_relaxation],["Salary / Pay Scale",d.salary]
    ]));
    html+=section("Selection Process",renderList(d.selection_process));
    html+=section("Exam Pattern / Skill Test",renderList(d.exam_pattern));
    html+=section("How to Apply",renderList(d.how_to_apply,true));
    html+=section("Documents Required",renderList(d.documents_required));
    const faqItems=arrayOf(Array.isArray(d.faqs)&&d.faqs.length?d.faqs:d.faq).filter(x=>x&&typeof x==="object"&&hasValue(x.question)&&hasValue(x.answer));
    if(faqItems.length)html+=section("Frequently Asked Questions",'<div class="detail-faq-list">'+faqItems.map((item,index)=>'<details class="detail-faq"'+(index===0?' open':'')+'><summary>'+esc(item.question)+'</summary><p>'+esc(item.answer)+'</p></details>').join("")+'</div>');
    const officialLinks=arrayOf(d.official_links).map(item=>({label:item.label||"Official Link",url:safeUrl(item.url)})).filter(item=>item.url);
    const mainUrl=safeUrl(p.source_url),linkItems=[];
    if(mainUrl)linkItems.push({label:"Open Original / Official Notice",url:mainUrl,primary:true});
    for(const item of officialLinks)if(!linkItems.some(existing=>existing.url===item.url))linkItems.push(item);
    html+=section("Important Links",linkItems.length?'<div class="detail-link-list">'+linkItems.map(item=>'<a class="detail-action-link '+(item.primary?'primary':'')+'" href="'+esc(item.url)+'" target="_blank" rel="noopener noreferrer">'+esc(item.label)+' <span aria-hidden="true">↗</span></a>').join("")+'</div><p class="detail-small-note">External links open on the publisher’s website. Check the latest notice before applying.</p>':'<p>Original publisher link is not available in this listing.</p>');
    const sourceName=p.source_name||d.department||"Original publisher";
    const sourceMarkup='<div class="detail-source-card"><div><span class="detail-source-label">Information source</span><strong>'+esc(sourceName)+'</strong></div><div><span class="detail-source-label">Information check</span><strong>'+(hasValue(p.date_checked_at)?'Date details checked on '+esc(dateLabel(p.date_checked_at)):'Please verify current details in the original notice')+'</strong></div>'+(hasValue(d.source_evidence)?'<p>'+esc(d.source_evidence)+'</p>':"")+'</div>';
    html+=section("Source & Verification",sourceMarkup);
    html+=section("Related Updates",'<div id="relatedPosts" class="related-post-list"><p class="loading-note">Loading related updates…</p></div>',"related-detail-section");
    html+='<div class="detail-feedback"><p>Found an error or an outdated detail? Please send the page URL and the official notice link so we can review it.</p><a href="mailto:jobs@go7.in?subject='+encodeURIComponent("Correction request: "+(p.title||"GO7 update"))+'&body='+encodeURIComponent("GO7 page: https://jobs.go7.in/detail.html?id="+p.id+"\nOfficial source URL: "+(p.source_url||"")+"\n\nPlease explain the correction:")+'">Report a correction</a></div>';
    return html;
  }
  function setMeta(selector,attribute,value){
    const node=document.querySelector(selector);
    if(node&&hasValue(value))node.setAttribute(attribute,value);
  }
  function setPageMetadata(p){
    const title=(p.title||"Update Details")+" | Jobs GO7";
    const description=String(p.ai_details?.overview||p.summary||"Detailed government recruitment and examination information with links to the original publisher.").replace(/\s+/g," ").slice(0,220);
    const canonical="https://jobs.go7.in/detail.html?id="+encodeURIComponent(p.id);
    document.title=title;
    setMeta('meta[name="description"]',"content",description);
    setMeta('meta[property="og:title"]',"content",title);
    setMeta('meta[property="og:description"]',"content",description);
    setMeta('meta[property="og:url"]',"content",canonical);
    setMeta('meta[name="twitter:title"]',"content",title);
    setMeta('meta[name="twitter:description"]',"content",description);
    setMeta('link[rel="canonical"]',"href",canonical);
    const schema={"@context":"https://schema.org","@type":"WebPage","@id":canonical+"#webpage","url":canonical,"name":title,"description":description,"inLanguage":"en-IN","isPartOf":{"@type":"WebSite","name":"Jobs GO7","url":"https://jobs.go7.in/"},"publisher":{"@type":"Organization","name":"Jobs GO7","url":"https://jobs.go7.in/"}};
    const published=isoDate(p.published_at||p.created_at),modified=isoDate(p.created_at);
    if(published)schema.datePublished=published;
    if(modified)schema.dateModified=modified;
    let script=document.getElementById("go7PostSchema");
    if(!script){script=document.createElement("script");script.id="go7PostSchema";script.type="application/ld+json";document.head.appendChild(script);}
    script.textContent=JSON.stringify(schema);
  }
  async function loadRelatedPosts(current){
    const target=$("relatedPosts");
    if(!target||!current?.category||!current?.id)return;
    try{
      const q=new URLSearchParams({category:current.category,limit:"8",offset:"0"});
      const r=await fetch(API+"/api/posts?"+q,{cache:"no-store"});
      if(!r.ok)throw Error("Related updates service returned "+r.status);
      const data=await r.json();
      const posts=(data.posts||[]).filter(item=>Number(item.id)!==Number(current.id)).slice(0,5);
      target.innerHTML=posts.length?posts.map(item=>'<article class="related-post-card"><h3><a href="'+(item.id?'/detail.html?id='+encodeURIComponent(item.id):'#')+'">'+esc(item.title||"Government Update")+'</a></h3><p>'+esc(dateLabel(item.published_at||item.created_at))+'</p></article>').join(""):'<p>No related updates are available yet.</p>';
    }catch(error){target.innerHTML='<p>Related updates are temporarily unavailable.</p>';console.error("GO7 related updates:",error);}
  }
  async function load(){
    const status=$("detailStatus");
    if(!API)throw Error("API configuration is missing.");
    const params=new URLSearchParams(location.search),pathParts=location.pathname.split("/").filter(Boolean);
    const pathSlug=pathParts[0]==="detail"?(pathParts[1]||""):"";
    const routeIdMatch=pathSlug.match(/-(\d+)$/);
    const slug=params.get("slug")||(pathSlug&&!routeIdMatch?pathSlug:"");
    const id=params.get("id")||(routeIdMatch?routeIdMatch[1]:"");
    if(!slug&&!id)throw Error("Update not found. Return to the homepage and choose a listing.");
    const endpoint=slug?API+"/api/posts/slug/"+encodeURIComponent(slug):API+"/api/posts/"+encodeURIComponent(id);
    const response=await fetch(endpoint,{cache:"no-store"});
    if(!response.ok)throw Error(response.status===404?"This update could not be found.":"The update service is temporarily unavailable.");
    const data=await response.json(),p=data.post;
    if(!p)throw Error("Update not found.");
    setPageMetadata(p);
    const category=p.category||"jobs-vacancies";
    $("detailBreadcrumb").innerHTML=' › <a href="/'+esc(category)+'/">'+esc(p.category_label||nice(category))+'</a> › '+esc(p.title||"Details");
    $("detailCategory").textContent=p.category_label||nice(category);
    $("detailTitle").textContent=p.title||"Government Update";
    const deadline=p.application_last_date;
    const statusText=hasValue(deadline)?(isExpired(deadline)?"Application deadline passed":"Application deadline not passed"):"Check original notification for current deadline";
    $("detailMeta").innerHTML='<span><strong>Publisher:</strong> '+esc(p.source_name||"Original publisher")+'</span><span><strong>Listed:</strong> '+esc(dateLabel(p.published_at||p.created_at))+'</span><span><strong>Last date:</strong> '+esc(dateLabel(deadline))+'</span><span class="detail-status-pill '+(isExpired(deadline)?'closed':'')+'">'+esc(statusText)+'</span>';
    $("detailBody").innerHTML=renderDetails(p.ai_details,p);
    $("detailContent").hidden=false;
    status.textContent="";
    loadRelatedPosts(p);
  }
  load().catch(error=>{const status=$("detailStatus");if(status)status.textContent=error.message||"The update could not be loaded.";console.error("GO7 detail:",error);});
})();