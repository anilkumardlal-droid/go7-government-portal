const CATEGORIES = [
  ["latest-jobs","Latest Jobs"],["results","Results"],["admit-cards","Admit Cards"],
  ["answer-keys","Answer Keys"],["admissions","Admissions"],["syllabus","Syllabus"],
  ["exam-calendar","Exam Calendar"],["scholarships","Scholarships"],
  ["state-jobs","State Jobs"],["other","Other Updates"]
];
const CATEGORY_SET = new Set(CATEGORIES.map(x=>x[0]));
const json = (data,status=200,origin="*") => new Response(JSON.stringify(data),{
  status,headers:{"content-type":"application/json; charset=utf-8","access-control-allow-origin":origin,
  "access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"Content-Type,Authorization"}
});
const clean = (s,max=500) => String(s||"").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim().slice(0,max);
const decode = s => String(s||"").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)));
function tagValue(block,names){
  for(const name of names){
    const re=new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,"i");
    const m=block.match(re); if(m) return decode(m[1].replace(/<!\[CDATA\[|\]\]>/g,""));
  }
  return "";
}
function attrValue(block,tag,attr){
  const re=new RegExp(`<${tag}\\b([^>]*)>`,"i"), m=block.match(re); if(!m)return "";
  const a=m[1].match(new RegExp(`${attr}=["']([^"']+)["']`,"i")); return a?decode(a[1]):"";
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
    if(title && safeHttpUrl(link)) entries.push({title,link,guid,summary,publishedAt:validDate(date)});
  }
  return entries;
}
function validDate(s){if(!s)return null;const d=new Date(s);return Number.isNaN(d.getTime())?null:d.toISOString();}
function safeHttpUrl(value){
  try{const u=new URL(value);return ["http:","https:"].includes(u.protocol)&&!u.username&&!u.password;}
  catch{return false;}
}
async function validateFeedUrl(value){
  if(!safeHttpUrl(value))throw new Error("Feed URL must be a valid HTTP(S) URL.");
  const u=new URL(value);
  const host=u.hostname.toLowerCase();
  if(host==="localhost"||host==="127.0.0.1"||host==="::1"||host.endsWith(".local")||
     /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host))
    throw new Error("Private/local feed hosts are not allowed.");
  return u.toString();
}
function auth(req,env){return Boolean(env.ADMIN_TOKEN)&&req.headers.get("authorization")==="Bearer "+env.ADMIN_TOKEN;}
async function fetchFeed(source,env){
  const res=await fetch(source.feed_url,{headers:{"User-Agent":"GO7-GovUpdates/1.0 (+https://jobs.go7.in)","Accept":"application/rss+xml, application/atom+xml, application/xml, text/xml"},redirect:"follow",signal:AbortSignal.timeout(12000)});
  if(!res.ok)throw new Error(`HTTP ${res.status}`);
  const type=res.headers.get("content-type")||"";
  const text=await res.text();
  if(text.length>1_500_000)throw new Error("Feed exceeds 1.5 MB limit");
  if(!/xml|rss|atom|text\/plain/i.test(type)&&!/<(rss|feed|rdf:RDF)\b/i.test(text.slice(0,1000)))throw new Error("Response does not look like RSS/Atom XML");
  return parseFeed(text,source).slice(0,Math.max(1,Math.min(50,Number(env.MAX_ITEMS_PER_FEED)||25)));
}
async function syncAll(env){
  const sources=await env.DB.prepare("SELECT * FROM sources WHERE active=1").all();
  let inserted=0,skipped=0;const errors=[];
  for(const source of sources.results||[]){
    try{
      const entries=await fetchFeed(source,env);
      for(const item of entries){
        const guid=(source.feed_url+"|"+item.guid).slice(0,900);
        const result=await env.DB.prepare(`INSERT OR IGNORE INTO posts
          (guid,title,summary,category,source_name,source_url,published_at,status)
          VALUES(?,?,?,?,?,?,?,'published')`)
          .bind(guid,item.title,item.summary,source.category,source.name,item.link,item.publishedAt).run();
        if(result.meta?.changes)inserted++;else skipped++;
      }
      await env.DB.prepare("UPDATE sources SET last_checked_at=CURRENT_TIMESTAMP WHERE id=?").bind(source.id).run();
    }catch(e){errors.push(`${source.name}: ${e.message}`);}
  }
  return {sources_checked:sources.results?.length||0,inserted,skipped,errors};
}
export default {
  async fetch(request,env,ctx){
    const origin=request.headers.get("Origin")||"";
    const allowed=env.ALLOWED_ORIGIN||"https://jobs.go7.in";
    const corsOrigin=origin===allowed?allowed:allowed;
    if(request.method==="OPTIONS")return new Response(null,{status:204,headers:{
      "access-control-allow-origin":corsOrigin,"access-control-allow-methods":"GET,POST,OPTIONS",
      "access-control-allow-headers":"Content-Type,Authorization","access-control-max-age":"86400"}});
    const url=new URL(request.url),path=url.pathname;
    try{
      if(path==="/api/health")return json({ok:true,service:"GO7 Government API"},200,corsOrigin);
      if(path==="/api/categories")return json({categories:CATEGORIES.map(([id,label])=>({id,label}))},200,corsOrigin);
      if(path==="/api/posts"&&request.method==="GET"){
        const limit=Math.max(1,Math.min(50,Number(url.searchParams.get("limit"))||20));
        const offset=Math.max(0,Number(url.searchParams.get("offset"))||0);
        const category=url.searchParams.get("category")||"";
        const q=(url.searchParams.get("q")||"").trim().slice(0,100);
        let where="status='published'",params=[];
        if(category&&CATEGORY_SET.has(category)){where+=" AND category=?";params.push(category);}
        if(q){where+=" AND (title LIKE ? OR summary LIKE ? OR source_name LIKE ?)";params.push(`%${q}%`,`%${q}%`,`%${q}%`);}
        const count=await env.DB.prepare(`SELECT COUNT(*) AS total FROM posts WHERE ${where}`).bind(...params).first();
        const rows=await env.DB.prepare(`SELECT id,title,summary,category,source_name,source_url,published_at,created_at
          FROM posts WHERE ${where} ORDER BY COALESCE(published_at,created_at) DESC LIMIT ? OFFSET ?`)
          .bind(...params,limit,offset).all();
        const labelMap=Object.fromEntries(CATEGORIES);
        return json({posts:(rows.results||[]).map(p=>({...p,category_label:labelMap[p.category]||p.category})),
          total:count?.total||0,has_more:offset+limit<(count?.total||0)},200,corsOrigin);
      }
      if(path.startsWith("/api/admin/")){
        if(!auth(request,env))return json({error:"Unauthorized. Check your admin token."},401,corsOrigin);
        if(path==="/api/admin/sources"&&request.method==="GET"){
          const rows=await env.DB.prepare("SELECT id,name,feed_url,category,active,last_checked_at FROM sources ORDER BY id DESC").all();
          return json({sources:rows.results||[]},200,corsOrigin);
        }
        if(path==="/api/admin/sources"&&request.method==="POST"){
          const body=await request.json();
          const name=clean(body.name,100),category=String(body.category||"");
          if(!name||!CATEGORY_SET.has(category))return json({error:"Enter a source name and valid category."},400,corsOrigin);
          const feed=await validateFeedUrl(body.feed_url);
          await env.DB.prepare("INSERT INTO sources(name,feed_url,category,active) VALUES(?,?,?,1)")
            .bind(name,feed,category).run();
          return json({ok:true,message:"Feed source added and enabled for automatic publishing."},201,corsOrigin);
        }
        if(path==="/api/admin/sync"&&request.method==="POST"){
          return json(await syncAll(env),200,corsOrigin);
        }
      }
      return json({error:"Not found"},404,corsOrigin);
    }catch(e){
      return json({error:e.message||"Server error"},500,corsOrigin);
    }
  },
  async scheduled(controller,env,ctx){
    ctx.waitUntil(syncAll(env));
  }
};
