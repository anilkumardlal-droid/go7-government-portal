(() => {
  "use strict";
  const API=(window.GO7_CONFIG?.API_BASE||"").replace(/\/$/,"");
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const nice=value=>String(value||"").replace(/[_-]+/g," ").replace(/\b\w/g,c=>c.toUpperCase());
  const missing=value=>{
    if(value===null||value===undefined)return true;
    if(typeof value==="string"){
      const s=value.trim();
      return !s||/^not mentioned in official notification$/i.test(s)||/^not provided$/i.test(s)||/^not available$/i.test(s)||/^n\/?a$/i.test(s);
    }
    if(Array.isArray(value))return !value.length||value.every(missing);
    return false;
  };
  const present=value=>!missing(value);
  const list=value=>Array.isArray(value)?value.filter(present):present(value)?[value]:[];
  const dateText=value=>{
    if(!present(value))return "";
    const s=String(value).trim();
    const iso=s.match(/^(\d{4}-\d{2}-\d{2})/);
    if(iso){
      const p=iso[1].split("-");
      return p[2]+" "+["January","February","March","April","May","June","July","August","September","October","November","December"][Number(p[1])-1]+" "+p[0];
    }
    const d=new Date(s);
    return Number.isNaN(d.getTime())?s:d.toLocaleDateString("en-IN",{timeZone:"Asia/Kolkata",day:"2-digit",month:"long",year:"numeric"});
  };
  const indiaDay=value=>{
    if(!present(value))return "";
    const s=String(value).trim(),match=s.match(/^(\d{4}-\d{2}-\d{2})/);
    if(match)return match[1];
    const d=new Date(s);
    return Number.isNaN(d.getTime())?"":new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(d);
  };
  const today=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const expired=value=>{const d=indiaDay(value);return Boolean(d)&&d<today();};
  const urlSafe=value=>{
    try{const u=new URL(String(value||""));return ["http:","https:"].includes(u.protocol)&&!u.username&&!u.password?u.href:"";}
    catch{return "";}
  };
  const official=value=>{
    const u=urlSafe(value);if(!u)return false;
    const host=new URL(u).hostname.toLowerCase().replace(/\.$/,"");
    return [".gov.in",".nic.in",".ac.in",".edu.in"].some(s=>host.endsWith(s));
  };
  const dateLabels={
    notification_date:"Notification Date",start_date:"Application Start Date",last_date:"Last Date to Apply",
    exam_date:"Examination Date",fee_last_date:"Fee Payment Last Date",correction_date:"Correction Window",
    admit_card_date:"Admit Card Date",result_date:"Result Date"
  };
  const section=(title,body,cls="")=>body?'<section class="go7-post-section '+cls+'"><h2>'+esc(title)+'</h2>'+body+'</section>':"";
  function table(headers,rows,cls=""){
    const valid=(rows||[]).filter(row=>Array.isArray(row)&&row.some(present));
    if(!valid.length)return "";
    return '<div class="go7-table-scroll"><table class="go7-info-table '+cls+'"><thead><tr>'+headers.map(h=>'<th scope="col">'+esc(h)+'</th>').join("")+'</tr></thead><tbody>'+valid.map(row=>'<tr>'+row.map(cell=>'<td>'+esc(present(cell)?(Array.isArray(cell)?cell.filter(present).join(", "):cell):"—")+'</td>').join("")+'</tr>').join("")+'</tbody></table></div>';
  }
  function bullets(values,ordered){
    const items=list(values).map(v=>typeof v==="object"?(v.label||v.name||v.value||""):v).filter(present);
    if(!items.length)return "";
    const tag=ordered?"ol":"ul";
    return '<'+tag+' class="go7-post-bullets">'+items.map(v=>'<li>'+esc(v)+'</li>').join("")+'</'+tag+'>';
  }
  function paragraph(value){
    if(!present(value))return "";
    const parts=String(value).split(/\r?\n+/).map(x=>x.trim()).filter(Boolean);
    if(parts.length>1)return '<ul class="go7-post-bullets">'+parts.map(x=>'<li>'+esc(x.replace(/^[-•*]\s*/,""))+'</li>').join("")+'</ul>';
    return '<p>'+esc(value)+'</p>';
  }
  function rowTable(d,p){
    const facts=d.important_dates&&typeof d.important_dates==="object"?d.important_dates:{};
    const rows=[];
    for(const [key,val] of Object.entries(facts)){
      if(key==="last_date"||!present(val))continue;
      rows.push([dateLabels[key]||nice(key),dateText(val)]);
    }
    const deadline=p.application_last_date||facts.last_date;
    if(present(deadline))rows.push(["Last Date to Apply",dateText(deadline)]);
    return table(["Important Dates","Date"],rows);
  }
  function feeTable(d){
    if(!present(d.application_fee))return "";
    const feeItems=String(d.application_fee).split(/\r?\n+/).map(x=>x.trim()).filter(Boolean);
    if(feeItems.length>1)return '<div class="go7-fee-list">'+bullets(feeItems,false)+'</div>';
    return '<div class="go7-fee-list">'+paragraph(d.application_fee)+'</div>';
  }
  function vacancyTable(d){
    const rows=list(d.vacancy_breakdown).filter(r=>present(r.category||r.category_name)&&present(r.vacancies||r.posts||r.total||r.count))
      .map(r=>[r.category||r.category_name,r.vacancies||r.posts||r.total||r.count]);
    return table(["Category Name","Total Posts"],rows);
  }
  function eligibilityTable(d){
    const rows=list(d.post_wise_eligibility).filter(r=>present(r.post_name||r.post||r.name))
      .map(r=>[r.post_name||r.post||r.name,r.educational_qualification||r.qualification,r.age_limit,r.typing_requirement||r.skill_requirement]);
    return table(["Post Name","Educational Qualification","Age Limit","Typing / Skill Requirement"],rows);
  }
  function renderLinks(p,d){
    const links=[],primary=urlSafe(p.source_url);
    if(primary)links.push({label:official(primary)?"Official Source / Notice":"Original Publisher Page",url:primary,primary:true});
    for(const item of list(d.official_links)){
      const href=urlSafe(item&&item.url);
      if(!href||!official(href)||links.some(x=>x.url===href))continue;
      links.push({label:item.label||"Official Website / Notification",url:href});
    }
    if(!links.length)return "";
    const rows=links.map(x=>[
      x.label,
      '<a href="'+esc(x.url)+'" target="_blank" rel="noopener noreferrer">Click Here ↗</a>'
    ]);
    const body='<div class="go7-important-links"><table class="go7-info-table"><tbody>'+rows.map(r=>'<tr><th>'+esc(r[0])+'</th><td>'+r[1]+'</td></tr>').join("")+'</tbody></table></div>';
    return body;
  }
  function renderFaq(d){
    const faqs=list(d.faqs&&d.faqs.length?d.faqs:d.faq).filter(x=>x&&present(x.question)&&present(x.answer));
    if(!faqs.length)return "";
    return table(["Question","Answer"],faqs.map(x=>[x.question,x.answer]),"go7-faq-table");
  }
  function renderRelatedShell(){
    return '<div class="go7-related-grid"><section class="go7-related-box"><h3>Latest Posts</h3><div id="latestPosts">Loading latest updates…</div></section><section class="go7-related-box"><h3>Related Posts</h3><div id="relatedPosts">Loading related updates…</div></section></div>';
  }
  function renderPost(p){
    const d=p.ai_details&&typeof p.ai_details==="object"?p.ai_details:{};
    const recruitment=(p.category==="jobs-vacancies"||/recruitment/i.test(String(d.notice_type||"")));
    const overview=d.overview||p.summary||"";
    const normalizedOverview=String(overview).toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
    const normalizedTitle=String(p.title||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
    const titleWords=normalizedTitle.split(" ");
    const overviewWords=normalizedOverview.split(" ");
    const startsWithFullTitle=titleWords.length>2&&titleWords.every((word,index)=>overviewWords[index]===word);
    const overviewRemainder=overviewWords.slice(titleWords.length).join(" ");
    const shortTitleRepeat=startsWithFullTitle&&overviewRemainder.length<28;
    const showOverview=present(overview)&&normalizedOverview!==normalizedTitle&&!shortTitleRepeat&&normalizedOverview.length>Math.min(35,normalizedTitle.length);
    const deadline=p.application_last_date||d.important_dates?.last_date;
    const dates=rowTable(d,p);
    const fee=feeTable(d);
    const dateFee=(dates||fee)?'<div class="go7-two-column">'+(dates?section("Important Dates",dates,"go7-date-panel"):"")+(fee?section("Application Fee",fee,"go7-fee-panel"):"")+'</div>':"";
    const topSummary=showOverview?section(recruitment?"Recruitment Overview":"Update Overview",paragraph(overview),"go7-overview-panel"):"";
    const ageVacancy=table(["Age Limit","Total Posts"],[[d.age_limit,d.total_vacancies]],"go7-highlight-table");
    const ageVacancySection=ageVacancy?section(recruitment?"Age Limit & Total Vacancy":"Key Information",ageVacancy,"go7-highlight-section"):"";
    const eligibility=eligibilityTable(d);
    const vacancy=vacancyTable(d);
    const qualification=table(["Eligibility Details","Information"],[
      ["Educational Qualification",d.educational_qualification],
      ["Other Eligibility Conditions",d.eligibility],
      ["Age Relaxation",d.age_relaxation],
      ["Salary / Pay Scale",d.salary]
    ]);
    const selection=bullets(d.selection_process,false);
    const exam=bullets(d.exam_pattern,false);
    const how=bullets(d.how_to_apply,true);
    const documents=bullets(d.documents_required,false);
    const parts=[];
    parts.push(topSummary);
    parts.push(dateFee);
    parts.push(ageVacancySection);
    parts.push(section("Vacancy Details",vacancy));
    parts.push(section("Post-wise Eligibility Criteria",eligibility));
    parts.push(section("Eligibility & Other Details",qualification));
    parts.push(section("How to Apply",how));
    parts.push(section("Mode of Selection",selection));
    parts.push(section("Exam Pattern / Skill Test",exam));
    parts.push(section("Documents Required",documents));
    parts.push(section("Frequently Asked Questions",renderFaq(d)));
    parts.push(section("Some Useful Important Links",renderLinks(p,d),"go7-links-section"));
    parts.push(section("Source & Verification",present(d.source_evidence)?'<p>'+esc(d.source_evidence)+'</p>':(present(p.date_checked_at)?'<p>Source details last checked on '+esc(dateText(p.date_checked_at))+'. Please confirm any subsequent changes with the issuing authority.</p>':'<p>For the latest and complete information, check the original publisher and issuing authority notice.</p>'),"go7-source-section"));
    parts.push(section("Latest & Related Updates",renderRelatedShell(),"go7-related-section"));
    const shareUrl="https://jobs.go7.in/detail.html?id="+encodeURIComponent(p.id);
    const share='<div class="go7-share-row"><strong>Share this update:</strong><a href="https://api.whatsapp.com/send?text='+encodeURIComponent((p.title||"GO7 Update")+" "+shareUrl)+'" target="_blank" rel="noopener noreferrer">WhatsApp</a><a href="https://t.me/share/url?url='+encodeURIComponent(shareUrl)+'&text='+encodeURIComponent(p.title||"GO7 Update")+'" target="_blank" rel="noopener noreferrer">Telegram</a></div>';
    const feedback='<div class="go7-correction-box"><span>Found an error or outdated information? Share the GO7 page URL and the original official notice so we can review it.</span><a href="mailto:jobs@go7.in?subject='+encodeURIComponent("Correction request: "+(p.title||"GO7 update"))+'&body='+encodeURIComponent("GO7 page: "+shareUrl+"\nOriginal source: "+(p.source_url||"")+"\n\nCorrection details:")+'">Report a Correction</a></div>';
    return parts.filter(Boolean).join("")+share+feedback;
  }
  function setMeta(selector,attr,value){
    const node=document.querySelector(selector);
    if(node&&present(value))node.setAttribute(attr,value);
  }
  function iso(value){
    if(!present(value))return "";
    const d=new Date(value);return Number.isNaN(d.getTime())?"":d.toISOString();
  }
  function updateMetadata(p){
    const title=(p.title||"Update Details")+" | Jobs GO7";
    const description=String(p.ai_details?.overview||p.summary||"Government recruitment, result, admit card and examination updates on Jobs GO7.").replace(/\s+/g," ").slice(0,220);
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
    if(iso(p.published_at||p.created_at))schema.datePublished=iso(p.published_at||p.created_at);
    if(iso(p.created_at))schema.dateModified=iso(p.created_at);
    let node=document.getElementById("go7PostSchema");
    if(!node){node=document.createElement("script");node.id="go7PostSchema";node.type="application/ld+json";document.head.appendChild(node);}
    node.textContent=JSON.stringify(schema);
  }
  function relatedLink(post){
    return '<li><a href="/detail.html?id='+encodeURIComponent(post.id)+'">'+esc(post.title||"Government Update")+'</a><small>'+esc(dateText(post.published_at||post.created_at))+'</small></li>';
  }
  async function loadRelated(p){
    const latestTarget=$("latestPosts"),relatedTarget=$("relatedPosts");
    if(!latestTarget||!relatedTarget)return;
    try{
      const latestReq=fetch(API+"/api/posts?limit=6&offset=0",{cache:"no-store"});
      const relatedReq=fetch(API+"/api/posts?"+new URLSearchParams({category:p.category||"",limit:"7",offset:"0"}),{cache:"no-store"});
      const responses=await Promise.all([latestReq,relatedReq]);
      if(!responses[0].ok||!responses[1].ok)throw Error("Related updates service unavailable");
      const datasets=await Promise.all(responses.map(r=>r.json()));
      const latest=(datasets[0].posts||[]).filter(x=>Number(x.id)!==Number(p.id)).slice(0,5);
      const latestIds=new Set(latest.map(x=>Number(x.id)));
      const related=(datasets[1].posts||[]).filter(x=>Number(x.id)!==Number(p.id)&&!latestIds.has(Number(x.id))).slice(0,5);
      latestTarget.innerHTML=latest.length?'<ul class="go7-related-list">'+latest.map(relatedLink).join("")+'</ul>':'<p>No latest updates available.</p>';
      relatedTarget.innerHTML=related.length?'<ul class="go7-related-list">'+related.map(relatedLink).join("")+'</ul>':'<p>No related updates available yet.</p>';
    }catch(error){
      latestTarget.textContent="Latest updates are temporarily unavailable.";
      relatedTarget.textContent="Related updates are temporarily unavailable.";
      console.error("GO7 related updates:",error);
    }
  }
  async function load(){
    if(!API)throw Error("API configuration is missing.");
    const params=new URLSearchParams(location.search);
    const parts=location.pathname.split("/").filter(Boolean);
    const pathSlug=parts[0]==="detail"?(parts[1]||""):"";
    const match=pathSlug.match(/-(\d+)$/);
    const slug=params.get("slug")||(pathSlug&&!match?pathSlug:"");
    const id=params.get("id")||(match?match[1]:"");
    if(!slug&&!id)throw Error("Update not found. Return to the homepage and choose a listing.");
    const endpoint=slug?API+"/api/posts/slug/"+encodeURIComponent(slug):API+"/api/posts/"+encodeURIComponent(id);
    const response=await fetch(endpoint,{cache:"no-store"});
    if(!response.ok)throw Error(response.status===404?"This update could not be found.":"The update service is temporarily unavailable.");
    const data=await response.json(),p=data.post;
    if(!p)throw Error("Update not found.");
    updateMetadata(p);
    const category=p.category||"jobs-vacancies";
    $("detailBreadcrumb").innerHTML=' › <a href="/'+esc(category)+'/">'+esc(p.category_label||nice(category))+'</a> › '+esc(p.title||"Details");
    $("detailCategory").textContent=p.category_label||nice(category);
    $("detailTitle").textContent=p.title||"Government Update";
    const deadline=p.application_last_date||p.ai_details?.important_dates?.last_date;
    const status=present(deadline)?(expired(deadline)?"Application deadline passed":"Application deadline not passed"):"Check original notification for current deadline";
    $("detailMeta").innerHTML='<span><strong>Publisher:</strong> '+esc(p.source_name||"Original publisher")+'</span><span><strong>GO7 Listed:</strong> '+esc(dateText(p.published_at||p.created_at))+'</span><span class="go7-meta-status '+(expired(deadline)?"closed":"")+'">'+esc(status)+'</span>';
    $("detailBody").innerHTML=renderPost(p);
    $("detailContent").hidden=false;
    $("detailStatus").textContent="";
    loadRelated(p);
  }
  load().catch(error=>{
    const status=$("detailStatus");if(status)status.textContent=error.message||"The update could not be loaded.";
    console.error("GO7 post page:",error);
  });
})();