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


$("loadSources").onclick=loadSources;
$("add").onclick=async()=>{
  try{const d=await call("/api/admin/sources","POST",{name:$("name").value.trim(),category:$("category").value,feed_url:$("feed").value.trim()});say(d.message||"Source added.");$("name").value="";$("feed").value="";loadSources();}
  catch(e){say(e.message);}
};

$("sync").onclick = async () => {
  try {
    say("Syncing RSS feeds…");

    const d = await call("/api/admin/sync", "POST", {});

    say(
      `Sync completed: ${d.sources_checked || 0} sources checked, ` +
      `${d.inserted || 0} new posts, ` +
      `${d.skipped || 0} already existing. ` +
      `Pending official notices for review: ${d.review_pending || 0}. ` +
      `Errors: ${(d.errors || []).join(" | ") || "None"}`
    );

  } catch (e) {
    say("Sync failed: " + e.message);
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
    $("review").innerHTML=items.map(item=>`<div class="source-row"><b>${escapeHtml(item.title)}</b> · ${escapeHtml(item.category)}<br><small>${escapeHtml(item.source_name)} · ${escapeHtml(item.detected_at||"")}</small><br><a href="${escapeHtml(item.source_url)}" target="_blank" rel="noopener">Open official notice</a><br><button type="button" data-approve="${item.id}" class="primary">Approve & publish</button> <button type="button" data-dismiss="${item.id}" class="secondary">Dismiss</button></div>`).join("");
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
    const d=await call(`/api/admin/review/${id}/${approve?"approve":"dismiss"}`,"POST",{});
    say(d.message||"Review updated.");
    await loadReview();
  }catch(e){say(e.message);}
});

$("publishPost").onclick=async()=>{try{say("Publishing verified update…");const d=await call("/api/admin/posts","POST",{title:$("postTitle").value.trim(),summary:$("postSummary").value.trim(),category:$("postCategory").value,source_name:$("postSource").value.trim(),source_url:$("postUrl").value.trim()});say(d.message||"Published.");$("postTitle").value="";$("postSummary").value="";$("postUrl").value="";}catch(e){say(e.message);}};

$("loadHealth").onclick=async()=>{try{const d=await call("/api/admin/health");const rows=d.sources||[];$("health").innerHTML=rows.map(x=>`<div class="source-row"><b>${escapeHtml(x.source_name)}</b> · <strong>${escapeHtml(x.status)}</strong><br><small>Checked: ${escapeHtml(x.last_checked_at||"-")} · Last success: ${escapeHtml(x.last_success_at||"-")}</small>${x.last_error?`<br><span style="color:#b5121b">${escapeHtml(x.last_error)}</span>`:""}</div>`).join("")||"No source checks recorded yet. Run Sync RSS feeds first.";}catch(e){say(e.message);}};
