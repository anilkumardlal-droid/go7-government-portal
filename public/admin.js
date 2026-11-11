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
  try{const d=await call("/api/admin/sources");$("sources").innerHTML=(d.sources||[]).map(s=>`<div class="source-row"><b>${s.name}</b> · ${s.category} · ${s.active?"Active":"Paused"}<br><small>${s.feed_url}</small></div>`).join("")||"No sources added.";say("Sources loaded.");}
  catch(e){say(e.message);}
}
$("loadSources").onclick=loadSources;
$("add").onclick=async()=>{
  try{
    const d=await call("/api/admin/sources","POST",{name:$("name").value.trim(),category:$("category").value,feed_url:$("feed").value.trim()});
    say(d.message||"Source added.");$("name").value="";$("feed").value="";loadSources();
  }catch(e){say(e.message);}
};
$("sync").onclick=async()=>{
  try{say("Syncing feeds…");const d=await call("/api/admin/sync","POST",{});say(`Sync complete. Sources checked: ${d.sources_checked}. New posts: ${d.inserted}. Skipped: ${d.skipped}. Errors: ${d.errors.length}${d.errors.length?"\n"+d.errors.join("\n"):""}`);}
  catch(e){say(e.message);}
};
