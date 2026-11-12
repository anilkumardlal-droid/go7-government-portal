
const CATEGORIES = [
  ["results","Results"], ["admit-cards","Admit Cards"], ["latest-jobs","Latest Jobs"],
  ["answer-keys","Answer Key"], ["documents","Documents"], ["admissions","Admission"],
  ["iti-jobs","10th/ITI Jobs"], ["outsourcing-jobs","Outsourcing Jobs"], ["syllabus","Syllabus"]
];

const CATEGORY_SET = new Set(CATEGORIES.map(x=>x[0]));

function detectCategory(title = "", summary = "") {
  const text = `${title} ${summary}`.toLowerCase().replace(/[\u2010-\u2015]/g,"-").replace(/\s+/g," ").trim();
  const rules = [
    ["answer-keys", /\b(answer\s*keys?|provisional answer|final answer key)\b/],
    ["admit-cards", /\b(admit\s*cards?|hall tickets?|call letters?|e-admit|download admit)\b/],
    ["results", /\b(results?|merit\s*lists?|score\s*cards?|cut[- ]?offs?|qualified candidates|selection lists?|selected candidates)\b/],
    ["documents", /\b(document verification|certificate verification|document upload|important documents|correction window|photo|signature)\b/],
    ["admissions", /\b(admissions?|entrance applications?|enrolments?|enrollments?|counselling|counseling|seat allotment|university applications?)\b/],
    ["syllabus", /\b(syllabus|exam patterns?)\b/],
    ["outsourcing-jobs", /\b(outsourc(?:e|ed|ing)|manpower|agency based|service provider)\b/],
    ["iti-jobs", /\b(10th pass|class 10|matric|iti|industrial training institute|trade apprentice)\b/]
  ];
  for (const [category, pattern] of rules) if (pattern.test(text)) return category;
  const jobTerms = /\b(recruitment|vacanc(?:y|ies)|apprentice|appointment|hiring|apply online|posts?|jobs?|filling up|walk[- ]?in|engagement|career|applications invited|deputation basis|contract basis|employment notice|employment notification)\b/i;
  if (jobTerms.test(text)) return "latest-jobs";
  return "latest-jobs";
}

function isOfficialHost(hostname) {
  const host = String(hostname || "").toLowerCase().replace(/\.$/, "");
  return host.endsWith(".gov.in") || host.endsWith(".nic.in") || host.endsWith(".ac.in") || host.endsWith(".edu.in");
}

function isUsefulNoticeTitle(title) {
  const value = clean(title, 220).toLowerCase().replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim();
  if (value.length < 16) return false;
  return !/^(download )?(admit card|hall ticket|notice|notification|recruitment|advertisement|click here|read more|latest update|important notice)$/.test(value);
}

const json = (data,status=200,origin="*") => new Response(JSON.stringify(data),{
  status,
  headers:{
    "content-type":"application/json; charset=utf-8",
    "access-control-allow-origin":origin,
    "access-control-allow-methods":"GET,POST,OPTIONS",
    "access-control-allow-headers":"Content-Type,Authorization"
  }
});

const clean = (s,max=500) => String(s||"")
  .replace(/<[^>]*>/g," ")
  .replace(/\s+/g," ").trim().slice(0,max);

const decode = s => String(s||"")
  .replace(/&amp;/g,"&")
  .replace(/&lt;/g,"<")
  .replace(/&gt;/g,">")
  .replace(/&quot;/g,'"')
  .replace(/&#39;|&apos;/g,"'")
  .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)));

function tagValue(block,names){
  for(const name of names){
    const re=new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,"i");
    const m=block.match(re);
    if(m) return decode(m[1].replace(/<!\[CDATA\[|\]\]>/g,""));
  }
  return "";
}

function attrValue(block,tag,attr){
  const re=new RegExp(`<${tag}\\b([^>]*)>`,"i");
  const m=block.match(re);
  if(!m)return "";
  const a=m[1].match(new RegExp(`${attr}=["']([^"']+)["']`,"i"));
  return a?decode(a[1]):"";
}

