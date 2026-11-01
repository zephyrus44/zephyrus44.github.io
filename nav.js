/* ARC Tools: top bar for tool pages opened on their own.
 *
 * On phones and tablets the site opens HTML tools as full pages instead of
 * inside a frame, because mobile browsers can stop drawing parts of a
 * scrolling frame. This bar gives those pages a way back to the tool list.
 * Inside the site's frame (desktop) it does nothing.
 *
 * Add to a tool page's <head>:
 *   <script src="/nav.js" data-title="Tool name" data-accent="#50B080" defer></script>
 */
(function () {
  if (window.top !== window) return;
  var me = document.currentScript;
  var title = (me && me.dataset.title) || document.title;
  var accent = (me && me.dataset.accent) || "var(--arc-accent, #7EA0FF)";
  var H = 52;

  var css =
    ".arc-bar{position:fixed;z-index:1000;top:0;left:0;right:0;display:flex;align-items:center;gap:6px;" +
    "height:calc(" + H + "px + env(safe-area-inset-top,0px));padding:env(safe-area-inset-top,0px) max(14px,env(safe-area-inset-right,0px)) 0 max(6px,env(safe-area-inset-left,0px));" +
    "background:var(--arc-rail,#12161C);border-bottom:1px solid var(--arc-line,#232934);color:var(--arc-text,#E8EAEE);" +
    "font:500 14px/1 var(--arc-font,system-ui,sans-serif);-webkit-font-smoothing:antialiased;box-sizing:border-box}" +
    ".arc-bar *{box-sizing:border-box}" +
    ".arc-bar a{display:flex;align-items:center;gap:2px;height:40px;padding:0 10px 0 4px;border-radius:10px;color:var(--arc-mut,#8B93A1);text-decoration:none;white-space:nowrap}" +
    ".arc-bar a:hover,.arc-bar a:active{background:var(--arc-raise,#1C222B);color:var(--arc-text,#E8EAEE)}" +
    ".arc-bar a svg{width:22px;height:22px}" +
    ".arc-bar .t{flex:1;min-width:0;display:flex;align-items:center;gap:9px;font-weight:600;font-size:15px;overflow:hidden;white-space:nowrap}" +
    ".arc-bar .t i{flex:none;width:9px;height:9px;border-radius:50%}" +
    ".arc-bar .t span{overflow:hidden;text-overflow:ellipsis}" +
    ".arc-bar .u{color:var(--arc-mut,#8B93A1);font-size:13px;font-variant-numeric:tabular-nums;white-space:nowrap}" +
    ".arc-bar .u b{color:var(--arc-text,#E8EAEE);font-weight:500}" +
    "@media (max-width:360px){.arc-bar a .l{display:none}}";

  function mount() {
    var style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    var bar = document.createElement("header");
    bar.className = "arc-bar";
    bar.innerHTML =
      '<a href="/" aria-label="All tools"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg><span class="l">All tools</span></a>' +
      '<div class="t"><i></i><span></span></div>' +
      '<div class="u"><b></b> UTC</div>';
    bar.querySelector(".t i").style.background = accent;
    bar.querySelector(".t span").textContent = title;
    document.body.insertBefore(bar, document.body.firstChild);

    // Push the page down by the bar's height, on top of whatever padding it already has.
    var body = document.body;
    function pad() {
      body.style.paddingTop = "";
      var base = parseFloat(getComputedStyle(body).paddingTop) || 0;
      body.style.paddingTop = "calc(" + base + "px + " + bar.offsetHeight + "px)";
    }
    pad();
    window.addEventListener("resize", pad);

    var clock = bar.querySelector(".u b");
    function tick() {
      var d = new Date();
      clock.textContent = String(d.getUTCHours()).padStart(2, "0") + ":" + String(d.getUTCMinutes()).padStart(2, "0");
    }
    tick();
    setInterval(tick, 10000);
  }

  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
