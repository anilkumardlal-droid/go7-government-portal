const API=(window.GO7_CONFIG?.API_BASE||"").replace(/\/$/,"");
const $=id=>document.getElementById(id);
function token(){return $("token").value.trim();}
function say(s){$("msg").textContent=s;}
async function call(path,method="GET",body){
  const r=await fetch(API+path,{method,headers:{"Authorization":"Bearer "+token(),"Content-Type":"application/json"},...(body?{body:JSON.stringify(body)}:{})});
  const data=await r.json().catch(()=>({error:"Invalid API response"}));
  if(!r.ok) throw new Error(data.error||`Request failed (${r.status})`);
  return data;
}
async function loadSources(){
  try{const d=await call("/api/admin/sources");$("sources").innerHTML=(d.sources||[]).map(s=>`<div class="source-row"><b>${escapeHtml(s.name)}</b> · ${escapeHtml(s.category)} · ${s.active?"Active":"Paused"}<br><small>${escapeHtml(s.feed_url)}</small></div>`).join("")||"No sources added.";say("RSS sources loaded.");}
  catch(e){say(e.message);}
}
function escapeHtml(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
const dateInputValue=value=>{if(!value)return"";const match=String(value).match(/^(\d{4}-\d{2}-\d{2})/);if(match)return match[1];const d=new Date(value);return Number.isNaN(d.getTime())?"":new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(d);};
const indiaToday=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());


$("loadSources").onclick=loadSources;
$("add").onclick=async()=>{
  try{const d=await call("/api/admin/sources","POST",{name:$("name").value.trim(),category:$("category").value,feed_url:$("feed").value.trim()});say(d.message||"Source added.");$("name").value="";$("feed").value="";loadSources();}
  catch(e){say(e.message);}
};

function adminSvg(name){
  const paths={
    activity:'<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    rss:'<path d="M5 19a2 2 0 1 0 0 .01"/><path d="M5 12a7 7 0 0 1 7 7"/><path d="M5 5a14 14 0 0 1 14 14"/>',
    globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    skip:'<path d="m5 4 10 8L5 20zM19 5v14"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    alert:'<path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/>',
    check:'<path d="m5 12 4 4L19 6"/>',
    jobs:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18m-11 0v2h4v-2"/>',
    result:'<path d="M5 3h14v18H5zM8 8h8M8 12h4m-4 4 2 2 4-4"/>',
    exam:'<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    key:'<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9m-3 3 3 3m-6 0 3 3"/>',
    education:'<path d="m2 9 10-5 10 5-10 5L2 9Z"/><path d="M6 11v5c3 3 9 3 12 0v-5m4-2v7"/>',
    notice:'<path d="M4 19V5m0 1h13l-2 4 2 4H4"/>',
    file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8m-8 4h8"/>'
  };
  return '<svg class="admin-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+(paths[name]||paths.activity)+'</svg>';
}
function categoryIcon(category){
  const value=String(category||"").toLowerCase();
  if(value.includes("job"))return "jobs";
  if(value.includes("result"))return "result";
  if(value.includes("admit")||value.includes("exam"))return "exam";
  if(value.includes("answer"))return "key";
  if(value.includes("education")||value.includes("admission"))return "education";
  return "notice";
}
function renderSyncStatus(s){
  if(!s)return;
  const progress=Math.max(0,Math.min(100,Number(s.progress)||0));
  const bar=$("syncProgressBar");
  if(bar)bar.style.width=progress+"%";
  $("syncPercent").textContent=Math.round(progress)+"%";
  const progressTrack=document.querySelector(".sync-progress-track");
  if(progressTrack)progressTrack.setAttribute("aria-valuenow",String(Math.round(progress)));
  $("syncMessage").textContent=s.message||"No process message.";
  $("syncCurrent").textContent=s.current_item?"Current source: "+s.current_item:"";
  const state=s.status||"idle";
  const stateLabel=state==="running"?"In progress":state==="completed"?"Completed":state==="failed"?"Failed":"Idle";
  $("syncState").innerHTML=adminSvg(state==="completed"?"check":state==="failed"?"alert":"activity")+'<span>'+stateLabel+'</span>';
  $("syncState").className="sync-state "+state;
  const stats=[
    ["rss","RSS feeds",`${s.rss_checked||0}/${s.rss_total||0}`],
    ["globe","Official checks",`${s.official_checked||0}/${s.official_batch_total||0}`],
    ["plus","New posts",Number(s.inserted)||0],
    ["skip","Skipped / existing",Number(s.skipped)||0],
    ["calendar","Date checks",Number(s.date_checks)||0],
    ["alert","Errors",Array.isArray(s.errors)?s.errors.length:0]
  ];
  $("syncStats").innerHTML=stats.map(([icon,label,value])=>`<div class="sync-stat">${adminSvg(icon)}<strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`).join("");

  const categories=s.category_summary||s.result?.category_summary||[];
  const errors=s.errors||s.result?.errors||[];
  let resultHtml="";
  if(categories.length){
    resultHtml+=`<div class="sync-result-heading">Category-wise published posts</div><div class="sync-category-list">${categories.map(row=>`<div class="sync-category-row">${adminSvg(categoryIcon(row.category||row.label))}<span>${escapeHtml(row.label||row.category)}</span><strong>${Number(row.published_total)||0} total</strong><small>+${Number(row.published_this_sync)||0} this sync</small></div>`).join("")}</div>`;
  }
  if(errors.length){
    resultHtml+=`<div class="sync-result-heading error-heading">${adminSvg("alert")}<span>Recent errors</span></div><ul class="sync-error-list">${errors.map(error=>`<li>${escapeHtml(error)}</li>`).join("")}</ul>`;
  }else if(state==="completed"){
    resultHtml+='<p class="sync-no-errors">'+adminSvg("check")+' No source errors reported in this run.</p>';
  }
  $("syncResults").innerHTML=resultHtml||'<p class="sync-result-empty">Detailed results will appear here as the process runs.</p>';
}

