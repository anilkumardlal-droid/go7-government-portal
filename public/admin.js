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

$("sync").onclick = async () => {
  const button=$("sync");
  button.disabled=true;
  button.classList.add("is-loading");
  button.textContent="Syncing RSS feeds…";
  try {
    say("Checking configured RSS feeds and official notices…");
    const d = await call("/api/admin/sync", "POST", {});
    say(
      `Sync completed: ${d.sources_checked || 0} sources checked, ` +
      `${d.inserted || 0} new items, ` +
      `${d.skipped || 0} already existing. ` +
      `Government monitors checked: ${d.official?.checked || 0}/${d.official?.total || 0} in this run; ${d.official?.remaining || 0} will rotate through later syncs. ` +
      `Dates auto-read from ${d.date_extraction?.checked || 0} official pages/PDFs in this run (maximum ${d.date_extraction?.limit || 2}); remaining items continue on later syncs. ` +
      `Pending official notices for review: ${d.review_pending || 0}. ` +
      `Errors: ${(d.errors || []).join(" | ") || "None"}`
    );
  } catch (e) {
    say("Sync failed: " + e.message);
  } finally {
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
    if(!items.length){$("review").textContent="No notices are waiting for review.";return;}
    $("review").innerHTML=items.map(item=>{
      const pub=dateInputValue(item.published_at);
      const deadline=dateInputValue(item.application_last_date);
      const expired=Boolean(deadline&&deadline<indiaToday());
      const autoStatus=item.date_checked_at
        ?(pub||deadline?"Automatic date reading found at least one labelled date. Verify the source evidence below.":"Automatic reading finished but could not confirm a labelled date. Admin verification is required.")
        :"Automatic page/PDF reading is waiting for a sync run.";
      const evidence=item.date_evidence?escapeHtml(item.date_evidence):"No date evidence recorded yet.";
      return `<div class="source-row" data-review-card="${item.id}">
        <b>${escapeHtml(item.title)}</b> · ${escapeHtml(item.category)}
        <br><small>${escapeHtml(item.source_name)} · Detected by GO7: ${escapeHtml(item.detected_at||"unknown")} (this is not the notice publication date)</small>
        <br><a href="${escapeHtml(item.source_url)}" target="_blank" rel="noopener">Open official notice</a>
        <p><strong>Date extraction:</strong> ${escapeHtml(autoStatus)}</p>
        <small><strong>What GO7 read:</strong> ${evidence}</small>
        ${expired?'<p><strong>APPLICATION CLOSED — archive notice</strong></p>':""}
        <div class="field"><label>Official publication date (automatically filled when confirmed; otherwise check the notice)</label><input type="date" data-published value="${pub}"></div>
        <div class="field"><label>Application last date (if applicable; automatically filled when confirmed)</label><input type="date" data-deadline value="${deadline}"></div>
        <small>${expired?"The deadline has passed. Approving will publish it as a closed/archived notice.":deadline?"Application deadline is recorded; compare it with the official source.": "If a date could not be confirmed, enter it only after checking the official webpage/PDF. Leave it blank if that date does not apply."}</small>
        <br><button type="button" data-approve="${item.id}" class="primary">Approve & publish</button> <button type="button" data-dismiss="${item.id}" class="secondary">Dismiss</button>
      </div>`;
    }).join("");
  }catch(e){say(e.message);}
}

$("loadReview").onclick=loadReview;
$("review").addEventListener("click",async event=>{
  const approve=event.target.closest("[data-approve]");
  const dismiss=event.target.closest("[data-dismiss]");
  const button=approve||dismiss;
  if(!button)return;
  const id=button.getAttribute(approve?"data-approve":"data-dismiss");
  try{
    const card=button.closest("[data-review-card]");
    const body=approve?{
      published_at:card?.querySelector("[data-published]")?.value||"",
      application_last_date:card?.querySelector("[data-deadline]")?.value||""
    }:{};
    const d=await call(`/api/admin/review/${id}/${approve?"approve":"dismiss"}`,"POST",body);
    say(d.message||"Review updated.");
    await loadReview();
  }catch(e){say(e.message);}
});

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
