/* ARC Tools: site menu for tool pages opened on their own.
 *
 * On phones and tablets the site opens HTML tools as full pages instead of
 * inside a frame, because mobile browsers can stop drawing parts of a
 * scrolling frame. This adds the same top bar and slide-out tool menu the
 * site has, so moving between tools works the same everywhere.
 * Inside the site's frame (desktop) it does nothing.
 *
 * Add to a tool page's <head>:
 *   <script src="/nav.js" data-title="Tool name" data-accent="#50B080" defer></script>
 * The title and accent are fallbacks; the menu reads tools.js.
 */
(function () {
  if (window.top !== window) return;
  var me = document.currentScript;
  var fallback = { name: (me && me.dataset.title) || document.title, accent: (me && me.dataset.accent) || "#7EA0FF" };

  var CSS = [
    ".arc-bar{position:fixed;z-index:1000;top:0;left:0;right:0;display:flex;align-items:center;gap:6px;height:calc(52px + env(safe-area-inset-top,0px));padding:env(safe-area-inset-top,0px) max(14px,env(safe-area-inset-right,0px)) 0 max(8px,env(safe-area-inset-left,0px));background:var(--arc-rail,#12161C);border-bottom:1px solid var(--arc-line,#232934)}",
    ".arc-bar,.arc-rail{color:var(--arc-text,#E8EAEE);font:500 14px/1.4 var(--arc-font,system-ui,sans-serif);-webkit-font-smoothing:antialiased;box-sizing:border-box;text-align:left;letter-spacing:normal;text-transform:none}",
    ".arc-bar *,.arc-rail *{box-sizing:border-box}",
    ".arc-menu{flex:none;display:grid;place-items:center;width:40px;height:40px;border:0;border-radius:8px;background:transparent;color:var(--arc-text,#E8EAEE);cursor:pointer;padding:0;-webkit-tap-highlight-color:transparent}",
    ".arc-menu:hover{background:var(--arc-raise,#1C222B)}",
    ".arc-menu svg{width:20px;height:20px}",
    ".arc-ttl{flex:1;min-width:0;display:flex;align-items:center;gap:9px;font-weight:600;font-size:15px;overflow:hidden;white-space:nowrap}",
    ".arc-ttl span:last-child{overflow:hidden;text-overflow:ellipsis}",
    ".arc-utc{color:var(--arc-mut,#8B93A1);font-size:13px;font-variant-numeric:tabular-nums;white-space:nowrap}",
    ".arc-utc b{color:var(--arc-text,#E8EAEE);font-weight:500}",
    ".arc-glyph{flex:none;display:grid;place-items:center;width:28px;height:28px;border-radius:8px;background:color-mix(in srgb,var(--c) 15%,transparent);color:var(--c);font-weight:600;font-size:13px}",
    ".arc-glyph svg{width:16px;height:16px}",
    ".arc-ttl .arc-glyph{width:24px;height:24px;border-radius:7px}",
    ".arc-ttl .arc-glyph svg{width:14px;height:14px}",
    ".arc-rail{position:fixed;z-index:1002;top:0;bottom:0;left:0;width:min(300px,86vw);display:flex;flex-direction:column;background:var(--arc-rail,#12161C);padding:calc(14px + env(safe-area-inset-top,0px)) 12px 12px max(12px,env(safe-area-inset-left,0px));transform:translateX(-102%);transition:transform .24s cubic-bezier(.2,.7,.2,1),visibility 0s linear .24s;box-shadow:0 0 0 1px var(--arc-line,#232934),24px 0 60px rgba(0,0,0,.45);visibility:hidden}",
    ".arc-open .arc-rail{transform:none;visibility:visible;transition-delay:0s}",
    ".arc-scrim{position:fixed;inset:0;z-index:1001;background:rgba(5,7,10,.6);opacity:0;pointer-events:none;transition:opacity .24s}",
    ".arc-open .arc-scrim{opacity:1;pointer-events:auto}",
    ".arc-brand{display:flex;align-items:center;gap:10px;height:40px;padding:0 6px;margin-bottom:14px;border-radius:10px;color:inherit;text-decoration:none;font-weight:600;font-size:15px;letter-spacing:-.01em;white-space:nowrap}",
    ".arc-brand:hover{background:var(--arc-raise,#1C222B)}",
    ".arc-mark{flex:none;width:28px;height:28px;display:grid;place-items:center}",
    ".arc-mark svg{width:18px;height:18px}",
    ".arc-nav{flex:1;min-height:0;overflow-y:auto;margin:0 -4px;padding:0 4px}",
    ".arc-group+.arc-group{margin-top:18px}",
    ".arc-gname{margin:0 0 6px;padding:0 8px;color:var(--arc-dim,#5F6774);font-size:12px;font-weight:500}",
    ".arc-item{display:flex;align-items:center;gap:11px;height:40px;padding:0 6px;border-radius:10px;color:var(--arc-mut,#8B93A1);text-decoration:none;font-weight:500;white-space:nowrap;-webkit-tap-highlight-color:transparent}",
    ".arc-item+.arc-item{margin-top:2px}",
    ".arc-item:hover{background:var(--arc-raise,#1C222B);color:var(--arc-text,#E8EAEE)}",
    ".arc-item[aria-current=page]{background:var(--arc-raise,#1C222B);color:var(--arc-text,#E8EAEE);box-shadow:inset 0 0 0 1px var(--arc-line-2,#2E3542)}",
    ".arc-item span:last-child{overflow:hidden;text-overflow:ellipsis}",
    ".arc-foot{display:flex;align-items:baseline;gap:8px;margin-top:12px;padding:12px 8px 0;border-top:1px solid var(--arc-line,#232934);color:var(--arc-dim,#5F6774);font-size:12.5px}",
    ".arc-foot b{color:var(--arc-text,#E8EAEE);font-weight:600;font-variant-numeric:tabular-nums}",
  ].join("\n");

  var SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">';

  function h(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function glyph(t) {
    var g = h("span", "arc-glyph");
    g.style.setProperty("--c", t.accent || "#8B93A1");
    var icons = window.ARC_ICONS || {};
    if (icons[t.icon]) g.innerHTML = SVG + icons[t.icon] + "</svg>";
    else g.textContent = (t.name || "?").trim().charAt(0).toUpperCase();
    return g;
  }
  function href(t) { return "/" + (t.page || t.file.replace(/[^/]*$/, "")).replace(/^\//, "").replace(/\/?$/, "/"); }

  function loadTools(done) {
    if (window.ARC_TOOLS) return done();
    var s = document.createElement("script");
    s.src = "/tools.js";
    s.onload = s.onerror = done;
    document.head.appendChild(s);
  }

  function mount() {
    var tools = window.ARC_TOOLS || [];
    var groups = window.ARC_GROUPS || [];
    var here = location.pathname.replace(/index\.html$/, "");
    var tool = tools.filter(function (t) { return t.page && href(t).replace(/index\.html$/, "") === here; })[0] || fallback;

    var style = h("style", null);
    style.textContent = CSS;
    document.head.appendChild(style);

    var root = h("div", "arc-shell");

    // top bar
    var bar = h("header", "arc-bar");
    var menu = h("button", "arc-menu", '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>');
    menu.type = "button";
    menu.setAttribute("aria-label", "Open tool menu");
    menu.setAttribute("aria-expanded", "false");
    var ttl = h("div", "arc-ttl");
    ttl.appendChild(glyph(tool));
    var name = h("span");
    name.textContent = tool.name;
    ttl.appendChild(name);
    var utc = h("div", "arc-utc", "<b></b> UTC");
    bar.appendChild(menu); bar.appendChild(ttl); bar.appendChild(utc);

    // drawer
    var rail = h("aside", "arc-rail");
    rail.setAttribute("aria-label", "Tools");
    rail.appendChild(h("a", "arc-brand",
      '<span class="arc-mark"><svg viewBox="0 0 24 24"><path d="M12 2.5L21.5 12 12 21.5 2.5 12z" fill="#F4BF41"/><path d="M12 7.5L16.5 12 12 16.5 7.5 12z" fill="#0E1116"/></svg></span><span>ARC Tools</span>'));
    rail.firstChild.href = "/";
    var nav = h("nav", "arc-nav");
    var listed = groups.concat([{ id: "_other", name: "More tools" }]);
    listed.forEach(function (g) {
      var mine = tools.filter(function (t) {
        return g.id === "_other" ? !groups.some(function (x) { return x.id === t.group; }) : t.group === g.id;
      });
      if (!mine.length) return;
      var box = h("div", "arc-group");
      var gn = h("div", "arc-gname"); gn.textContent = g.name; box.appendChild(gn);
      mine.forEach(function (t) {
        var a = h("a", "arc-item");
        a.href = href(t);
        if (t === tool) a.setAttribute("aria-current", "page");
        a.appendChild(glyph(t));
        var n = h("span"); n.textContent = t.name; a.appendChild(n);
        box.appendChild(a);
      });
      nav.appendChild(box);
    });
    rail.appendChild(nav);
    var foot = h("div", "arc-foot", "<b></b><span>UTC</span><span class=\"arc-day\"></span>");
    rail.appendChild(foot);
    var scrim = h("div", "arc-scrim");

    root.appendChild(bar); root.appendChild(scrim); root.appendChild(rail);
    document.body.insertBefore(root, document.body.firstChild);

    function setOpen(on) {
      root.classList.toggle("arc-open", on);
      menu.setAttribute("aria-expanded", String(on));
    }
    menu.addEventListener("click", function () { setOpen(!root.classList.contains("arc-open")); });
    scrim.addEventListener("click", function () { setOpen(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setOpen(false); });
    rail.addEventListener("click", function (e) { if (e.target.closest("a")) setOpen(false); });
    // coming back with the browser's back button can restore the page with the menu open
    window.addEventListener("pageshow", function () { setOpen(false); });

    // push the page down by the bar's height, on top of the padding it already has
    var body = document.body;
    function pad() {
      body.style.paddingTop = "";
      var base = parseFloat(getComputedStyle(body).paddingTop) || 0;
      body.style.paddingTop = "calc(" + base + "px + " + bar.offsetHeight + "px)";
    }
    pad();
    window.addEventListener("resize", pad);

    var clocks = [utc.querySelector("b"), foot.querySelector("b")];
    var day = foot.querySelector(".arc-day");
    function tick() {
      var d = new Date();
      var hm = String(d.getUTCHours()).padStart(2, "0") + ":" + String(d.getUTCMinutes()).padStart(2, "0");
      clocks.forEach(function (c) { c.textContent = hm; });
      day.textContent = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
    }
    tick();
    setInterval(tick, 10000);
  }

  // On a computer, tools open inside the site (sidebar + frame). A tool address opened on
  // its own goes there instead, unless it carries a #... (e.g. a shared plan).
  var FULL_PAGE = window.matchMedia("(max-width: 860px), (pointer: coarse)");
  function start() {
    if (!FULL_PAGE.matches && !location.hash) {
      loadTools(function () {
        var here = location.pathname.replace(/index\.html$/, "");
        var t = (window.ARC_TOOLS || []).filter(function (x) { return x.page && href(x) === here; })[0];
        if (t) location.replace("/#" + t.id); else mount();
      });
      return;
    }
    loadTools(mount);
  }
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start);
})();