function parseFeed(xml,source){
  const entries=[];
  const blocks=[...xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)].map(x=>x[0]);

  for(const b of blocks){
    const title=clean(tagValue(b,["title"]),220);
    let link=tagValue(b,["link"]);

    if(!link) link=attrValue(b,"link","href");
    if(!link) link=tagValue(b,["guid","id"]);

    const guid=clean(tagValue(b,["guid","id"]),500)||link||title;
    const summary=clean(tagValue(b,["description","summary","content:encoded","content"]),360);
    const date=tagValue(b,["pubDate","published","updated","dc:date"]);

    if(title && safeHttpUrl(link)){
      entries.push({
        title,
        link,
        guid,
        summary,
        publishedAt:validDate(date)
      });
    }
  }
  return entries;
}

function validDate(s){
  if(!s)return null;
  const d=new Date(s);
  return Number.isNaN(d.getTime())?null:d.toISOString();
}

function safeHttpUrl(value){
  try{
    const u=new URL(value);
    return ["http:","https:"].includes(u.protocol)&&!u.username&&!u.password;
  }catch{
    return false;
  }
}

async function validateFeedUrl(value){
  if(!safeHttpUrl(value)){
    throw new Error("Feed URL must be a valid HTTP(S) URL.");
  }

  const u=new URL(value);
  const host=u.hostname.toLowerCase();

  if(!isOfficialHost(host)){
    throw new Error("Only official government / public-institution domains (.gov.in, .nic.in, .ac.in, .edu.in) are accepted.");
  }

  if(host==="localhost"||host==="127.0.0.1"||host==="::1"||
     host.endsWith(".local")||
     /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)){
    throw new Error("Private/local feed hosts are not allowed.");
  }

  return u.toString();
}

function auth(req,env){
  return Boolean(env.ADMIN_TOKEN)&&
    req.headers.get("authorization")==="Bearer "+env.ADMIN_TOKEN;
}

/* Network resilience: bounded retries with backoff; one failing source never stops other sources. */
async function fetchWithRetry(url, options={}, attempts=3, timeoutMs=12000) {
  let last;
  for (let attempt=1; attempt<=attempts; attempt++) {
    try {
      const response = await fetch(url, {...options, signal:AbortSignal.timeout(timeoutMs)});
      if (response.ok || response.status < 500) return response;
      last = new Error(`HTTP ${response.status}`);
    } catch (e) { last=e; }
    if (attempt < attempts) await new Promise(resolve=>setTimeout(resolve, 350*attempt));
  }
  throw last || new Error("Source unavailable after retries");
}

/* RSS FETCH */
async function fetchFeed(source,env){
  const feedUrl=await validateFeedUrl(source.feed_url);

  const res=await fetchWithRetry(feedUrl,{
    method:"GET",
    headers:{
      "User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
      "Accept":"application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
      "Accept-Language":"en-US,en;q=0.9",
      "Cache-Control":"no-cache"
    },
    redirect:"follow",
  },2,8000);

  const type=res.headers.get("content-type")||"";
  const finalUrl = res.url || feedUrl;
  if (!safeHttpUrl(finalUrl) || !isOfficialHost(new URL(finalUrl).hostname)) {
    throw new Error("Feed redirected outside an approved official domain.");
  }
  const text=await res.text();

  if(!res.ok) throw new Error(`HTTP ${res.status}`);

  if(text.length>1500000) throw new Error("Feed exceeds 1.5 MB limit");

  if(!/xml|rss|atom|text\/plain/i.test(type)&&
     !/<(rss|feed|rdf:RDF)\b/i.test(text.slice(0,1000))){
    throw new Error("Response does not look like RSS/Atom XML");
  }

  const parsed = parseFeed(text,source);
  return parsed.filter(item => {
    try { return isOfficialHost(new URL(item.link).hostname) && isUsefulNoticeTitle(item.title); }
    catch { return false; }
  }).slice(0, Math.max(1, Math.min(50, Number(env.MAX_ITEMS_PER_FEED) || 25)));
}


