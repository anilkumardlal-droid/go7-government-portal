# GO7 Portal — सुरक्षित Deployment निर्देश

**महत्वपूर्ण:** पहले ZIP को लोकल में जाँचें। बिना परीक्षण Cloudflare पर Deploy न करें।

## लोकल Preview
प्रोजेक्ट के मुख्य फोल्डर में PowerShell खोलें और चलाएँ:
```powershell
npx.cmd http-server .\public -p 8080
```
ब्राउज़र में खोलें: http://127.0.0.1:8080/index.html

## Worker और D1
Worker folder में जाएँ:
```powershell
cd worker
npm ci
```

D1 में केवल pending additive migrations लागू करें:
```powershell
npx.cmd wrangler d1 migrations apply go7-gov-db --remote
```
इस पैकेज में migration 0004 AI fields और migration 0005 post slug field जोड़ते हैं। पुरानी posts delete या reset नहीं होतीं। Migration चलाने से पहले Cloudflare D1 का backup लेना उचित है।

इसके बाद Worker Deploy:
```powershell
npx.cmd wrangler deploy
```

## Pages
जब Worker API test हो जाए, तभी `public` folder को existing Cloudflare Pages project में deploy करें। Project name/production domain Cloudflare dashboard में verify करें।

## जाँच सूची
- Homepage में हर category के 10 तक posts दिखें।
- View All से सही root-level category URL खुले।
- Category URL में `/category/` न हो।
- Post slug URL सीधे refresh करने पर भी खुले।
- Mobile menu और More menu काम करें।
- Admin panel और feed sync काम करे।
- Old numeric detail links का compatibility बना रहे।

`ADMIN_TOKEN` को केवल Cloudflare Worker secret में रखें। इसे ZIP/GitHub में कभी न डालें।