async function refreshSyncStatus(){
  const response=await call("/api/admin/sync/status");
  if(response.status)renderSyncStatus(response.status);
  else $("syncMessage").textContent="No sync process has been recorded yet.";
  return response.status;
}

$("refreshSyncStatus").onclick=async()=>{
  try{await refreshSyncStatus();say("Latest process status refreshed.");}
  catch(e){say("Could not load process status: "+e.message);}
};

$("sync").onclick = async () => {
  const button=$("sync");
  let pollTimer=null;
  button.disabled=true;
  button.classList.add("is-loading");
  button.textContent="Syncing…";
  $("syncState").innerHTML=adminSvg("activity")+'<span>In progress</span>';
  $("syncState").className="sync-state running";
  $("syncMessage").textContent="Starting GO7 sync process…";
  $("syncProgressBar").style.width="1%";
  $("syncPercent").textContent="1%";
  try {
    say("Sync request started. Live progress is updating below.");
    await refreshSyncStatus().catch(()=>{});
    pollTimer=window.setInterval(()=>refreshSyncStatus().catch(error=>console.warn("GO7 sync status:",error)),1200);
    const d=await call("/api/admin/sync","POST",{});
    await refreshSyncStatus().catch(()=>{});
    say(
      `Sync completed: ${d.sources_checked||0} sources checked, `+
      `${d.inserted||0} new items, ${d.skipped||0} already existing. `+
      `Auto-published official notices: ${d.official?.auto_published||0}. `+
      `Older notices awaiting official re-check: ${d.review_pending||0}. `+
      `Errors: ${(d.errors||[]).join(" | ")||"None"}`
    );
  } catch(e) {
    say("Sync failed: "+e.message);
    await refreshSyncStatus().catch(()=>{});
  } finally {
    if(pollTimer)window.clearInterval(pollTimer);
    button.disabled=false;
    button.classList.remove("is-loading");
    button.textContent="Sync RSS feeds";
  }
};

$("reclassify").onclick=async()=>{
  try{say("Checking existing posts and assigning categories…");const d=await call("/api/admin/reclassify","POST",{});say(d.message||`Checked ${d.scanned} posts; updated ${d.updated} categories.`)}
  catch(e){say(e.message);}
};


async function loadReview(){
  try{
    const d=await call("/api/admin/review");
    const items=d.items||[];
    if(!items.length){
      $("review").textContent="No older pending notices. New verified official notices are published automatically.";
      return;
    }
    $("review").innerHTML=items.map(item=>`<div class="source-row">
      <b>${escapeHtml(item.title)}</b> · ${escapeHtml(item.category)}
      <br><small>${escapeHtml(item.source_name)} · Detected: ${escapeHtml(item.detected_at||"unknown")}</small>
      <br><a href="${escapeHtml(item.source_url)}" target="_blank" rel="noopener">Open official source</a>
      <p><strong>Legacy pending notice:</strong> Not republished yet. GO7 will publish it automatically only if it is found again on this monitor's official notice page.</p>
    </div>`).join("");
  }catch(e){say(e.message);}
}