// Official government recruitment pages
const OFFICIAL_MONITORS = [
  {
    name:"UPSC Official Recruitment",
    category:"latest-jobs",
    urls:[
      "https://www.upsc.gov.in/recruitment/recruitment-advertisement",
      "https://cms.upsc.gov.in/archived-advertisements/"
    ],
    hosts:["www.upsc.gov.in","upsc.gov.in","cms.upsc.gov.in"]
  },
  {
    name:"SSC Official Notices",
    category:"latest-jobs",
    urls:[
      "https://ssc.gov.in/",
      "https://ssccr.gov.in/announcements"
    ],
    hosts:["ssc.gov.in","www.ssc.gov.in","ssccr.gov.in"]
  },
  {
    name:"Railway RRB Employment Notices",
    category:"latest-jobs",
    urls:[
      "https://www.rrbcdg.gov.in/employment-notices.php",
      "https://rrbahmedabad.gov.in/exams/"
    ],
    hosts:[
      "www.rrbcdg.gov.in",
      "rrbcdg.gov.in",
      "rrbahmedabad.gov.in"
    ]
  }
];

const RECRUITMENT_RE =
  /\b(recruitment|recruit|vacanc(?:y|ies)|advertisement|employment notice|employment notification|job notification|apply online|application form|applications invited|short notice|cen[-\s]?\d|ntpc|group[-\s]?d|assistant loco|technician|junior engineer|selection post|combined graduate|combined higher secondary|stenographer|constable|sub[-\s]?inspector|admit card|hall ticket|answer key|result|merit list|exam date|exam schedule|apprentice)\b/i;

const IGNORE_RE =
  /\b(tender|procurement|quotation|annual report|press release|meeting|photo gallery|celebration|e[-\s]?auction)\b/i;


