/* Link previews: the picture and text shown when someone shares a link to the
 * site or a tool (Discord, iMessage, WhatsApp, X, ...).
 *
 *   npm i -g playwright && npx playwright install chromium   (once)
 *   node scripts/og-cards.js
 *
 * Run it from the repo root after adding a tool or changing a name or blurb in
 * tools.js. It redraws og/*.png and rewrites the tags between <!-- og --> and
 * <!-- /og --> in each page. React tools get a small page in their folder
 * (tools/<name>/index.html) that has their preview and opens them on the site.
 */
const fs = require('fs'), vm = require('vm'), path = require('path');
let pw; try { pw = require('playwright'); } catch (e) { pw = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright'); }
const { chromium } = pw;
const REPO = path.resolve(__dirname, '..'), OUT = path.join(REPO, 'og');
const SITE = 'https://zephyrus44.github.io';
const VERSION = 1; // bump when the pictures change, so apps fetch them again
// old addresses that still get shared; they redirect to the tool
const LEGACY = { 'grand-melee-planner.html': 'grand-melee', 'era-grouping.html': 'era-grouping', 'GlowwormsRusePlanner/glowworm/index.html': 'glowworms-ruse' };
const ctx = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(REPO, 'tools.js'), 'utf8'), ctx);
const { ARC_TOOLS: TOOLS, ARC_GROUPS: GROUPS, ARC_ICONS: ICONS } = ctx.window;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const svg = (icon, w) => `<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICONS[icon] || ''}</svg>`;
const MARK = (w) => `<svg viewBox="0 0 24 24" width="${w}" height="${w}"><path d="M12 2.5L21.5 12 12 21.5 2.5 12z" fill="#F4BF41"/><path d="M12 7.5L16.5 12 12 16.5 7.5 12z" fill="#0E1116"/></svg>`;
const base = (accent, body) => `<!doctype html><html><head><style>
@import url("https://fonts.googleapis.com/css2?family=Geist:wght@400..700&family=Geist+Mono&display=block");
*{box-sizing:border-box;margin:0}
html,body{width:1200px;height:630px;overflow:hidden}
body{position:relative;background:#0E1116;color:#E8EAEE;font-family:Geist,sans-serif;-webkit-font-smoothing:antialiased;padding:64px 72px}
.glow{position:absolute;inset:0;background:radial-gradient(700px 520px at 100% 0%,color-mix(in srgb,${accent} 22%,transparent),transparent 70%),radial-gradient(600px 400px at 0% 100%,color-mix(in srgb,${accent} 7%,transparent),transparent 70%)}
.grid{position:absolute;inset:0;background-image:linear-gradient(#ffffff08 1px,transparent 1px),linear-gradient(90deg,#ffffff08 1px,transparent 1px);background-size:48px 48px;-webkit-mask-image:radial-gradient(900px 600px at 85% 10%,#000,transparent 75%)}
.wrap{position:relative;height:100%;display:flex;flex-direction:column}
.brand{display:flex;align-items:center;gap:14px;font-size:28px;font-weight:600;letter-spacing:-.01em}
.foot{margin-top:auto;display:flex;align-items:center;justify-content:space-between;color:#8B93A1;font:24px 'Geist Mono',monospace}
.pill{font:500 22px Geist,sans-serif;color:#C3C8D1;border:1px solid #2E3542;background:#161A21;border-radius:999px;padding:8px 18px}
.tile{display:grid;place-items:center;border-radius:28px;background:color-mix(in srgb,var(--c) 16%,#0E1116);color:var(--c);box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--c) 35%,transparent)}
</style></head><body><div class="glow"></div><div class="grid"></div><div class="wrap">${body}</div></body></html>`;

