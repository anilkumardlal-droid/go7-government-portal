
const CATEGORIES = [
  ["jobs-vacancies","Jobs & Vacancies"],
  ["results","Results"],
  ["admit-cards-exams","Admit Cards & Exams"],
  ["answer-keys","Answer Keys"],
  ["admissions-education","Admissions & Education"],
  ["important-notices","Important Notices"]
];

const CATEGORY_SET = new Set(CATEGORIES.map(x=>x[0]));

function detectCategory(title = "", summary = "") {
  const text = (String(title) + " " + String(summary)).toLowerCase().replace(/[\u2010-\u2015]/g,"-").replace(/\s+/g," ").trim();
  const rules = [
    ["answer-keys", /\b(answer[\s-]*keys?|response\s*sheets?|objection\s*management|answer\s*key\s*challenge)\b/],
    ["admit-cards-exams", /\b(admit[\s-]*cards?|hall\s*tickets?|call\s*letters?|e[-\s]*admit|exam\s+intimation|exam\s+city|city\s+intimation|exam\s+date|exam\s+schedule|examination\s+schedule|skill\s+test\s+schedule)\b/],
    ["results", /\b(results?|merit\s*lists?|score\s*cards?|cut[- ]?offs?|qualified candidates|selection\s*(?:lists?|panels?)|selected candidates|short[- ]?listed candidates|shortlisted candidates|provisional selection|final selection|result\s+of)\b/],
    ["admissions-education", /\b(admissions?|entrance applications?|enrolments?|enrollments?|counselling|counseling|seat allotment|university applications?|admission notice|syllabus|exam patterns?|information bulletin|academic session)\b/],
    ["important-notices", /\b(document verification|certificate verification|document upload|important documents|correction window|photo|signature|verification schedule|status of (?:lateral )?recruitment cases|recruitment tests|recruitment requisition|recruitment cases kept on hold|administrative notice|corrigendum|extension notice|office order|cancell?ation|reschedul(?:e|ed|ing)|postponement|postponed|deferred)\b/],
    ["jobs-vacancies", /\b(10th pass|class 10|matric|iti|industrial training institute|trade apprentice|outsourc(?:e|ed|ing)|manpower|agency based|service provider)\b/]
  ];
  for (const [category, pattern] of rules) if (pattern.test(text)) return category;
  const jobTerms = /\b(recruitment|recruit|vacanc(?:y|ies)|advertisement|employment notice|employment notification|job notification|apply online|applications?|cen[-\s]?\d|ntpc|group[-\s]?d|assistant loco|technician|junior engineer|selection post|combined graduate|combined higher secondary|stenographer|constable|sub[-\s]?inspector|apprentice|appointment|hiring|posts?|jobs?|filling up|walk[- ]?in|engagement|career|deputation basis|contract basis|inviting applications|young professional|consultant)\b/i;
  if (jobTerms.test(text)) return "jobs-vacancies";
  return null;
}

function isOfficialHost(hostname) {
  const host = String(hostname || "").toLowerCase().replace(/\.$/, "");
  return host.endsWith(".gov.in") || host.endsWith(".nic.in") || host.endsWith(".ac.in") || host.endsWith(".edu.in");
}

function isUsefulNoticeTitle(title) {
  const value = clean(title, 220).toLowerCase().replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim();
  if (value.length < 16) return false;
  return !/^(download )?(admit card|hall ticket|notice|notification|recruitment|advertisement|click here|read more|latest update|important notice|web advertisement|new advertisement policy|advertisement policy)$/.test(value)
    && !/^(web advertisement|new advertisement policy|advertisement policy)\b/.test(value);
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

function cleanFeedContent(value,max=12000){
  return decode(String(value||"")
    .replace(/<!\[CDATA\[|\]\]>/g,"")
    .replace(/<!--[\s\S]*?-->/g," ")
    .replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi," ")
    .replace(/<(br|\/p|\/div|\/li|\/tr|\/h[1-6])\b[^>]*>/gi,"\n")
    .replace(/<[^>]+>/g," ")
    .replace(/&nbsp;/gi," "))
    .replace(/\r/g,"")
    .replace(/[\t ]+/g," ")
    .replace(/\n[\t ]+/g,"\n")
    .replace(/\n{3,}/g,"\n\n")
    .trim()
    .slice(0,max);
}

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
    const summary=cleanFeedContent(tagValue(b,["content:encoded","content","description","summary"]),12000);
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