$("loadReview").onclick=loadReview;

$("publishPost").onclick=async()=>{try{say("Publishing verified update…");const d=await call("/api/admin/posts","POST",{title:$("postTitle").value.trim(),summary:$("postSummary").value.trim(),category:$("postCategory").value,source_name:$("postSource").value.trim(),source_url:$("postUrl").value.trim(),published_at:$("postPublished").value,application_last_date:$("postDeadline").value});say(d.message||"Published.");$("postTitle").value="";$("postSummary").value="";$("postUrl").value="";$("postPublished").value="";$("postDeadline").value="";}catch(e){say(e.message);}};

$("loadHealth").onclick=async()=>{try{const d=await call("/api/admin/health");const rows=d.sources||[];$("health").innerHTML=rows.map(x=>`<div class="source-row"><b>${escapeHtml(x.source_name)}</b> · <strong>${escapeHtml(x.status)}</strong><br><small>Checked: ${escapeHtml(x.last_checked_at||"-")} · Last success: ${escapeHtml(x.last_success_at||"-")}</small>${x.last_error?`<br><span style="color:#b5121b">${escapeHtml(x.last_error)}</span>`:""}</div>`).join("")||"No source checks recorded yet. Run Sync RSS feeds first.";}catch(e){say(e.message);}};

// Browser-side PDF parsing keeps large PDF processing out of the Worker CPU budget.
const aiLoadButton = $("loadAiPosts");
if (aiLoadButton) {
  if (window.pdfjsLib) window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  aiLoadButton.onclick = async () => {
    try {
      const d = await call("/api/admin/ai/pending");
      const items = d.items || [];
      $("aiPosts").innerHTML = items.map(item => `<div class="source-row"><b>#${item.id} · ${escapeHtml(item.title)}</b><br><small>${escapeHtml(item.source_name || "")} · ${escapeHtml(item.ai_extraction_status || "pending")}</small><br><button type="button" class="secondary" data-ai-select="${item.id}">Select this post</button></div>`).join("") || "No published Jobs & Vacancies posts found.";
      say(`Loaded ${items.length} Jobs & Vacancies posts.`);
    } catch (e) { say("Could not load AI posts: " + e.message); }
  };
  $("aiPosts").addEventListener("click", event => {
    const button = event.target.closest("[data-ai-select]");
    if (!button) return;
    $("aiPostId").value = button.getAttribute("data-ai-select");
    $("aiStatus").textContent = `Post #${$("aiPostId").value} selected. Choose its official PDF.`;
  });
  $("runAiExtract").onclick = async () => {
    const postId = $("aiPostId").value.trim();
    const file = $("aiPdf").files?.[0];
    const status = $("aiStatus");
    if (!/^\d+$/.test(postId)) { status.textContent = "पहले सूची से एक पोस्ट चुनें।"; return; }
    if (!file || (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf"))) { status.textContent = "कृपया official PDF file चुनें।"; return; }
    if (file.size > 12 * 1024 * 1024) { status.textContent = "PDF अधिकतम 12 MB की होनी चाहिए।"; return; }
    if (!window.pdfjsLib) { status.textContent = "PDF reader load नहीं हुआ। Internet connection जाँचें और page reload करें।"; return; }
    try {
      status.textContent = "PDF browser में पढ़ी जा रही है…";
      const bytes = new Uint8Array(await file.arrayBuffer());
      const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
      if (pdf.numPages > 150) throw new Error("PDF में 150 से अधिक pages हैं। कृपया छोटी official notification PDF चुनें।");
      let extracted = "";
      for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
        const page = await pdf.getPage(pageNo);
        const content = await page.getTextContent();
        extracted += content.items.map(item => item.str || "").join(" ") + "\n";
        if (extracted.length > 50000) { extracted = extracted.slice(0, 50000); break; }
      }
      if (extracted.trim().length < 300) throw new Error("PDF में selectable text नहीं मिला। यह scanned PDF हो सकती है; OCR की जरूरत होगी।");
      status.textContent = "PDF पढ़ ली गई। Cloudflare AI से जानकारी निकाली जा रही है…";
      const result = await call(`/api/admin/posts/${postId}/extract-text`, "POST", { text: extracted, source_url: "" });
      status.textContent = result.message || "AI extraction completed.";
    } catch (e) { status.textContent = "Extraction failed: " + e.message; }
  };
}
