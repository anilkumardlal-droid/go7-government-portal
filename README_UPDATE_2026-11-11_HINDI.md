# GO7 Portal – Frontend Update (11 Nov 2026)

इस पैकेज में केवल `public/` frontend files अपडेट किए गए हैं। Worker, D1 database, migrations और secrets को बदलने/रीसेट करने की जरूरत नहीं है।

## बदलाव
- About, Privacy, Disclaimer, Terms और Contact pages पर shared header/footer/navigation।
- Homepage category panels प्रति category अधिकतम 20 published posts माँगते हैं। उपलब्ध posts ही दिखेंगे; कोई dummy post नहीं जोड़ा गया।
- Latest Updates में पहले 10 posts और pagination के जरिए Load More।
- हर 60 सेकंड में नवीनतम posts की background refresh; पुराने loaded posts हटाए बिना नए posts ऊपर जुड़ते हैं।
- GO7 UPDATE ticker और Important notice marquee।
- Notice का छोटा लाल View More बटन Disclaimer page खोलता है।
- Result detail pages में publisher द्वारा उपलब्ध fields से Result Details section।
- FAQ जवाब, सामान्य font size और logo size बढ़ाए गए।
- Mobile info panels 2 columns और desktop 3 columns।

## Deploy
पुराने project में ZIP की `public` directory को merge/replace करें, फिर `git add -A public README_UPDATE_2026-11-11_HINDI.md`, commit और push करें। `worker/.wrangler/` को git में add न करें।

नोट: Live refresh browser खुला रहने पर हर 60 सेकंड API से नवीनतम प्रकाशित posts जाँचता है। Official publisher feed/cron से नया notice उपलब्ध होने में अलग समय लग सकता है।