// Parses dates only when they are explicitly supplied by an official listing or admin.
function parseOfficialDate(value){
  const raw=clean(value,100);
  if(!raw)return null;
  let year,month,day;
  let match=raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if(match){
    year=Number(match[1]);month=Number(match[2]);day=Number(match[3]);
  }else{
    match=raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
    if(match){
      day=Number(match[1]);month=Number(match[2]);year=Number(match[3]);
    }else{
      const parsed=new Date(raw);
      if(Number.isNaN(parsed.getTime()))return null;
      year=parsed.getUTCFullYear();month=parsed.getUTCMonth()+1;day=parsed.getUTCDate();
    }
  }
  const parsed=new Date(Date.UTC(year,month-1,day));
  if(parsed.getUTCFullYear()!==year||parsed.getUTCMonth()+1!==month||parsed.getUTCDate()!==day)return null;
  return `${String(year).padStart(4,"0")}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
}

function parseApplicationDeadline(value){
  const text=String(value||"");
  const match=text.match(/(?:last\s+date(?:\s+to\s+apply)?|closing\s+date|application\s+deadline|apply\s+before)\s*[:\-–]?\s*(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{4}|\d{4}-\d{2}-\d{2})/i);
  return match?parseOfficialDate(match[1]):null;
}

const OFFICIAL_DATE_TOKEN = String.raw`(?:\d{1,2}[./-]\d{1,2}[./-]\d{4}|\d{4}-\d{1,2}-\d{1,2}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}|\d{1,2}\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{4})`;

function extractNoticeDatesFromText(value){
  const text=String(value||"").replace(/\r/g,"");
  const rows=text.split(/\n+/).map(x=>x.replace(/\s+/g," ").trim()).filter(Boolean);
  const publication=[];
  const deadlines=[];
  const dateRe=new RegExp(OFFICIAL_DATE_TOKEN,"gi");
  const pubLabel=/\b(advertisement\s+date|notification\s+date|date\s+of\s+(?:notification|issue|publication)|publication\s+date|published\s+on|issued\s+on|notice\s+date)\b/i;
  const appLabel=/\b(last\s+date|closing\s+date|application\s+deadline|deadline\s+for\s+application|submission\s+of\s+(?:online\s+)?applications?|applications?\s+online|apply\s+(?:by|before))\b/i;
  const reviseLabel=/\b(revis(?:ed|ion)|extend(?:ed|sion)|postpon(?:ed|ement)|reschedul(?:ed|ing)|up\s+to)\b/i;
  const excludeApp=/\b(remittance|fee|payment|objection|challenge|counselling\s+fee)\b/i;

  function collect(line,index,source){
    const matches=[...line.matchAll(new RegExp(OFFICIAL_DATE_TOKEN,"gi"))];
    for(const m of matches){
      const parsed=parseOfficialDate(m[0]);
      if(!parsed)continue;
      const before=line.slice(Math.max(0,m.index-180),m.index);
      const after=line.slice(m.index+m[0].length,Math.min(line.length,m.index+m[0].length+90));
      const around=(before+" "+m[0]+" "+after).replace(/\s+/g," ").trim();
      if(appLabel.test(around)&&!excludeApp.test(around)){
        deadlines.push({
          date:parsed,
          score:(reviseLabel.test(around)?100:20)+(source==="line"?5:0),
          index,
          evidence:clean(line,320)
        });
      }
      if(pubLabel.test(around)&&!appLabel.test(around)){
        publication.push({
          date:parsed,
          score:(source==="line"?10:0),
          index,
          evidence:clean(line,320)
        });
      }
    }
  }

  rows.forEach((line,index)=>collect(line,index,"line"));
  // Join only adjacent lines so wrapped labels are recognized without mixing dates from the whole document.
  for(let index=0;index<rows.length-1;index++){
    collect(rows[index]+" "+rows[index+1],index,"context");
  }

  deadlines.sort((a,b)=>b.score-a.score||b.index-a.index);
  publication.sort((a,b)=>b.score-a.score||a.index-b.index);
  const published=publication[0]||null;
  const deadline=deadlines[0]||null;
  const evidence=[
    published?"Publication date: "+published.evidence:"",
    deadline?"Application last date: "+deadline.evidence:""
  ].filter(Boolean).join(" | ");
  return {
    publishedAt:published?.date||null,
    applicationLastDate:deadline?.date||null,
    evidence:evidence||"No clearly labelled publication date or application deadline was confirmed in the official page/PDF. Admin verification required."
  };
}

function officialPdfLinks(html,pageUrl){
  const links=[];
  const seen=new Set();
  const anchors=String(html||"").match(/<a\b[^>]*>[\s\S]*?<\/a>/gi)||[];
  for(const anchor of anchors){
    const href=anchor.match(/\bhref\s*=\s*(["'])(.*?)\1/i)?.[2];
    if(!href)continue;
    const label=clean(decode(anchor.replace(/<[^>]*>/g," ")),180);
    if(!/\b(recruitment|advertisement|notification|official notice|result|answer key|response sheet|admit card|hall ticket|corrigendum|extension)\b/i.test(label))continue;
    if(/\b(annexure|appendix|syllabus|brochure|instruction booklet)\b/i.test(label))continue;
    try{
      const target=new URL(decode(href),pageUrl);
      if(!safeHttpUrl(target.href)||!isOfficialHost(target.hostname))continue;
      if(!/\.pdf(?:$|[?#])/i.test(target.href)&&!/\.pdf\b/i.test(href))continue;
      if(seen.has(target.href))continue;
      seen.add(target.href);
      links.push({url:target.href,label});
    }catch{}
    if(links.length>=2)break;
  }
  return links;
}

async function convertOfficialDocument(env,url){
  if(!env.AI||typeof env.AI.toMarkdown!=="function")throw new Error("Cloudflare AI Markdown Conversion is not available on the AI binding.");
  const response=await fetchWithRetry(url,{
    method:"GET",
    redirect:"follow",
    headers:{
      "Accept":"text/html,application/xhtml+xml,application/pdf,*/*;q=0.8",
      "Accept-Language":"en-IN,en;q=0.9"
    }
  },2,10000);
  if(!response.ok)throw new Error("Official notice returned HTTP "+response.status);
  const finalUrl=response.url||url;
  if(!safeHttpUrl(finalUrl)||!isOfficialHost(new URL(finalUrl).hostname))throw new Error("Official notice redirected outside an approved government domain.");
  const contentLength=Number(response.headers.get("content-length")||0);
  if(contentLength>12000000)throw new Error("Official document exceeds the 12 MB extraction limit.");
  const type=(response.headers.get("content-type")||"").toLowerCase();
  const pdf=/application\/pdf/i.test(type)||/\.pdf(?:$|[?#])/i.test(finalUrl);
  let blob,name;
  if(pdf){
    const bytes=await response.arrayBuffer();
    if(bytes.byteLength>12000000)throw new Error("Official PDF exceeds the 12 MB extraction limit.");
    blob=new Blob([bytes],{type:"application/pdf"});
    name="official-notice.pdf";
  }else{
    const html=await response.text();
    if(html.length>2000000)throw new Error("Official webpage exceeds the 2 MB extraction limit.");
    blob=new Blob([html],{type:"text/html"});
    name="official-notice.html";
    const converted=await env.AI.toMarkdown({name,blob},{conversionOptions:{html:{hostname:finalUrl}}});
    const item=Array.isArray(converted)?converted[0]:converted;
    if(!item||item.format==="error"||!item.data)throw new Error(item?.error||"Could not convert official webpage to readable text.");
    return {text:String(item.data).slice(0,60000),html,finalUrl,isPdf:false};
  }
  const converted=await env.AI.toMarkdown({name,blob});
  const item=Array.isArray(converted)?converted[0]:converted;
  if(!item||item.format==="error"||!item.data)throw new Error(item?.error||"Could not convert official PDF to readable text.");
  return {text:String(item.data).slice(0,60000),html:"",finalUrl,isPdf:true};
}

async function extractOfficialNoticeDates(env,url){
  try{
    const page=await convertOfficialDocument(env,url);
    let extracted=extractNoticeDatesFromText(page.text);
    let evidence=extracted.evidence;
    let publishedAt=extracted.publishedAt;
    let applicationLastDate=extracted.applicationLastDate;

    if(!page.isPdf&&(!publishedAt||!applicationLastDate)){
      const pdfs=officialPdfLinks(page.html,page.finalUrl);
      for(const pdf of pdfs){
        try{
          const document=await convertOfficialDocument(env,pdf.url);
          const dates=extractNoticeDatesFromText(document.text);
          if(!publishedAt&&dates.publishedAt){publishedAt=dates.publishedAt;evidence+=" | PDF "+pdf.label+": "+dates.evidence;}
          if(!applicationLastDate&&dates.applicationLastDate){applicationLastDate=dates.applicationLastDate;evidence+=" | PDF "+pdf.label+": "+dates.evidence;}
          if(publishedAt&&applicationLastDate)break;
        }catch(error){
          evidence=clean(evidence+" | PDF read note: "+error.message,900);
        }
      }
    }
    return {
      publishedAt,
      applicationLastDate,
      evidence:clean(evidence,1200),
      checkedAt:new Date().toISOString()
    };
  }catch(error){
    return {
      publishedAt:null,
      applicationLastDate:null,
      evidence:"Automatic reading could not confirm dates: "+clean(error.message,300)+" Admin verification required.",
      checkedAt:new Date().toISOString()
    };
  }
}

function dateCheckIsDue(value){
  if(!value)return true;
  const parsed=Date.parse(String(value).replace(" ","T").replace(/(Z|[+-]\d\d:\d\d)$/,"")+"Z");
  return !Number.isFinite(parsed)||Date.now()-parsed>12*60*60*1000;
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


// Official government recruitment pages. Native RSS is used only where the department publishes one;
// the remaining pages are monitored directly and their notices enter the Admin Review Queue.
const OFFICIAL_MONITORS = [
  {
    name:"Employment News - Jobs",
    category:"jobs-vacancies",
    parser:"employment-jobs",
    urls:["https://employmentnews.gov.in/NewEmp/AllJobs.aspx?k=All"],
    hosts:["employmentnews.gov.in","www.employmentnews.gov.in"]
  },
  {
    name:"Employment News - Results",
    category:"results",
    urls:["https://employmentnews.gov.in/NewEmp/Results.aspx"],
    hosts:["employmentnews.gov.in","www.employmentnews.gov.in"]
  },
  {
    name:"ISRO Official Careers",
    category:"jobs-vacancies",
    urls:["https://www.isro.gov.in/Careers.html","https://www.isro.gov.in/CurrentOpportunities.html","https://www.isro.gov.in/ViewAllOpportunities.html"],
    hosts:["www.isro.gov.in","isro.gov.in"]
  },
  {
    name:"UPSC Official Recruitment",
    category:"jobs-vacancies",
    urls:["https://www.upsc.gov.in/recruitment/recruitment-advertisement","https://cms.upsc.gov.in/archived-advertisements/"],
    hosts:["www.upsc.gov.in","upsc.gov.in","cms.upsc.gov.in"]
  },
  {
    name:"SSC Official Notice Board",
    category:"jobs-vacancies",
    urls:["https://ssc.gov.in/home/notice-board","https://ssc.gov.in/"],
    hosts:["ssc.gov.in","www.ssc.gov.in"]
  },
  {
    name:"Railway RRB Unified Portal",
    category:"jobs-vacancies",
    urls:["https://rrb.indianrailways.gov.in/"],
    hosts:["rrb.indianrailways.gov.in","www.rrb.indianrailways.gov.in"]
  },
  {
    name:"UPPSC Notifications",
    category:"jobs-vacancies",
    parser:"table",
    urls:["https://uppsc.up.nic.in/CandidatePages/Notifications.aspx"],
    hosts:["uppsc.up.nic.in"]
  },
  {
    name:"UPSSSC Official Notices",
    category:"jobs-vacancies",
    parser:"table",
    urls:["https://upsssc.gov.in/"],
    hosts:["upsssc.gov.in","www.upsssc.gov.in"]
  },
  {
    name:"Uttar Pradesh Police Recruitment Board",
    category:"jobs-vacancies",
    urls:["https://uppbpb.gov.in/Home/Notice","https://uppbpb.gov.in/"],
    hosts:["uppbpb.gov.in","www.uppbpb.gov.in"]
  },
  {
    name:"Bihar BPSC Notices",
    category:"jobs-vacancies",
    urls:["https://bpsc.bihar.gov.in/"],
    hosts:["bpsc.bihar.gov.in","www.bpsc.bihar.gov.in"]
  },
  {
    name:"Bihar BSSC Notice Board",
    category:"jobs-vacancies",
    parser:"table",
    urls:["https://bssc.bihar.gov.in/NoticeBoard.htm"],
    hosts:["bssc.bihar.gov.in"]
  },
  {
    name:"Bihar BPSSC Notices",
    category:"jobs-vacancies",
    parser:"table",
    urls:["https://bpssc.bihar.gov.in/Notices.htm","https://bpssc.bihar.gov.in/"],
    hosts:["bpssc.bihar.gov.in"]
  },
  {
    name:"Bihar CSBC Police Recruitment",
    category:"jobs-vacancies",
    parser:"table",
    urls:["https://csbc.bihar.gov.in/"],
    hosts:["csbc.bihar.gov.in","www.csbc.bihar.gov.in"]
  },
  {
    name:"Jharkhand JPSC Recruitment",
    category:"jobs-vacancies",
    urls:["https://jpsc.gov.in/","https://jpsc.gov.in/circular_notices.php"],
    hosts:["jpsc.gov.in","www.jpsc.gov.in"]
  },
  {
    name:"Jharkhand JSSC Notices",
    category:"jobs-vacancies",
    parser:"table",
    urls:["https://jssc.nic.in/"],
    hosts:["jssc.nic.in","www.jssc.nic.in"]
  },
  {
    name:"West Bengal PSC Notices",
    category:"jobs-vacancies",
    parser:"table",
    urls:["https://psc.wb.gov.in/notification_announcement.jsp","https://psc.wb.gov.in/"],
    hosts:["psc.wb.gov.in","www.psc.wb.gov.in"]
  },
  {
    name:"Chhattisgarh PSC Notifications",
    category:"jobs-vacancies",
    urls:["https://psc.cg.gov.in/Notifications.php","https://psc.cg.gov.in/Advertisement.php"],
    hosts:["psc.cg.gov.in","www.psc.cg.gov.in"]
  },
  {
    name:"Chhattisgarh Vyapam",
    category:"jobs-vacancies",
    parser:"table",
    urls:["https://vyapam.cgstate.gov.in/"],
    hosts:["vyapam.cgstate.gov.in"]
  },
  {
    name:"Odisha OPSC Notices",
    category:"jobs-vacancies",
    parser:"table",
    urls:["https://opsc.gov.in/Public/OPSC/Default.aspx"],
    hosts:["opsc.gov.in","www.opsc.gov.in"]
  },
  {
    name:"Odisha OSSSC Recruitment",
    category:"jobs-vacancies",
    parser:"table",
    urls:["https://osssc.gov.in/Public/OSSSC/Default.aspx"],
    hosts:["osssc.gov.in","www.osssc.gov.in"]
  },
  {
    name:"Odisha OSSC Notices",
    category:"jobs-vacancies",
    parser:"table",
    urls:["https://ossc.gov.in/Public/OSSC/Default.aspx"],
    hosts:["ossc.gov.in","www.ossc.gov.in"]
  }
];

const RECRUITMENT_RE =
  /\b(recruitment|recruit|vacanc(?:y|ies)|advertisement|employment notice|employment notification|job notification|apply online|application(?:s)?|last date|short notice|cen[-\s]?\d|ntpc|group[-\s]?d|assistant loco|technician|junior engineer|selection post|combined graduate|combined higher secondary|stenographer|constable|sub[-\s]?inspector|admit[\s-]*cards?|hall tickets?|answer[\s-]*keys?|response sheets?|results?|merit lists?|selection panels?|selected candidates|shortlisted candidates|apprentice|exam date|exam schedule|skill test|cbt)\b/i;

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
    out.push({title,link:target.href,publishedAt:null,applicationLastDate:null});

    if(out.length>=12)break;
  }

  return out;
}

function extractEmploymentNewsRows(html,pageUrl,monitor){
  const out=[];
  const seen=new Set();
  const rows=String(html||"").match(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)||[];

  for(const row of rows){
    const cells=[...row.matchAll(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi)]
      .map(match=>cleanFeedContent(match[2],800));
    if(cells.length<3)continue;

    const rowText=cells.join(" ");
    if(/issued date|organisation|last date/i.test(cells.slice(0,3).join(" ")))continue;

    const organisation=cells[1]||"";
    const post=cells[2]||"";
    const method=cells[3]||"";
    const lastDate=cells[cells.length-1]||"";
    if(!organisation||!post||!RECRUITMENT_RE.test(rowText))continue;

    const publishedAt=parseOfficialDate(cells[0]);
    const applicationLastDate=parseOfficialDate(lastDate);

    const title=clean(organisation+" - "+post,220);
    if(!isUsefulNoticeTitle(title))continue;

    let link=pageUrl;
    const hrefs=[...row.matchAll(/<a\b[^>]*href\s*=\s*(["'])(.*?)\1/gi)];
    for(const match of hrefs){
      try{
        const target=new URL(decode(match[2]),pageUrl);
        if(["http:","https:"].includes(target.protocol)&&monitor.hosts.includes(target.hostname.toLowerCase())){
          link=target.href;
          break;
        }
      }catch{}
    }

    const key=link+"|"+title;
    if(seen.has(key))continue;
    seen.add(key);
    out.push({
      title,
      link,
      guid:key,
      summary:clean("Issued date: "+(cells[0]||"Not shown")+
        "; appointment: "+(method||"Not shown")+
        "; last date: "+(lastDate||"Not shown")+". Official Employment News listing.",1200),
      publishedAt,
      applicationLastDate
    });
  }
  return out.slice(0,25);
}



function extractOfficialTableRows(html,pageUrl,monitor){
  const out=[];
  const seen=new Set();
  const rows=String(html||"").match(/<tr\\b[^>]*>[\\s\\S]*?<\\/tr>/gi)||[];

  for(const row of rows){
    const cells=[...row.matchAll(/<(td|th)\\b[^>]*>([\\s\\S]*?)<\\/\\1>/gi)]
      .map(match=>cleanFeedContent(match[2],1200))
      .filter(Boolean);
    if(cells.length<2)continue;

    const rowText=cells.join(" ");
    if(IGNORE_RE.test(rowText))continue;
    const title=clean(cells.slice(1).join(" - "),220);
    if(!isUsefulNoticeTitle(title)||!RECRUITMENT_RE.test(title))continue;

    const hrefs=[...row.matchAll(/<a\\b[^>]*href\\s*=\\s*(["'])(.*?)\\1/gi)];
    let link="";
    for(const match of hrefs){
      try{
        const target=new URL(decode(match[2]),pageUrl);
        if(["http:","https:"].includes(target.protocol)&&monitor.hosts.includes(target.hostname.toLowerCase())){
          link=target.href;
          break;
        }
      }catch{}
    }
    // Only ingest a row when it points to a document/page on the same official institution.
    if(!link)continue;

    const key=link+"|"+title;
    if(seen.has(key))continue;
    seen.add(key);
    const dateMatch=rowText.match(/\\b\\d{1,2}[\\/-]\\d{1,2}[\\/-]\\d{4}\\b/);
    out.push({
      title,
      link,
      guid:key,
      summary:clean(rowText,1200),
      publishedAt:dateMatch?parseOfficialDate(dateMatch[0]):null,
      applicationLastDate:null
    });
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

      const entries=monitor.parser==="employment-jobs"
        ?extractEmploymentNewsRows(html,pageUrl,monitor)
        :monitor.parser==="table"
          ?(extractOfficialTableRows(html,pageUrl,monitor).length
            ?extractOfficialTableRows(html,pageUrl,monitor)
            :extractOfficialLinks(html,pageUrl,monitor))
          :extractOfficialLinks(html,pageUrl,monitor);

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


async function syncOfficialMonitors(db,env,dateBudget){
  let inserted=0;
  let skipped=0;
  let dateChecks=0;
  const errors=[];
  const results=await Promise.all(OFFICIAL_MONITORS.map(m=>fetchOfficialMonitor(m)));

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
      const fingerprint=("official-page|"+item.link+"|"+item.title).slice(0,900);
      const duplicate=await db.prepare("SELECT id,published_at,application_last_date,date_checked_at,date_evidence FROM posts WHERE lower(title)=lower(?) LIMIT 1").bind(item.title).first();
      const existingReview=await db.prepare("SELECT id,published_at,application_last_date,date_checked_at,date_evidence FROM review_items WHERE fingerprint=? AND status='pending'").bind(fingerprint).first();
      const current=existingReview||duplicate;
      let automatic=null;
      const hasMissingDate=!current||!current.published_at||!current.application_last_date;
      if(hasMissingDate&&dateCheckIsDue(current?.date_checked_at)&&dateBudget.used<dateBudget.max){
        dateBudget.used++;
        dateChecks++;
        automatic=await extractOfficialNoticeDates(env,item.link);
      }
      const publishedAt=item.publishedAt||automatic?.publishedAt||null;
      const applicationLastDate=item.applicationLastDate||automatic?.applicationLastDate||null;
      const checkedAt=automatic?.checkedAt||(item.publishedAt||item.applicationLastDate?new Date().toISOString():null);
      const evidence=automatic?.evidence||(item.publishedAt||item.applicationLastDate?"Date read from the official listing page.":null);

      if(duplicate){
        await db.prepare("UPDATE posts SET published_at=COALESCE(published_at,?),application_last_date=COALESCE(application_last_date,?),date_checked_at=COALESCE(?,date_checked_at),date_evidence=COALESCE(?,date_evidence) WHERE id=?")
          .bind(publishedAt,applicationLastDate,checkedAt,evidence,duplicate.id).run();
      }
      if(existingReview){
        await db.prepare("UPDATE review_items SET published_at=COALESCE(published_at,?),application_last_date=COALESCE(application_last_date,?),date_checked_at=COALESCE(?,date_checked_at),date_evidence=COALESCE(?,date_evidence) WHERE id=?")
          .bind(publishedAt,applicationLastDate,checkedAt,evidence,existingReview.id).run();
        skipped++;
        continue;
      }
      if(duplicate){
        skipped++;
        continue;
      }

      const write=await db.prepare(`
        INSERT OR IGNORE INTO review_items
        (fingerprint,title,summary,category,source_name,source_url,published_at,application_last_date,date_checked_at,date_evidence,status)
        VALUES(?,?,?,?,?,?,?,?,?,?, 'pending')
      `).bind(
        fingerprint,
        item.title,
        clean(item.summary||"",1200),
        (detectCategory(item.title,item.summary||"")||monitor.category||"jobs-vacancies"),
        monitor.name,
        item.link,
        publishedAt,
        applicationLastDate,
        checkedAt,
        evidence
      ).run();
      if(write.meta?.changes)inserted++;
      else skipped++;
    }
  }
  return {checked:OFFICIAL_MONITORS.length,inserted,skipped,date_checks:dateChecks,errors};
}

/* MAIN SYNC SYSTEM */

async function syncAll(env){
  const sources=await env.DB.prepare("SELECT * FROM sources WHERE active=1").all();
  let rssInserted=0;
  let rssSkipped=0;
  const errors=[];
  const dateBudget={used:0,max:8};

  // RSS feeds: enrich missing dates from the official item page/PDF, within a small per-sync budget.
  await Promise.all((sources.results||[]).map(async source=>{
    try{
      const entries=await fetchFeed(source,env);
      for(const item of entries){
        const guid=(source.feed_url+"|"+item.guid).slice(0,900);
        const summaryDates=extractNoticeDatesFromText(item.summary);
        const summaryDeadline=parseApplicationDeadline(item.summary)||summaryDates.applicationLastDate;
        const feedPublishedAt=item.publishedAt||summaryDates.publishedAt||null;
        const duplicate=await env.DB.prepare("SELECT id,summary,published_at,application_last_date,date_checked_at,date_evidence FROM posts WHERE lower(title)=lower(?) LIMIT 1").bind(item.title).first();
        let automatic=null;
        const missingDate=!feedPublishedAt||!summaryDeadline;
        if(missingDate&&dateBudget.used<dateBudget.max&&(!duplicate||dateCheckIsDue(duplicate.date_checked_at))){
          dateBudget.used++;
          automatic=await extractOfficialNoticeDates(env,item.link);
        }
        const publishedAt=feedPublishedAt||automatic?.publishedAt||null;
        const applicationLastDate=summaryDeadline||automatic?.applicationLastDate||null;
        const checkedAt=automatic?.checkedAt||((summaryDates.publishedAt||summaryDates.applicationLastDate)?new Date().toISOString():null);
        const summaryHasEvidence=!summaryDates.evidence.startsWith("No clearly labelled");
        const evidence=automatic?.evidence||(summaryHasEvidence?summaryDates.evidence:null);

        if(duplicate){
          const incomingSummary=String(item.summary||"").trim();
          const storedSummary=String(duplicate.summary||"").trim();
          if(incomingSummary.length>storedSummary.length||(!duplicate.published_at&&publishedAt)||(!duplicate.application_last_date&&applicationLastDate)||checkedAt){
            await env.DB.prepare("UPDATE posts SET summary=CASE WHEN length(?)>length(summary) THEN ? ELSE summary END,published_at=COALESCE(published_at,?),application_last_date=COALESCE(application_last_date,?),date_checked_at=COALESCE(?,date_checked_at),date_evidence=COALESCE(?,date_evidence) WHERE id=?")
              .bind(incomingSummary,incomingSummary,publishedAt,applicationLastDate,checkedAt,evidence,duplicate.id).run();
          }
          rssSkipped++;
          continue;
        }
        const result=await env.DB.prepare(`
          INSERT OR IGNORE INTO posts
          (guid,title,summary,category,source_name,source_url,published_at,application_last_date,date_checked_at,date_evidence,status,ai_extraction_status)
          VALUES(?,?,?,?,?,?,?,?,?,?,'published','pending')
        `).bind(
          guid,item.title,item.summary,
          (detectCategory(item.title,item.summary)||(CATEGORY_SET.has(source.category)?source.category:"jobs-vacancies")),
          source.name,item.link,publishedAt,applicationLastDate,checkedAt,evidence
        ).run();
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

  let officialResult={checked:0,inserted:0,skipped:0,date_checks:0,errors:[]};
  try{
    officialResult=await syncOfficialMonitors(env.DB,env,dateBudget);
    errors.push(...officialResult.errors);
  }catch(e){
    errors.push("Official monitoring: "+clean(e.message,180));
  }

  const pendingCount=await env.DB.prepare("SELECT COUNT(*) AS total FROM review_items WHERE status='pending'").first();
  return {
    sources_checked:(sources.results?.length||0)+officialResult.checked,
    review_pending:pendingCount?.total||0,
    rss:{inserted:rssInserted,skipped:rssSkipped},
    official:{checked:officialResult.checked,inserted:officialResult.inserted,skipped:officialResult.skipped},
    date_extraction:{checked:dateBudget.used,limit:dateBudget.max,pending_next_sync:Math.max(0,officialResult.inserted+officialResult.skipped-dateBudget.used)},
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



/* Stable, readable post slugs. Existing rows are filled lazily without deleting or rewriting content. */
function slugify(title = "") {
  return String(title).normalize("NFKD").replace(/[\\u0300-\\u036f]/g, "")
    .toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "").slice(0, 90).replace(/-+$/g, "");
}
async function createUniqueSlug(db, title) {
  const base = slugify(title) || "government-update";
  let slug = base, suffix = 2;
  while (await db.prepare("SELECT id FROM posts WHERE slug=? LIMIT 1").bind(slug).first()) {
    slug = `${base}-${suffix++}`;
  }
  return slug;
}
async function ensurePostSlugs(db, posts) {
  for (const post of posts) {
    if (post.slug) continue;
    let slug = await createUniqueSlug(db, post.title);
    await db.prepare("UPDATE posts SET slug=? WHERE id=? AND (slug IS NULL OR slug='')")
      .bind(slug, post.id).run();
    post.slug = slug;
  }
  return posts;
}

/* WORKER API */

export default {
  async fetch(request,env,ctx){
    const origin=request.headers.get("Origin")||"";
    const allowed=env.ALLOWED_ORIGIN||"https://jobs.go7.in";
    const localPreview=/^http:\/\/(localhost|127\.0\.0\.1):8080$/.test(origin);
    const corsOrigin=(origin===allowed||localPreview)?origin:allowed;

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

      const slugMatch=path.match(/^\/api\/posts\/slug\/([a-z0-9-]+)$/);
      if(slugMatch&&request.method==="GET"){
        const slug=slugMatch[1];
        let post=await env.DB.prepare(
          "SELECT id,title,summary,category,source_name,source_url,published_at,application_last_date,date_checked_at,date_evidence,created_at,slug,ai_details_json,ai_extraction_status,ai_extracted_at,ai_extraction_error FROM posts WHERE slug=? AND status='published'"
        ).bind(slug).first();
        if(!post){
          const candidates=await env.DB.prepare("SELECT id,title,slug FROM posts WHERE status='published'").all();
          const match=(candidates.results||[]).find(row=>slugify(row.title)===slug&&!row.slug);
          if(match){
            await ensurePostSlugs(env.DB,[match]);
            post=await env.DB.prepare("SELECT id,title,summary,category,source_name,source_url,published_at,application_last_date,created_at,slug,ai_details_json,ai_extraction_status,ai_extracted_at,ai_extraction_error FROM posts WHERE id=? AND status='published'").bind(match.id).first();
          }
        }
        if(!post)return json({error:"Post not found"},404,corsOrigin);
        const labelMap=Object.fromEntries(CATEGORIES);
        let aiDetails=null; try{aiDetails=post.ai_details_json?JSON.parse(post.ai_details_json):null;}catch{}
        delete post.ai_details_json;
        return json({post:{...post,ai_details:aiDetails,category_label:labelMap[post.category]||post.category}},200,corsOrigin);
      }

      const detailMatch=path.match(/^\/api\/posts\/(\d+)$/);

      if(detailMatch&&request.method==="GET"){
        const post=await env.DB.prepare(
          "SELECT id,title,summary,category,source_name,source_url,published_at,application_last_date,created_at,ai_details_json,ai_extraction_status,ai_extracted_at,ai_extraction_error FROM posts WHERE id=? AND status='published'"
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
          SELECT id,title,summary,category,source_name,source_url,published_at,application_last_date,created_at,slug
          FROM posts WHERE ${where}
          ORDER BY COALESCE(published_at,created_at) DESC
          LIMIT ? OFFSET ?
        `).bind(...params,limit,offset).all();

        const labelMap=Object.fromEntries(CATEGORIES);
        const posts=await ensurePostSlugs(env.DB,rows.results||[]);

        return json({
          posts:posts.map(p=>({
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
          const rows = await env.DB.prepare("SELECT id,title,source_name,source_url,ai_extraction_status,ai_extraction_error FROM posts WHERE status='published' AND category='jobs-vacancies' ORDER BY created_at DESC LIMIT 50").all();
          return json({ items: rows.results || [] }, 200, corsOrigin);
        }

        const extractTextMatch = path.match(/^\/api\/admin\/posts\/(\d+)\/extract-text$/);
        if (extractTextMatch && request.method === "POST") {
          const post = await env.DB.prepare("SELECT id,title,source_name,source_url,category FROM posts WHERE id=? AND status='published'").bind(Number(extractTextMatch[1])).first();
          if (!post) return json({ error: "Published post not found." }, 404, corsOrigin);
          if (post.category !== "jobs-vacancies") return json({ error: "AI notice extraction is only enabled for Jobs & Vacancies." }, 400, corsOrigin);
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
          const rawPublished=String(body.published_at||"").trim(),rawDeadline=String(body.application_last_date||"").trim();
          const publishedAt=rawPublished?parseOfficialDate(rawPublished):null;
          const applicationLastDate=rawDeadline?parseOfficialDate(rawDeadline):null;
          if(rawPublished&&!publishedAt)return json({error:"Enter a valid official publication date."},400,corsOrigin);
          if(rawDeadline&&!applicationLastDate)return json({error:"Enter a valid application last date."},400,corsOrigin);
          if(!title || !CATEGORY_SET.has(category) || !safeHttpUrl(source_url)) return json({error:"Valid title, category and official HTTP(S) source URL are required."},400,corsOrigin);
          const host=new URL(source_url).hostname;
          if(!isOfficialHost(host)) return json({error:"Manual posts must link to an official .gov.in, .nic.in, .ac.in or .edu.in source."},400,corsOrigin);
          const guid="manual|"+crypto.randomUUID();
          const finalCategory=detectCategory(title,summary)||category;
          const slug=await createUniqueSlug(env.DB,title);
          const result=await env.DB.prepare("INSERT INTO posts (guid,title,summary,category,source_name,source_url,published_at,application_last_date,status,ai_extraction_status,slug) VALUES(?,?,?,?,?,?,?,?, 'published','pending',?)").bind(guid,title,summary,finalCategory,source_name,source_url,publishedAt,applicationLastDate,slug).run();
          return json({ok:true,id:result.meta?.last_row_id,message:"Post published."},201,corsOrigin);
        }

        if(path==="/api/admin/review"&&request.method==="GET"){
          const rows=await env.DB.prepare(
            "SELECT id,title,category,source_name,source_url,published_at,application_last_date,date_checked_at,date_evidence,detected_at FROM review_items WHERE status='pending' ORDER BY detected_at DESC LIMIT 100"
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
            const approvalBody=await request.json().catch(()=>({}));
            const rawPublished=String(approvalBody.published_at||"").trim();
            const rawDeadline=String(approvalBody.application_last_date||"").trim();
            const publishedAt=rawPublished?parseOfficialDate(rawPublished):(item.published_at||null);
            const applicationLastDate=rawDeadline?parseOfficialDate(rawDeadline):(item.application_last_date||null);
            if(rawPublished&&!publishedAt)return json({error:"Enter a valid official publication date (DD/MM/YYYY or YYYY-MM-DD)."},400,corsOrigin);
            if(rawDeadline&&!applicationLastDate)return json({error:"Enter a valid application last date (DD/MM/YYYY or YYYY-MM-DD)."},400,corsOrigin);
            const duplicate=await env.DB.prepare("SELECT id,published_at,application_last_date,date_checked_at,date_evidence FROM posts WHERE lower(title)=lower(?) LIMIT 1").bind(item.title).first();
            if(!duplicate){
              const slug=await createUniqueSlug(env.DB,item.title);
              await env.DB.prepare(`INSERT OR IGNORE INTO posts (guid,title,summary,category,source_name,source_url,published_at,application_last_date,date_checked_at,date_evidence,status,ai_extraction_status,slug) VALUES(?,?,?,?,?,?,?,?,?,?, 'published','pending',?)`)
                .bind(item.fingerprint,item.title,item.summary||"",(detectCategory(item.title,item.summary||"") || item.category || "jobs-vacancies"),item.source_name,item.source_url,publishedAt,applicationLastDate,item.date_checked_at||null,item.date_evidence||null,slug).run();
            }else if((publishedAt&&!duplicate.published_at)||(applicationLastDate&&!duplicate.application_last_date)||(item.date_checked_at&&!duplicate.date_checked_at)){
              await env.DB.prepare("UPDATE posts SET published_at=COALESCE(published_at,?),application_last_date=COALESCE(application_last_date,?),date_checked_at=COALESCE(date_checked_at,?),date_evidence=COALESCE(date_evidence,?) WHERE id=?")
                .bind(publishedAt,applicationLastDate,item.date_checked_at||null,item.date_evidence||null,duplicate.id).run();
            }
            await env.DB.prepare("UPDATE review_items SET status='approved',published_at=COALESCE(?,published_at),application_last_date=COALESCE(?,application_last_date) WHERE id=?")
              .bind(publishedAt,applicationLastDate,id).run();
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
            const category=detectCategory(post.title,post.summary)||post.category;
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