function extractOfficialLinks(html,pageUrl,monitor){
  const out=[];
  const seen=new Set();

  const anchors=html.match(/<a\b[^>]*>[\s\S]*?<\/a>/gi)||[];

  for(const a of anchors){
    const hm=a.match(/\bhref\s*=\s*(["'])(.*?)\1/i);
    if(!hm)continue;

    const title=clean(decode(a.replace(/<[^>]*>/g," ")),220);

    if(title.length<8||
       !RECRUITMENT_RE.test(title)||
       IGNORE_RE.test(title))continue;

    let target;

    try{
      target=new URL(decode(hm[2]),pageUrl);
    }catch{
      continue;
    }

    if(!/^https?:$/.test(target.protocol)||
       !monitor.hosts.includes(target.hostname.toLowerCase()))continue;

    if(target.pathname==="/"||
       target.href===pageUrl||
       seen.has(target.href))continue;

    seen.add(target.href);
    out.push({title,link:target.href});

    if(out.length>=12)break;
  }

  return out;
}


async function fetchOfficialMonitor(monitor){
  const failures=[];

  for(const pageUrl of monitor.urls){
    try{
      const response=await fetchWithRetry(pageUrl,{
        method:"GET",
        redirect:"follow",
        headers:{
          "Accept":"text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language":"en-IN,en;q=0.9"
        },
      },2,6000);

      if(!response.ok){
        failures.push(
          `${new URL(pageUrl).hostname}: HTTP ${response.status}`
        );
        continue;
      }

      const html=await response.text();

      if(html.length>2500000){
        failures.push("Page too large");
        continue;
      }

      const entries=extractOfficialLinks(html,pageUrl,monitor);

if(entries.length){
  return {
    entries,
    checkedUrl:pageUrl,
    error:null
  };
}

failures.push(
  `${new URL(pageUrl).hostname}: no matching notice links found`
);

    }catch(e){
      failures.push(
        `${new URL(pageUrl).hostname}: ${
          e.name==="TimeoutError"?"timeout":clean(e.message,100)
        }`
      );
    }
  }

  return {
    entries:[],
    checkedUrl:null,
    error:failures.join("; ")||"No official page could be fetched"
  };
}


async function syncOfficialMonitors(db){
  let inserted=0;
  let skipped=0;
  const errors=[];

  const results=await Promise.all(
    OFFICIAL_MONITORS.map(m=>fetchOfficialMonitor(m))
  );

  for(let i=0;i<OFFICIAL_MONITORS.length;i++){
    const monitor=OFFICIAL_MONITORS[i];
    const result=results[i];

    if(result.error){
      errors.push(`${monitor.name}: ${result.error}`);
      await db.prepare("INSERT INTO source_health(source_name,status,last_checked_at,last_success_at,last_error) VALUES(?,'error',CURRENT_TIMESTAMP,NULL,?) ON CONFLICT(source_name) DO UPDATE SET status='error',last_checked_at=CURRENT_TIMESTAMP,last_error=excluded.last_error").bind(monitor.name,clean(result.error,500)).run();
      continue;
    }
    await db.prepare("INSERT INTO source_health(source_name,status,last_checked_at,last_success_at,last_error) VALUES(?,'ok',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,NULL) ON CONFLICT(source_name) DO UPDATE SET status='ok',last_checked_at=CURRENT_TIMESTAMP,last_success_at=CURRENT_TIMESTAMP,last_error=NULL").bind(monitor.name).run();

    for(const item of result.entries){
      const guid=("official-page|"+item.link).slice(0,900);

      const fingerprint = guid;
      const duplicate = await db.prepare("SELECT id FROM posts WHERE lower(title)=lower(?) LIMIT 1").bind(item.title).first();
      if (duplicate) { skipped++; continue; }
      const write=await db.prepare(`
        INSERT OR IGNORE INTO review_items
        (fingerprint,title,summary,category,source_name,source_url,status)
        VALUES(?,?, '', ?,?,?, 'pending')
      `).bind(
        fingerprint,
        item.title,
        detectCategory(item.title, ""),
        monitor.name,
        item.link
      ).run();

      if(write.meta?.changes)inserted++;
      else skipped++;
    }
  }

  return {
    checked:OFFICIAL_MONITORS.length,
    inserted,
    skipped,
    errors
  };
}

/* MAIN SYNC SYSTEM */

async function syncAll(env){
  const sources=await env.DB.prepare(
    "SELECT * FROM sources WHERE active=1"
  ).all();

  let rssInserted=0;
  let rssSkipped=0;
  const errors=[];

  // 1. RSS feeds sync concurrently: a slow publisher does not block other sources.
  await Promise.all((sources.results||[]).map(async source=>{
    try{
      const entries=await fetchFeed(source,env);
      for(const item of entries){
        const guid=(source.feed_url+"|"+item.guid).slice(0,900);
        const duplicate=await env.DB.prepare("SELECT id FROM posts WHERE lower(title)=lower(?) LIMIT 1").bind(item.title).first();
        if(duplicate){rssSkipped++;continue;}
        const result=await env.DB.prepare(`
          INSERT OR IGNORE INTO posts
          (guid,title,summary,category,source_name,source_url,published_at,status,ai_extraction_status)
          VALUES(?,?,?,?,?,?,?,'published','pending')
        `).bind(guid,item.title,item.summary,(detectCategory(item.title,item.summary)==="latest-jobs" && CATEGORY_SET.has(source.category) ? source.category : detectCategory(item.title,item.summary)),source.name,item.link,item.publishedAt).run();
        if(result.meta?.changes)rssInserted++;else rssSkipped++;
      }
      await env.DB.prepare("UPDATE sources SET last_checked_at=CURRENT_TIMESTAMP WHERE id=?").bind(source.id).run();
      await env.DB.prepare("INSERT INTO source_health(source_name,status,last_checked_at,last_success_at,last_error) VALUES(?,'ok',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,NULL) ON CONFLICT(source_name) DO UPDATE SET status='ok',last_checked_at=CURRENT_TIMESTAMP,last_success_at=CURRENT_TIMESTAMP,last_error=NULL").bind(source.name).run();
    }catch(e){
      const message=clean(e.message,180);
      errors.push(`${source.name}: ${message}`);
      await env.DB.prepare("INSERT INTO source_health(source_name,status,last_checked_at,last_success_at,last_error) VALUES(?,'error',CURRENT_TIMESTAMP,NULL,?) ON CONFLICT(source_name) DO UPDATE SET status='error',last_checked_at=CURRENT_TIMESTAMP,last_error=excluded.last_error").bind(source.name,message).run();
    }
  }));

  // 2. Official website monitoring
  let officialResult={
    checked:0,
    inserted:0,
    skipped:0,
    errors:[]
  };

  try{
    officialResult=await syncOfficialMonitors(env.DB);
    errors.push(...officialResult.errors);
  }catch(e){
    errors.push("Official monitoring: "+clean(e.message,180));
  }

  const pendingCount = await env.DB.prepare("SELECT COUNT(*) AS total FROM review_items WHERE status='pending'").first();

  return {
    sources_checked:(sources.results?.length||0)+officialResult.checked,
    review_pending:pendingCount?.total||0,

    rss:{
      inserted:rssInserted,
      skipped:rssSkipped
    },

    official:{
      checked:officialResult.checked,
      inserted:officialResult.inserted,
      skipped:officialResult.skipped
    },

    inserted:rssInserted+officialResult.inserted,
    skipped:rssSkipped+officialResult.skipped,
    errors
  };
}



/* AI NOTICE EXTRACTION ----------------------------------------------------- */
const AI_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const MISSING = "Not mentioned in official notification";

function htmlToText(html) {
  return decode(String(html || "")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(br|\/p|\/div|\/tr|\/li|\/h[1-6])\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " "))
    .replace(/[\t ]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

function parseAIJson(value) {
  let text = String(value || "").trim();
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI did not return valid JSON.");
  return JSON.parse(text.slice(start, end + 1));
}

async function extractNoticeWithAI(env, post, suppliedText, suppliedSourceUrl) {
  if (!env.AI || typeof env.AI.run !== "function") throw new Error("Cloudflare Workers AI binding is not configured yet.");
  const sourceUrl = String(suppliedSourceUrl || post.source_url || "");
  if (!safeHttpUrl(sourceUrl) || !isOfficialHost(new URL(sourceUrl).hostname)) {
    throw new Error("Only approved official notice URLs are accepted.");
  }
  const text = clean(suppliedText, 50000);
  if (text.length < 300) throw new Error("Extracted notice text is too short. Please upload a readable PDF.");
  const notice = { text, finalUrl: sourceUrl, isPdf: true };

  const prompt = `You extract factual recruitment information from official Indian government notifications. Use ONLY the supplied source text. Do not infer or invent facts. Return ONLY valid JSON. For every unavailable field use exactly: "${MISSING}". Keep all values in English. If the notice is not a recruitment notice, set notice_type accordingly and explain briefly in overview. Schema: {"notice_type":"Recruitment|Result|Admit Card|Other","overview":"...","department":"...","post_names":["..."],"total_vacancies":"...","eligibility":"...","educational_qualification":"...","age_limit":"...","age_relaxation":"...","salary":"...","application_fee":"...","important_dates":{"notification_date":"...","start_date":"...","last_date":"...","exam_date":"..."},"selection_process":["..."],"how_to_apply":["..."],"documents_required":["..."],"official_links":[{"label":"...","url":"..."}],"source_evidence":"Briefly identify the relevant wording or section in the source."}.

Notice title: ${clean(post.title, 220)}
Department/source: ${clean(post.source_name, 120)}
Official URL: ${notice.finalUrl}

SOURCE TEXT (may be truncated):
${notice.text.slice(0, 24000)}`;
  const result = await env.AI.run(AI_MODEL, {
    messages: [
      { role: "system", content: "You are a strict document extraction engine. Never fabricate. Return JSON only." },
      { role: "user", content: prompt }
    ],
    max_tokens: 2200,
    temperature: 0.1
  });
  const raw = result?.response || result?.result?.response || result?.output_text || "";
  const details = parseAIJson(raw);
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    throw new Error("AI returned an unexpected JSON structure.");
  }

  const arrayFields = new Set([
    "post_names", "selection_process", "how_to_apply",
    "documents_required", "official_links"
  ]);
  const allowed = [
    "notice_type", "overview", "department", "post_names",
    "total_vacancies", "eligibility", "educational_qualification",
    "age_limit", "age_relaxation", "salary", "application_fee",
    "important_dates", "selection_process", "how_to_apply",
    "documents_required", "official_links", "source_evidence"
  ];

  for (const key of allowed) {
    if (!(key in details) || details[key] === undefined) {
      if (arrayFields.has(key)) details[key] = [];
      else if (key === "important_dates") {
        details[key] = {
          notification_date: MISSING,
          start_date: MISSING,
          last_date: MISSING,
          exam_date: MISSING
        };
      } else details[key] = MISSING;
    }
  }

  if (!details.important_dates || typeof details.important_dates !== "object" || Array.isArray(details.important_dates)) {
    details.important_dates = {};
  }
  for (const dateKey of ["notification_date", "start_date", "last_date", "exam_date"]) {
    if (!(dateKey in details.important_dates) || details.important_dates[dateKey] == null) {
      details.important_dates[dateKey] = MISSING;
    }
  }

  details.extraction_note = "AI-extracted from the linked official notice. Verify the original notification before applying.";
  return { details, sourceUrl: notice.finalUrl, isPdf: notice.isPdf };
}


/* WORKER API */

export default {
  async fetch(request,env,ctx){
    const origin=request.headers.get("Origin")||"";
    const allowed=env.ALLOWED_ORIGIN||"https://jobs.go7.in";
    const corsOrigin=origin===allowed?allowed:allowed;

    if(request.method==="OPTIONS"){
      return new Response(null,{
        status:204,
        headers:{
          "access-control-allow-origin":corsOrigin,
          "access-control-allow-methods":"GET,POST,OPTIONS",
          "access-control-allow-headers":"Content-Type,Authorization",
          "access-control-max-age":"86400"
        }
      });
    }

    const url=new URL(request.url);
    const path=url.pathname;

    try{
      if(path==="/"){
        return json({ok:true,service:"GO7 Government API",health:"/api/health",categories:"/api/categories"},200,corsOrigin);
      }

      if(path==="/api/health"){
        return json({
          ok:true,
          service:"GO7 Government API"
        },200,corsOrigin);
      }

      if(path==="/api/categories"){
        return json({
          categories:CATEGORIES.map(([id,label])=>({id,label}))
        },200,corsOrigin);
      }

      const detailMatch=path.match(/^\/api\/posts\/(\d+)$/);

      if(detailMatch&&request.method==="GET"){
        const post=await env.DB.prepare(
          "SELECT id,title,summary,category,source_name,source_url,published_at,created_at,ai_details_json,ai_extraction_status,ai_extracted_at,ai_extraction_error FROM posts WHERE id=? AND status='published'"
        ).bind(Number(detailMatch[1])).first();

        if(!post){
          return json({error:"Post not found"},404,corsOrigin);
        }

        const labelMap=Object.fromEntries(CATEGORIES);

        let aiDetails = null;
        try { aiDetails = post.ai_details_json ? JSON.parse(post.ai_details_json) : null; } catch {}
        delete post.ai_details_json;
        return json({
          post:{
            ...post,
            ai_details: aiDetails,
            category_label:labelMap[post.category]||post.category
          }
        },200,corsOrigin);
      }

      if(path==="/api/posts"&&request.method==="GET"){
        const limit=Math.max(1,Math.min(50,Number(url.searchParams.get("limit"))||20));
        const offset=Math.max(0,Number(url.searchParams.get("offset"))||0);
        const category=url.searchParams.get("category")||"";
        const q=(url.searchParams.get("q")||"").trim().slice(0,100);

        let where="status='published'",params=[];

        if(category&&CATEGORY_SET.has(category)){
          where+=" AND category=?";
          params.push(category);
        }

        if(q){
          where+=" AND (title LIKE ? OR summary LIKE ? OR source_name LIKE ?)";
          params.push(`%${q}%`,`%${q}%`,`%${q}%`);
        }

        const count=await env.DB.prepare(
          `SELECT COUNT(*) AS total FROM posts WHERE ${where}`
        ).bind(...params).first();

        const rows=await env.DB.prepare(`
          SELECT id,title,summary,category,source_name,source_url,published_at,created_at
          FROM posts WHERE ${where}
          ORDER BY COALESCE(published_at,created_at) DESC
          LIMIT ? OFFSET ?
        `).bind(...params,limit,offset).all();

        const labelMap=Object.fromEntries(CATEGORIES);

        return json({
          posts:(rows.results||[]).map(p=>({
            ...p,
            category_label:labelMap[p.category]||p.category
          })),
          total:count?.total||0,
          has_more:offset+limit<(count?.total||0)
        },200,corsOrigin);
      }

      if(path.startsWith("/api/admin/")){
        if(!auth(request,env)){
          return json({
            error:"Unauthorized. Check your admin token."
          },401,corsOrigin);
        }

        if (path === "/api/admin/ai/pending" && request.method === "GET") {
          const rows = await env.DB.prepare("SELECT id,title,source_name,source_url,ai_extraction_status,ai_extraction_error FROM posts WHERE status='published' AND category='latest-jobs' ORDER BY created_at DESC LIMIT 50").all();
          return json({ items: rows.results || [] }, 200, corsOrigin);
        }

        const extractTextMatch = path.match(/^\/api\/admin\/posts\/(\d+)\/extract-text$/);
        if (extractTextMatch && request.method === "POST") {
          const post = await env.DB.prepare("SELECT id,title,source_name,source_url,category FROM posts WHERE id=? AND status='published'").bind(Number(extractTextMatch[1])).first();
          if (!post) return json({ error: "Published post not found." }, 404, corsOrigin);
          if (post.category !== "latest-jobs") return json({ error: "AI notice extraction is only enabled for Latest Jobs." }, 400, corsOrigin);
          const body = await request.json();
          const text = String(body.text || "");
          const sourceUrl = String(body.source_url || post.source_url || "");
          if (text.length > 50000) return json({ error: "Extracted text exceeds the 50,000 character limit." }, 413, corsOrigin);
          if (text.trim().length < 300) return json({ error: "PDF text is too short. Please use a readable official PDF." }, 400, corsOrigin);
          if (sourceUrl !== post.source_url) return json({ error: "Source URL does not match the published post." }, 400, corsOrigin);
          await env.DB.prepare("UPDATE posts SET ai_extraction_status='processing', ai_extraction_error=NULL WHERE id=?").bind(post.id).run();
          try {
            const extracted = await extractNoticeWithAI(env, post, text, sourceUrl);
            await env.DB.prepare("UPDATE posts SET ai_details_json=?, ai_extraction_status='completed', ai_extracted_at=CURRENT_TIMESTAMP, ai_extraction_error=NULL WHERE id=?").bind(JSON.stringify(extracted.details), post.id).run();
            return json({ id: post.id, status: "completed", message: "AI extraction completed and saved." }, 200, corsOrigin);
          } catch (error) {
            await env.DB.prepare("UPDATE posts SET ai_extraction_status='failed', ai_extraction_error=? WHERE id=?").bind(clean(error.message, 500), post.id).run();
            return json({ id: post.id, status: "failed", error: clean(error.message, 300) }, 422, corsOrigin);
          }
        }

        if(path==="/api/admin/ai/extract-pending"&&request.method==="POST"){
          return json({ processed: 0, message: "PDF extraction now runs from the Admin Panel after a PDF is selected. Automatic PDF processing is disabled to prevent Worker CPU-limit errors." }, 200, corsOrigin);
        }

        if(path==="/api/admin/health"&&request.method==="GET"){
          const runs=await env.DB.prepare("SELECT source_name,status,last_checked_at,last_success_at,last_error FROM source_health ORDER BY last_checked_at DESC LIMIT 40").all();
          return json({sources:runs.results||[]},200,corsOrigin);
        }

        if(path==="/api/admin/sources"&&request.method==="GET"){
          const rows=await env.DB.prepare(
            "SELECT id,name,feed_url,category,active,last_checked_at FROM sources ORDER BY id DESC"
          ).all();

          return json({
            sources:rows.results||[]
          },200,corsOrigin);
        }

        if(path==="/api/admin/sources"&&request.method==="POST"){
          const body=await request.json();
          const name=clean(body.name,100);
          const category=String(body.category||"");

          if(!name||!CATEGORY_SET.has(category)){
            return json({
              error:"Enter a source name and valid category."
            },400,corsOrigin);
          }

          const feed=await validateFeedUrl(body.feed_url);

          await env.DB.prepare(
            "INSERT INTO sources(name,feed_url,category,active) VALUES(?,?,?,1)"
          ).bind(name,feed,category).run();

          return json({
            ok:true,
            message:"Feed source added and enabled for automatic publishing."
          },201,corsOrigin);
        }

        if(path==="/api/admin/posts"&&request.method==="POST"){
          const body=await request.json();
          const title=clean(body.title,220), summary=clean(body.summary,1200), source_name=clean(body.source_name||"GO7 Admin",100);
          const source_url=String(body.source_url||"").trim(), category=String(body.category||"");
          if(!title || !CATEGORY_SET.has(category) || !safeHttpUrl(source_url)) return json({error:"Valid title, category and official HTTP(S) source URL are required."},400,corsOrigin);
          const host=new URL(source_url).hostname;
          if(!isOfficialHost(host)) return json({error:"Manual posts must link to an official .gov.in, .nic.in, .ac.in or .edu.in source."},400,corsOrigin);
          const guid="manual|"+crypto.randomUUID();
          const result=await env.DB.prepare("INSERT INTO posts (guid,title,summary,category,source_name,source_url,published_at,status,ai_extraction_status) VALUES(?,?,?,?,?,?,CURRENT_TIMESTAMP,'published','pending')").bind(guid,title,summary,category,source_name,source_url).run();
          return json({ok:true,id:result.meta?.last_row_id,message:"Post published."},201,corsOrigin);
        }

        if(path==="/api/admin/review"&&request.method==="GET"){
          const rows=await env.DB.prepare(
            "SELECT id,title,category,source_name,source_url,detected_at FROM review_items WHERE status='pending' ORDER BY detected_at DESC LIMIT 100"
          ).all();
          return json({items:rows.results||[]},200,corsOrigin);
        }

        const reviewMatch=path.match(/^\/api\/admin\/review\/(\d+)\/(approve|dismiss)$/);
        if(reviewMatch&&request.method==="POST"){
          const id=Number(reviewMatch[1]);
          const action=reviewMatch[2];
          const item=await env.DB.prepare(
            "SELECT * FROM review_items WHERE id=? AND status='pending'"
          ).bind(id).first();
          if(!item) return json({error:"Review item not found or already processed."},404,corsOrigin);
          if(action==="approve"){
            let host="";
            try{host=new URL(item.source_url).hostname;}catch{}
            if(!isOfficialHost(host)||!isUsefulNoticeTitle(item.title)) return json({error:"Notice title or source link failed the official-source checks."},400,corsOrigin);
            const duplicate=await env.DB.prepare("SELECT id FROM posts WHERE lower(title)=lower(?) LIMIT 1").bind(item.title).first();
            if(!duplicate){
              await env.DB.prepare(`INSERT OR IGNORE INTO posts (guid,title,summary,category,source_name,source_url,published_at,status,ai_extraction_status) VALUES(?,?,?, ?,?,?,NULL,'published','pending')`)
                .bind(item.fingerprint,item.title,item.summary||"",detectCategory(item.title,item.summary||""),item.source_name,item.source_url).run();
            }
            await env.DB.prepare("UPDATE review_items SET status='approved' WHERE id=?").bind(id).run();
            return json({ok:true,message:duplicate?"Duplicate notice skipped; review item closed.":"Official notice approved and published."},200,corsOrigin);
          }
          await env.DB.prepare("UPDATE review_items SET status='dismissed' WHERE id=?").bind(id).run();
          return json({ok:true,message:"Notice dismissed."},200,corsOrigin);
        }

        if(path==="/api/admin/sync"&&request.method==="POST"){
          return json(await syncAll(env),200,corsOrigin);
        }

        if(path==="/api/admin/reclassify"&&request.method==="POST"){
          const rows=await env.DB.prepare(
            "SELECT id,title,summary,category,source_url FROM posts"
          ).all();

          let changed=0;

          for(const post of rows.results||[]){
            const category=detectCategory(post.title,post.summary);
            // Reclassification must never hide or delete an already published post.
            if(category!==post.category){
              await env.DB.prepare(
                "UPDATE posts SET category=? WHERE id=?"
              ).bind(category,post.id).run();

              changed++;
            }
          }

          return json({
            ok:true,
            scanned:rows.results?.length||0,
            updated:changed,
            message:`Checked ${rows.results?.length||0} posts; updated ${changed} categories.`
          },200,corsOrigin);
        }
      }

      return json({error:"Not found"},404,corsOrigin);

    }catch(e){
      return json({
        error:e.message||"Server error"
      },500,corsOrigin);
    }
  },

  async scheduled(controller,env,ctx){
    ctx.waitUntil((async()=>{
      await syncAll(env);
      // AI PDF extraction is intentionally manual from the Admin Panel.
    })().catch(error => console.error("GO7 scheduled sync / AI extraction failed:", error)));
  }
};