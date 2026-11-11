# GO7 Government Portal – Design Update

## क्या बदला है
- पूरी वेबसाइट का centered content width 1070px रखा गया है।
- Header और Footer के background भी उसी 1070px frame के अंदर हैं; full-screen color strips नहीं हैं।
- Flat professional design: कोई box-shadow, glow या अनावश्यक gradient नहीं।
- Homepage पर हर category के केवल 4 latest previews आते हैं। `View More` अलग category page खोलता है।
- Desktop navigation और mobile menu के styles एक जैसे रखे गए हैं।
- Existing API base, Worker, D1 migrations, RSS sync और admin API logic को नहीं बदला गया।
- Public `/admin.html` हटाया गया है। Private console का path नीचे दिया गया है।

## Private Admin
`https://jobs.go7.in/go7-owner-desk-7f3c9a/`

इस URL को सार्वजनिक रूप से share न करें। Admin token भी किसी के साथ share न करें। URL छिपाना authentication का विकल्प नहीं है; Worker पहले से `ADMIN_TOKEN` verify करता है।

## Deploy
पूरा project अपने existing GitHub repository में copy/replace करें। `worker/` और migrations में कोई बदलाव नहीं है, इसलिए इस design update के लिए Worker deploy या D1 migration चलाने की जरूरत नहीं है। Cloudflare Pages को GitHub `main` push से deploy होने दें।