const toolCard = (t) => {
  const g = (GROUPS.find((x) => x.id === t.group) || {}).name || '';
  const label = g === 'Event planners' ? 'Event planner' : g === 'Calculators' ? 'Calculator' : g;
  return base(t.accent, `
  <div class="brand">${MARK(34)}ARC Tools</div>
  <div style="display:flex;align-items:center;gap:44px;margin:auto 0">
    <div class="tile" style="--c:${t.accent};width:180px;height:180px;flex:none">${svg(t.icon, 96)}</div>
    <div style="min-width:0">
      <div style="font-size:${t.name.length > 16 ? 74 : 88}px;font-weight:700;letter-spacing:-.035em;line-height:1.02">${esc(t.name)}</div>
      <div style="margin-top:20px;font-size:31px;line-height:1.35;color:#A4ABB7;max-width:760px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">${esc(t.blurb)}</div>
    </div>
  </div>
  <div class="foot"><span>zephyrus44.github.io</span>${label ? `<span class="pill">${esc(label)}</span>` : ''}</div>`);
};
const siteCard = () => base('#7EA0FF', `
  <div class="brand" style="font-size:30px">${MARK(36)}Avatar Realms Collide</div>
  <div style="margin-top:64px;font-size:112px;font-weight:700;letter-spacing:-.045em;line-height:1">ARC Tools</div>
  <div style="margin-top:22px;font-size:36px;color:#A4ABB7">Event planners and calculators for Avatar Realms Collide.</div>
  <div style="display:flex;gap:18px;margin-top:52px">${TOOLS.map((t) => `<div class="tile" style="--c:${t.accent};width:92px;height:92px;border-radius:22px">${svg(t.icon, 48)}</div>`).join('')}</div>
  <div class="foot"><span>zephyrus44.github.io</span><span class="pill">${TOOLS.length} tools</span></div>`);

const attr = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const TAGLINE = 'Event planners and calculators for Avatar Realms Collide.';
function tags({ title, desc, url, img, alt }) {
  return [
    '<!-- og -->',
    `<meta name="description" content="${attr(desc)}">`,
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="ARC Tools">',
    `<meta property="og:title" content="${attr(title)}">`,
    `<meta property="og:description" content="${attr(desc)}">`,
    `<meta property="og:url" content="${attr(url)}">`,
    `<meta property="og:image" content="${attr(img)}">`,
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    `<meta property="og:image:alt" content="${attr(alt)}">`,
    '<meta name="twitter:card" content="summary_large_image">',
    '<!-- /og -->',
  ].join('\n');
}
function inject(file, block) {
  let s = fs.readFileSync(file, 'utf8');
  const a = s.indexOf('<!-- og -->'), b = s.indexOf('<!-- /og -->');
  if (a >= 0 && b > a) s = s.slice(0, a) + block + s.slice(b + '<!-- /og -->'.length);
  else {
    s = s.replace(/<meta name="description"[^>]*>\n?/, '');
    const m = s.match(/<title>[^<]*<\/title>\n?/); // first <title> is the page's own
    if (!m) throw new Error('no <title> in ' + file);
    const at = m.index + m[0].length;
    s = s.slice(0, at) + (m[0].endsWith('\n') ? '' : '\n') + block + '\n' + s.slice(at);
  }
  fs.writeFileSync(file, s);
}
const img = (id) => `${SITE}/og/${id}.png?v=${VERSION}`;
const toolTags = (t, url) => tags({ title: `${t.name} · ARC Tools`, desc: t.blurb, url, img: img(t.id), alt: `${t.name}: ${t.blurb}` });
const stub = (t, block) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(t.name)} · ARC Tools</title>
${block}
<meta http-equiv="refresh" content="0; url=/#${t.id}">
<script>location.replace("/" + location.search + "#${t.id}");</script>
</head>
<body style="background:#0E1116"></body>
</html>
`;

(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
  fs.mkdirSync(OUT, { recursive: true });
  for (const [id, html] of [['site', siteCard()], ...TOOLS.map((t) => [t.id, toolCard(t)])]) {
    await p.setContent(html, { waitUntil: 'networkidle' }); await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(OUT, id + '.png') });
  }
  await b.close();

  inject(path.join(REPO, 'index.html'), tags({ title: 'ARC Tools', desc: TAGLINE, url: SITE + '/', img: img('site'), alt: 'ARC Tools: ' + TAGLINE }));
  for (const t of TOOLS) {
    if (t.page) { inject(path.join(REPO, t.page, 'index.html'), toolTags(t, `${SITE}/${t.page}`)); continue; }
    const dir = path.dirname(t.file), f = path.join(REPO, dir, 'index.html');
    if (fs.existsSync(f) && !fs.readFileSync(f, 'utf8').includes('location.replace("/')) { console.warn('skipped, not a stub:', f); continue; }
    fs.writeFileSync(f, stub(t, toolTags(t, `${SITE}/${dir}/`)));
  }
  for (const [file, id] of Object.entries(LEGACY)) {
    const f = path.join(REPO, file), t = TOOLS.find((x) => x.id === id);
    if (t && fs.existsSync(f)) inject(f, toolTags(t, `${SITE}/${t.page || ''}`));
  }
  console.log('Previews updated for the site and', TOOLS.length, 'tools.');
})();
