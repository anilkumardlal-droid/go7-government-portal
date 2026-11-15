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
    return Number.isNaN(d.getTime())?String(value):d.toLocaleDateString("en-IN",{timeZone:"Asia/Kolkata",day:"2-digit",month:"short",year:"numeric"});
  };
  const indiaDate=value=>{
    if(!hasValue(value))return "";
    const raw=String(value).trim();
    const iso=raw.match(/^(\d{4}-\d{2}-\d{2})/);
    if(iso)return iso[1];
    const parsed=new Date(raw);
    if(Number.isNaN(parsed.getTime()))return "";
    return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(parsed);
  };
  const todayIndia=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const isExpired=value=>{const day=indiaDate(value);return Boolean(day)&&day<todayIndia();};
  const arrayOf=value=>Array.isArray(value)?value.filter(hasValue):hasValue(value)?[value]:[];
  const safeUrl=value=>{
    try{const u=new URL(String(value||""));return ["https:","http:"].includes(u.protocol)&&!u.username&&!u.password?u.href:"";}
    catch{return "";}
  };
  const isOfficialUrl=value=>{
    const href=safeUrl(value);if(!href)return false;
    try{
      const host=new URL(href).hostname.toLowerCase().replace(/\.$/,"");
      return [".gov.in",".nic.in",".ac.in",".edu.in"].some(suffix=>host.endsWith(suffix));
    }catch{return false;}
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
    const cleanRows=(rows||[]).filter(row=>Array.isArray(row)&&row.some(hasValue));
    if(!cleanRows.length)return "";
    return '<div class="detail-table-wrap"><table class="detail-table"><thead><tr>'+headers.map(h=>'<th scope="col">'+esc(h)+'</th>').join("")+'</tr></thead><tbody>'+cleanRows.map(row=>'<tr>'+row.map(value=>'<td>'+esc(hasValue(value)?(Array.isArray(value)?value.filter(hasValue).join(", "):value):"—")+'</td>').join("")+'</tr>').join("")+'</tbody></table></div>';
  }
  function renderFactList(items){
    const valid=items.filter(item=>hasValue(item.value));
    if(!valid.length)return "";
    return '<dl class="detail-key-facts">'+valid.map(item=>'<div><dt>'+esc(item.label)+'</dt><dd>'+esc(item.value)+'</dd></div>').join("")+'</dl>';
  }
  function renderRelatedPlaceholder(){
    return '<div id="relatedPosts" class="related-post-list"><p class="loading-note">Loading related updates…</p></div>';
  }
  function renderDetails(d,p){
    d=d&&typeof d==="object"?d:{};
    const category=p.category||"jobs-vacancies";
    const isRecruitment=category==="jobs-vacancies"||/recruitment/i.test(String(d.notice_type||""));
    const deadline=p.application_last_date||d.important_dates?.last_date||"";
    const dateRows=[];
    const dates=d.important_dates&&typeof d.important_dates==="object"?d.important_dates:{};
    for(const [key,value] of Object.entries(dates)){
      if(key==="last_date"||!hasValue(value))continue;
      dateRows.push([dateKeys[key]||nice(key),value]);
    }
    if(hasValue(deadline))dateRows.push(["Last Date to Apply",dateLabel(deadline)]);
    const vacancyRows=arrayOf(d.vacancy_breakdown)
      .filter(row=>hasValue(row.category||row.category_name)&&hasValue(row.vacancies||row.posts||row.total||row.count))
      .map(row=>[row.category||row.category_name,row.vacancies||row.posts||row.total||row.count]);
    const eligibilityRows=arrayOf(d.post_wise_eligibility)
      .filter(row=>hasValue(row.post_name||row.post)&&[row.educational_qualification||row.qualification,row.age_limit,row.typing_requirement||row.skill_requirement].some(hasValue))
      .map(row=>[row.post_name||row.post,row.educational_qualification||row.qualification,row.age_limit,row.typing_requirement||row.skill_requirement]);
    const overview=d.overview||p.summary;
    const main=[];
    if(hasValue(overview))main.push(section(isRecruitment?"Recruitment Overview":"Update Overview",'<p class="detail-overview">'+esc(overview)+'</p>'));
    main.push(section("Important Dates",renderTable(["Event","Date"],dateRows)));
    main.push(section("Category-wise Vacancy Details",renderTable(["Category","Number of Posts"],vacancyRows)));
    main.push(section("Post-wise Eligibility",renderTable(["Post Name","Educational Qualification","Age Limit","Typing / Skill Requirement"],eligibilityRows)));
    const qualificationRows=[
      ["Educational Qualification",d.educational_qualification],
      ["Other Eligibility Conditions",d.eligibility],
      ["Age Relaxation",d.age_relaxation],
      ["Salary / Pay Scale",d.salary]
    ];
    main.push(section("Eligibility & Pay Details",renderTable(["Requirement","Details"],qualificationRows)));
    main.push(section("Selection Process",renderList(d.selection_process)));
    main.push(section("Exam Pattern / Skill Test",renderList(d.exam_pattern)));
    main.push(section("How to Apply",renderList(d.how_to_apply,true)));
    main.push(section("Documents Required",renderList(d.documents_required)));
    const faqItems=arrayOf(Array.isArray(d.faqs)&&d.faqs.length?d.faqs:d.faq)
      .filter(item=>item&&typeof item==="object"&&hasValue(item.question)&&hasValue(item.answer));
    if(faqItems.length)main.push(section("Frequently Asked Questions",'<div class="detail-faq-list">'+faqItems.map((item,index)=>'<details class="detail-faq"'+(index===0?' open':'')+'><summary>'+esc(item.question)+'</summary><p>'+esc(item.answer)+'</p></details>').join("")+'</div>'));
    const mainUrl=safeUrl(p.source_url);
    const links=[];
    if(mainUrl)links.push({label:isOfficialUrl(mainUrl)?"Open Government Source":"Open Publisher Page",url:mainUrl,primary:true});
    for(const item of arrayOf(d.official_links)){
      const href=safeUrl(item?.url);
      if(!href||!isOfficialUrl(href)||links.some(link=>link.url===href))continue;
      links.push({label:item.label||"Official Notification / Website",url:href});
    }
    const linkMarkup=links.length?'<div class="detail-link-list">'+links.map(item=>'<a class="detail-action-link '+(item.primary?'primary':'')+'" href="'+esc(item.url)+'" target="_blank" rel="noopener noreferrer">'+esc(item.label)+' <span aria-hidden="true">↗</span></a>').join("")+'</div><p class="detail-small-note">Please confirm the latest notice and application details on the issuing authority’s website.</p>':'<p>Source links have not been added to this listing yet.</p>';
    const evidenceMarkup='<div class="detail-source-card"><div><span class="detail-source-label">Date check</span><strong>'+(hasValue(p.date_checked_at)?'Checked on '+esc(dateLabel(p.date_checked_at)):'Check current details in the original notice')+'</strong></div>'+(hasValue(d.source_evidence)?'<p>'+esc(d.source_evidence)+'</p>':"")+'</div>';
    const facts=[
      {label:"Department / Publisher",value:d.department||p.source_name},
      {label:"Total Vacancies",value:d.total_vacancies},
      {label:"Age Limit",value:d.age_limit},
      {label:"Application Fee",value:d.application_fee}
    ];
    const statusMarkup=hasValue(deadline)?'<p class="detail-deadline '+(isExpired(deadline)?"closed":"open")+'">'+(isExpired(deadline)?"Application deadline has passed":"Application deadline has not passed")+'</p>':'<p class="detail-deadline unknown">Check the original notice for the current application deadline.</p>';
    const sidebar=[
      section("At a Glance",renderFactList(facts)+statusMarkup,"detail-sidebar-card"),
      section("Important Links",linkMarkup,"detail-sidebar-card"),
      section("Source & Verification",evidenceMarkup,"detail-sidebar-card"),
      section("Related Updates",renderRelatedPlaceholder(),"detail-sidebar-card related-detail-section")
    ].join("");
    const correction='<div class="detail-feedback"><p>Found an error or outdated information? Send us the GO7 page link and the official notice link for review.</p><a href="mailto:jobs@go7.in?subject='+encodeURIComponent("Correction request: "+(p.title||"GO7 update"))+'&body='+encodeURIComponent("GO7 page: https://jobs.go7.in/detail.html?id="+p.id+"\nOriginal source: "+(p.source_url||"")+"\n\nPlease explain the correction:")+'">Report a correction</a></div>';
    return '<div class="detail-layout"><div class="detail-primary">'+main.join("")+correction+'</div><aside class="detail-sidebar">'+sidebar+'</aside></div>';
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
  function isoDate(value){
    if(!hasValue(value))return "";
    const d=new Date(value);return Number.isNaN(d.getTime())?"":d.toISOString();
  }
  async function loadRelatedPosts(current){
    const target=$("relatedPosts");if(!target||!current?.category||!current?.id)return;
    try{
      const q=new URLSearchParams({category:current.category,limit:"8",offset:"0"});
      const response=await fetch(API+"/api/posts?"+q,{cache:"no-store"});
      if(!response.ok)throw Error("Related updates service returned "+response.status);
      const data=await response.json();
      const posts=(data.posts||[]).filter(item=>Number(item.id)!==Number(current.id)).slice(0,5);
      target.innerHTML=posts.length?posts.map(item=>'<article class="related-post-card"><h3><a href="'+(item.id?'/detail.html?id='+encodeURIComponent(item.id):'#')+'">'+esc(item.title||"Government Update")+'</a></h3><p>'+esc(dateLabel(item.published_at||item.created_at))+'</p></article>').join(""):'<p>No related updates are available yet.</p>';
    }catch(error){target.innerHTML='<p>Related updates are temporarily unavailable.</p>';console.error("GO7 related updates:",error);}
  }
  async function load(){
    const status=$("detailStatus");
    if(!API)throw Error("API configuration is missing.");
    const params=new URLSearchParams(location.search),parts=location.pathname.split("/").filter(Boolean);
    const pathSlug=parts[0]==="detail"?(parts[1]||""):"";
    const idMatch=pathSlug.match(/-(\d+)$/);
    const slug=params.get("slug")||(pathSlug&&!idMatch?pathSlug:"");
    const id=params.get("id")||(idMatch?idMatch[1]:"");
    if(!slug&&!id)throw Error("Update not found. Return to the homepage and choose a listing.");
    const endpoint=slug?API+"/api/posts/slug/"+encodeURIComponent(slug):API+"/api/posts/"+encodeURIComponent(id);
    const response=await fetch(endpoint,{cache:"no-store"});
    if(!response.ok)throw Error(response.status===404?"This update could not be found.":"The update service is temporarily unavailable.");
    const data=await response.json(),post=data.post;
    if(!post)throw Error("Update not found.");
    setPageMetadata(post);
    const category=post.category||"jobs-vacancies";
    $("detailBreadcrumb").innerHTML=' › <a href="/'+esc(category)+'/">'+esc(post.category_label||nice(category))+'</a> › '+esc(post.title||"Details");
    $("detailCategory").textContent=post.category_label||nice(category);
    $("detailTitle").textContent=post.title||"Government Update";
    const deadline=post.application_last_date||post.ai_details?.important_dates?.last_date||"";
    const deadlineState=hasValue(deadline)?(isExpired(deadline)?"Deadline passed":"Deadline not passed"):"Check original notification";
    $("detailMeta").innerHTML='<span><strong>Publisher:</strong> '+esc(post.source_name||"Original publisher")+'</span><span><strong>Listed:</strong> '+esc(dateLabel(post.published_at||post.created_at))+'</span><span class="detail-status-pill '+(isExpired(deadline)?'closed':'')+'">'+esc(deadlineState)+'</span>';
    $("detailBody").innerHTML=renderDetails(post.ai_details,post);
    $("detailContent").hidden=false;
    status.textContent="";
    loadRelatedPosts(post);
  }
  load().catch(error=>{const status=$("detailStatus");if(status)status.textContent=error.message||"The update could not be loaded.";console.error("GO7 detail:",error);});
})();