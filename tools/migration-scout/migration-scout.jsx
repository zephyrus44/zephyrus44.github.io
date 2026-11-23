import { useState, useMemo, useEffect } from "react";

// ---------------- Core game math (all UTC) ----------------
const DAY = 86400000;

// In-game "Day N" for every world, read from the Migration screen on
// Sun Nov 1, 2026 (UTC). Day 1 = the world's open date; matches Deng's Den
// open dates. Worlds opened irregularly early on (1007/1008 share a day, as
// do 1009/1010/1011), so this is a table, not a formula.
// Canonical copy lives in /data/world-days.json; this is the offline fallback.
const REF = Date.UTC(2026, 10, 1);
const EMBED_GAME_DAY = {
  1001: 929, 1002: 873, 1003: 817, 1004: 747, 1005: 698, 1006: 628, 1007: 607, 1008: 607,
  1009: 595, 1010: 595, 1011: 595, 1012: 593, 1013: 592, 1014: 590, 1015: 589, 1016: 587,
  1017: 585, 1018: 583, 1019: 582, 1020: 581, 1021: 578, 1022: 576, 1023: 574, 1024: 571,
  1025: 568, 1026: 565, 1027: 562, 1028: 559, 1029: 555, 1030: 552, 1031: 548, 1032: 544,
  1033: 539, 1034: 534, 1035: 529, 1036: 526, 1037: 521, 1038: 515, 1039: 509, 1040: 503,
  1041: 496, 1042: 489, 1043: 482, 1044: 475, 1045: 470, 1046: 465, 1047: 459, 1048: 452,
  1049: 445, 1050: 438, 1051: 432, 1052: 425, 1053: 418, 1054: 411, 1055: 404, 1056: 397,
  1057: 390, 1058: 383, 1059: 376, 1060: 362, 1061: 353, 1062: 346, 1063: 339, 1064: 332,
  1065: 325, 1066: 318, 1067: 311, 1068: 304, 1069: 297, 1070: 290, 1071: 283, 1072: 276,
  1073: 269, 1074: 262, 1075: 255, 1076: 248, 1077: 241, 1078: 234, 1079: 227, 1080: 220,
  1081: 213, 1082: 206, 1083: 199, 1084: 192, 1085: 185, 1086: 178, 1087: 171, 1088: 164,
  1089: 157, 1090: 150, 1091: 143, 1092: 136, 1093: 129, 1094: 122, 1095: 115, 1096: 108,
  1097: 101, 1098: 94, 1099: 87, 1100: 80, 1101: 73, 1102: 66, 1103: 59, 1104: 52,
  1105: 45, 1106: 38, 1107: 31, 1108: 24, 1109: 17, 1110: 10, 1111: 3,
};
const EMBED_NEWEST = 1111; // opened Fri Oct 30, 2026; new worlds every Friday after

// Swapped for the live file by loadWorldDays() when it resolves.
let GAME_DAY = EMBED_GAME_DAY;
let NEWEST_KNOWN = EMBED_NEWEST;

async function loadWorldDays() {
  try {
    const r = await fetch("/data/world-days.json", { cache: "no-store" });
    if (!r.ok) return false;
    const j = await r.json();
    if (!j || !j.game_day) return false;
    const next = {};
    for (const [k, v] of Object.entries(j.game_day)) next[Number(k)] = Number(v);
    const newest = Number(j.newest_known);
    if (!Number.isFinite(newest) || !next[newest]) return false;
    GAME_DAY = next;
    NEWEST_KNOWN = newest;
    return true;
  } catch (e) {
    return false;
  }
}

// Day counter for world s at time t. Worlds past NEWEST_KNOWN are projected
// on the weekly Friday cadence and flagged as estimates.
const isProjected = (s) => s > NEWEST_KNOWN;
const launchOf = (s) =>
  isProjected(s)
    ? REF - (GAME_DAY[NEWEST_KNOWN] - 1) * DAY + (s - NEWEST_KNOWN) * 7 * DAY
    : REF - (GAME_DAY[s] - 1) * DAY;
const ageOn = (s, t) => Math.floor((t - launchOf(s)) / DAY) + 1;
const groupOf = (age) => (age >= 162 ? 2 : age >= 78 ? 1 : 0);

// Known migration events (first day, UTC). Event 1 ran Jul 6; events 2–5 match
// the dates on dengsden.com. From event 5 on they repeat every 28 days, plus an
// optional day offset for projected events in case the schedule drifts.
const KNOWN_EVENTS = [
  Date.UTC(2026, 6, 6),   // 1: Jul 6
  Date.UTC(2026, 7, 24),  // 2: Aug 24
  Date.UTC(2026, 9, 3),   // 3: Oct 3
  Date.UTC(2026, 9, 31),  // 4: Oct 31
  Date.UTC(2026, 10, 28), // 5: Nov 28
];
const LAST_KNOWN = KNOWN_EVENTS.length;
const EVENT_CYCLE = 28 * DAY;
const EVENT_LENGTH = 5 * DAY;
const isKnownEvent = (n) => n <= LAST_KNOWN;
const eventStart = (n, offset = 0) =>
  n < 1 ? KNOWN_EVENTS[0]
  : isKnownEvent(n) ? KNOWN_EVENTS[n - 1]
  : KNOWN_EVENTS[LAST_KNOWN - 1] + (n - LAST_KNOWN) * EVENT_CYCLE + offset * DAY;

// SvS brackets: consecutive blocks of 4 anchored so 1097 opens a bracket
// (1097–1100, 1101–1104, … 1997–2000, …)
const svsPos = (s) => ((((s - 1097) % 4) + 4) % 4) + 1;
const svsBracket = (s) => {
  const first = s - (svsPos(s) - 1);
  return [first, first + 1, first + 2, first + 3];
};

const fmtDate = (t) =>
  new Date(t).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

// Deng's Den world pages drop the leading "10": world 1097 → /servers/97/
const dengsdenUrl = (s) => `https://dengsden.com/avatar/servers/${s - 1000}/`;

const ORD = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th" };
const ELEMENT = {
  1: { name: "Water", color: "#4FA3D1" },
  2: { name: "Earth", color: "#7FB069" },
  3: { name: "Fire", color: "#E2704A" },
  4: { name: "Air", color: "#E8C468" },
};

/* Keep the inputs in the address (e.g. ?server=1082), so a copied link opens
 * with the same inputs filled in. Empty values are left out. */
const urlParam = (k) => { try { return new URLSearchParams(location.search).get(k); } catch { return null; } };
function useShareParams(params) {
  const own = useMemo(() => { try { return location.pathname; } catch { return ""; } }, []);
  const key = JSON.stringify(params);
  useEffect(() => {
    const apply = () => {
      try {
        if (location.pathname !== own) return; // another tool is showing
        const q = new URLSearchParams();
        for (const [k, v] of Object.entries(params)) if (v !== "" && v != null && v !== false) q.set(k, v);
        const s = q.toString();
        const next = own + (s ? "?" + s : "") + location.hash;
        if (next !== location.pathname + location.search + location.hash) history.replaceState(history.state, "", next);
      } catch {}
    };
    apply();
    window.addEventListener("arc:route", apply);
    return () => window.removeEventListener("arc:route", apply);
  }, [key]);
}

/* Upper Ring (vanguard) worlds take only a few migrants. The game picks them
 * when each migration event opens; dengsden.com publishes the picks and the
 * site's daily data job saves them to /data/deng-vanguard.json. */
// "next" = dengsden.com's projected picks for the upcoming migration (the 5 worlds
// furthest above their era's average power today).
const EMBED_VANGUARD = {
  picked: "2026-10-31", worlds: [1023, 1031, 1054, 1058, 1090],
  next: { event: "2026-11-28", as_of: "2026-11-15", worlds: [1023, 1018, 1081, 1073, 1031] },
  history: { "2026-10-31": [1023, 1031, 1054, 1058, 1090] },
};
let vanguardPromise = null;
function useVanguard() {
  const [v, setV] = useState(EMBED_VANGUARD);
  useEffect(() => {
    let alive = true;
    vanguardPromise = vanguardPromise || fetch("/data/deng-vanguard.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => (j && Array.isArray(j.worlds) ? j : null))
      .catch(() => null);
    vanguardPromise.then((j) => { if (alive && j) setV(j); });
    return () => { alive = false; };
  }, []);
  return v;
}
const fmtPicked = (d) =>
  new Date(d + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/* The live table in /data/world-days.json is loaded once per page and shared
 * by every mount; `dataTick` bumps so hooks recompute once it lands. */
let worldDaysPromise = null;
function useWorldDays() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    worldDaysPromise = worldDaysPromise || loadWorldDays();
    worldDaysPromise.then((changed) => { if (alive && changed) setTick((t) => t + 1); });
    return () => { alive = false; };
  }, []);
  return tick;
}

/* ── Migration tickets ─────────────────────────────────────────────────
 * Tickets needed go by a player's highest power ever reached (table from
 * dengsden.com, refreshed daily). Players and their current power come from
 * /data/players/<world>.json (top 100 by power, refreshed daily).
 */
const EMBED_TICKETS = [
  [0, 0], [1e6, 1], [5e6, 2], [10e6, 3], [15e6, 4], [20e6, 5], [25e6, 6], [30e6, 7], [35e6, 8],
  [40e6, 9], [45e6, 10], [50e6, 11], [55e6, 12], [60e6, 14], [65e6, 16], [70e6, 18], [75e6, 20],
  [80e6, 22], [85e6, 24], [90e6, 26], [95e6, 28], [100e6, 30], [110e6, 33], [120e6, 36], [130e6, 39],
  [140e6, 42], [150e6, 45], [160e6, 48], [170e6, 51], [180e6, 54], [190e6, 57], [200e6, 60],
];
// Bundle Shop ticket bundles: tickets, price in US dollars, how many can be bought per event
const BUNDLES = [
  { t: 2, usd: 4.99, max: 1 },
  { t: 3, usd: 9.99, max: 1 },
  { t: 5, usd: 19.99, max: 1 },
  { t: 10, usd: 49.99, max: 1 },
  { t: 20, usd: 99.99, max: 3 },
];
const ALLIANCE_POINTS_PER_TICKET = 300000; // Alliance Shop, individual alliance points
const BUNDLE_MAX_TICKETS = BUNDLES.reduce((a, b) => a + b.t * b.max, 0);

function useTicketTable() {
  const [table, setTable] = useState(EMBED_TICKETS);
  useEffect(() => {
    let alive = true;
    fetch("/data/deng-tickets.json", { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (alive && d.tickets?.length) setTable(d.tickets.map((x) => [Number(x.from), Number(x.tickets)])); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return table;
}
const ticketsFor = (table, power) => {
  let n = 0;
  for (const [from, t] of table) if (power >= from) n = t;
  return n;
};

// Cheapest set of bundles giving at least `need` tickets: lowest cost, then fewest spare tickets.
function cheapestBundles(need) {
  if (need <= 0) return { usd: 0, tickets: 0, pick: [] };
  let best = null;
  const walk = (i, counts) => {
    if (i === BUNDLES.length) {
      const tickets = counts.reduce((a, c, k) => a + c * BUNDLES[k].t, 0);
      if (tickets < need) return;
      const usd = counts.reduce((a, c, k) => a + c * BUNDLES[k].usd, 0);
      if (!best || usd < best.usd - 1e-9 || (Math.abs(usd - best.usd) < 1e-9 && tickets < best.tickets))
        best = { usd, tickets, pick: counts.slice() };
      return;
    }
    for (let c = 0; c <= BUNDLES[i].max; c++) { counts[i] = c; walk(i + 1, counts); }
  };
  walk(0, []);
  if (best) return { ...best, pick: best.pick.map((c, k) => ({ ...BUNDLES[k], count: c })).filter((b) => b.count) };
  // more than every bundle together: buy them all, the rest has to come from the Alliance Shop
  return {
    usd: BUNDLES.reduce((a, b) => a + b.usd * b.max, 0),
    tickets: BUNDLE_MAX_TICKETS,
    pick: BUNDLES.map((b) => ({ ...b, count: b.max })),
    short: need - BUNDLE_MAX_TICKETS,
  };
}

function usePlayers(world) {
  const [state, setState] = useState({ world: null, players: null, asOf: null });
  useEffect(() => {
    if (!(world >= 1001)) return;
    let alive = true;
    setState({ world, players: null, asOf: null });
    fetch(`/data/players/${world}.json`, { cache: "no-cache" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { if (alive) setState({ world, players: d.players || [], asOf: d.as_of || null }); })
      .catch(() => { if (alive) setState({ world, players: [], asOf: null }); });
    return () => { alive = false; };
  }, [world]);
  return state.world === world ? state : { world, players: null, asOf: null };
}

const fmtPower = (p) => (p >= 1e6 ? (p / 1e6).toFixed(p >= 1e8 ? 0 : 1).replace(/\.0$/, "") + "M" : p >= 1e3 ? Math.round(p / 1e3) + "K" : String(p));
const parsePower = (s) => {
  const m = String(s).trim().toLowerCase().replace(/,/g, "").match(/^(\d+(?:\.\d+)?)\s*([kmb]?)$/);
  if (!m) return null;
  return Math.round(parseFloat(m[1]) * ({ k: 1e3, m: 1e6, b: 1e9 }[m[2]] || 1));
};

/* Summary picture of the ticket list: drawn on a canvas, sized so it stays
 * close to 5:4 however many players there are (1 to 4 columns). */
function drawTicketImage({ world, rows, totals, money }) {
  const S = 2; // pixel density
  const C = {
    bg: "#0E1116", panel: "#161A21", raise: "#1C222B", line: "#232934", text: "#E8EAEE",
    mut: "#8B93A1", dim: "#5F6774", ok: "#5FD394", okSoft: "#173326", accent: "#7EA0FF", gold: "#F4BF41",
  };
  const F = '"Geist", Inter, system-ui, sans-serif';
  const n = rows.length;
  const PAD = 48, COL_W = 440, GAP = 24, ROW_H = 46, HEAD_H = 236, COLHEAD_H = 34, FOOT_H = 64;
  let best = null;
  for (let cols = 1; cols <= 4; cols++) {
    if (cols > 1 && n <= (cols - 1) * 6) break;
    const per = Math.ceil(n / cols);
    const W = Math.max(960, PAD * 2 + cols * COL_W + (cols - 1) * GAP);
    const H = HEAD_H + COLHEAD_H + per * ROW_H + FOOT_H;
    const score = Math.abs(Math.log((W / H) / 1.25));
    if (!best || score < best.score) best = { cols, per, W, H, score };
  }
  const { cols, per, W, H } = best;
  const colW = (W - PAD * 2 - (cols - 1) * GAP) / cols;

  const cv = document.createElement("canvas");
  cv.width = W * S; cv.height = H * S;
  const g = cv.getContext("2d");
  g.scale(S, S);
  const txt = (s, x, y, { size = 16, weight = 400, color = C.text, align = "left", max } = {}) => {
    g.font = `${weight} ${size}px ${F}`; g.fillStyle = color; g.textAlign = align; g.textBaseline = "middle";
    let t = String(s);
    if (max && g.measureText(t).width > max) { while (t.length > 1 && g.measureText(t + "…").width > max) t = t.slice(0, -1); t += "…"; }
    g.fillText(t, x, y);
    return g.measureText(t).width;
  };
  const rr = (x, y, w, h, r, fill) => { g.beginPath(); g.roundRect(x, y, w, h, r); g.fillStyle = fill; g.fill(); };

  // background
  g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
  const glow = g.createRadialGradient(W, 0, 0, W, 0, 700);
  glow.addColorStop(0, "rgba(90,159,230,0.16)"); glow.addColorStop(1, "rgba(90,159,230,0)");
  g.fillStyle = glow; g.fillRect(0, 0, W, H);

  // header
  g.save(); g.translate(PAD, 44);
  g.beginPath(); g.moveTo(11, 0); g.lineTo(22, 11); g.lineTo(11, 22); g.lineTo(0, 11); g.closePath(); g.fillStyle = C.gold; g.fill();
  g.beginPath(); g.moveTo(11, 6); g.lineTo(16, 11); g.lineTo(11, 16); g.lineTo(6, 11); g.closePath(); g.fillStyle = C.bg; g.fill();
  g.restore();
  txt("ARC Tools · Migration Scout", PAD + 34, 55, { size: 18, weight: 600, color: C.mut });
  const day = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  txt(day, W - PAD, 55, { size: 18, color: C.mut, align: "right" });
  txt(`Migration tickets · World ${world}`, PAD, 108, { size: 40, weight: 700 });

  const stats = [["People", String(n)], ...(totals.shop ? [["From Alliance Shop", String(totals.shop)]] : []),
    ["Tickets to buy", String(totals.short)], ["Total cost", money(totals.usd)]];
  let sx = PAD;
  for (const [k, v] of stats) {
    txt(k, sx, 160, { size: 15, weight: 500, color: C.mut });
    const w = txt(v, sx, 192, { size: 28, weight: 700 });
    sx += Math.max(w, g.measureText(k).width) + 44;
  }

  // columns: name | needed | shop | buy | cost
  const nums = [["Needed", 58], ["Shop", 52], ["Buy", 48], ["Cost", 92]];
  const numW = nums.reduce((a, x) => a + x[1], 0);
  for (let c = 0; c < cols; c++) {
    const x0 = PAD + c * (colW + GAP), y0 = HEAD_H;
    const list = rows.slice(c * per, (c + 1) * per);
    if (!list.length) continue;
    rr(x0, y0, colW, COLHEAD_H + list.length * ROW_H, 12, C.panel);
    txt("Player", x0 + 14, y0 + COLHEAD_H / 2 + 1, { size: 13, weight: 500, color: C.mut });
    let nx = x0 + colW - 14;
    for (let i = nums.length - 1; i >= 0; i--) { txt(nums[i][0], nx, y0 + COLHEAD_H / 2 + 1, { size: 13, weight: 500, color: C.mut, align: "right" }); nx -= nums[i][1]; }
    list.forEach((r, i) => {
      const y = y0 + COLHEAD_H + i * ROW_H, cy = y + ROW_H / 2;
      const done = r.short === 0;
      if (done) {
        g.fillStyle = C.okSoft;
        g.beginPath(); g.roundRect(x0, y, colW, ROW_H, i === list.length - 1 ? [0, 0, 12, 12] : 0); g.fill();
        g.fillStyle = C.ok; g.fillRect(x0, y, 3, ROW_H);
      }
      g.fillStyle = C.line; g.fillRect(x0, y, colW, 1);
      const tag = r.listed?.[1] ? `[${r.listed[1]}] ` : "";
      const nameMax = colW - 28 - numW;
      let tx = x0 + 14;
      if (tag) tx += txt(tag, tx, cy, { size: 15, color: C.mut, max: nameMax });
      txt(r.name, tx, cy, { size: 15, weight: 500, max: Math.max(20, nameMax - (tx - x0 - 14)) });
      let cx = x0 + colW - 14;
      const vals = [
        [r.need ?? "—", C.text, 400],
        [r.fromShop || (r.need == null ? "—" : 0), r.fromShop ? C.ok : C.dim, r.fromShop ? 600 : 400],
        [done ? "✓" : r.short ?? "—", done ? C.ok : C.text, 700],
        [r.buy && r.buy.usd ? money(r.buy.usd) : "—", r.buy && r.buy.usd ? C.text : C.dim, 500],
      ];
      for (let k = vals.length - 1; k >= 0; k--) { txt(vals[k][0], cx, cy, { size: 15, weight: vals[k][2], color: vals[k][1], align: "right" }); cx -= nums[k][1]; }
    });
  }

  // footer
  txt("Shop = Alliance Shop tickets (300,000 points each) · Buy = tickets from Bundle Shop bundles · Prices in US dollars",
    PAD, H - 34, { size: 13.5, color: C.dim, max: W - PAD * 2 - 230 });
  txt("zephyrus44.github.io", W - PAD, H - 34, { size: 14, color: C.mut, align: "right" });
  return cv;
}

async function saveTicketImage(opts) {
  try { await document.fonts.load('600 16px "Geist"'); await document.fonts.load('700 16px "Geist"'); } catch {}
  const cv = drawTicketImage(opts);
  const blob = await new Promise((res) => cv.toBlob(res, "image/png"));
  if (!blob) return "error";
  const name = `migration-tickets-${opts.world}.png`;
  const file = new File([blob], name, { type: "image/png" });
  const touch = window.matchMedia && matchMedia("(pointer: coarse)").matches;
  if (touch && navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return "shared"; } catch (e) { if (e && e.name === "AbortError") return "cancelled"; }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return "saved";
}
async function copyTicketImage(opts) {
  try { await document.fonts.load('600 16px "Geist"'); } catch {}
  const cv = drawTicketImage(opts);
  const blob = await new Promise((res) => cv.toBlob(res, "image/png"));
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}

function TicketCalc({ world, people, setPeople }) {
  const table = useTicketTable();
  const { players, asOf } = usePlayers(world);
  const [q, setQ] = useState("");
  const [ally, setAlly] = useState("");
  const [addName, setAddName] = useState("");
  const [addPower, setAddPower] = useState("");
  const [imgMsg, setImgMsg] = useState("");
  const [findQ, setFindQ] = useState("");
  const [hideDone, setHideDone] = useState(false);
  const canCopyImage = typeof window !== "undefined" && !!(navigator.clipboard && window.ClipboardItem) && !(window.matchMedia && matchMedia("(pointer: coarse)").matches);

  const money = (usd) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(usd);

  const byName = useMemo(() => new Map((players || []).map((p) => [p[0], p])), [players]);
  const alliances = useMemo(() => {
    const m = new Map();
    for (const p of players || []) if (p[1]) m.set(p[1], (m.get(p[1]) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [players]);
  const chosen = new Set(people.map((p) => p.name));
  const nq = q.trim().toLowerCase();
  const list = (players || []).filter((p) => (!ally || p[1] === ally) && (!nq || (p[0] + " " + p[1]).toLowerCase().includes(nq)));

  const rows = people.map((p) => {
    const listed = byName.get(p.name);
    const power = p.power ?? (listed ? listed[2] : null);
    const need = power != null ? ticketsFor(table, power) : null;
    const fromShop = need != null ? Math.min(Math.floor((p.pts || 0) / ALLIANCE_POINTS_PER_TICKET), Math.max(0, need - (p.has || 0))) : 0;
    const short = need != null ? Math.max(0, need - (p.has || 0) - fromShop) : null;
    const buy = short != null ? cheapestBundles(short) : null;
    return { ...p, listed, power, need, fromShop, short, buy };
  });
  const totalShop = rows.reduce((a, r) => a + (r.fromShop || 0), 0);
  const totalShort = rows.reduce((a, r) => a + (r.short || 0), 0);
  const totalUsd = rows.reduce((a, r) => a + (r.buy ? r.buy.usd : 0), 0);
  // the find box and "hide covered" only filter what's shown; totals and the image use everyone
  const fq = findQ.trim().toLowerCase();
  const shown = rows.filter((r) => (!hideDone || r.short !== 0) && (!fq || (r.name + " " + (r.listed?.[1] || "")).toLowerCase().includes(fq)));
  const imgOpts = () => ({ world, rows, totals: { shop: rows.reduce((a, r) => a + (r.fromShop || 0), 0), short: rows.reduce((a, r) => a + (r.short || 0), 0), usd: totalUsd }, money });

  const update = (name, patch) => setPeople(people.map((p) => (p.name === name ? { ...p, ...patch } : p)));
  const toggle = (p) => setPeople(chosen.has(p[0]) ? people.filter((x) => x.name !== p[0]) : [...people, { name: p[0], has: 0 }]);
  const addMany = (ps) => setPeople([...people, ...ps.filter((p) => !chosen.has(p[0])).map((p) => ({ name: p[0], has: 0 }))]);
  const addManual = () => {
    const name = addName.trim(), power = parsePower(addPower);
    if (!name || power == null || chosen.has(name)) return;
    setPeople([...people, { name, has: 0, power }]);
    setAddName(""); setAddPower("");
  };

  if (!(world >= 1001)) return <div className="ms-card ms-warn">Enter a server number (1001 or higher).</div>;

  // inputs shared by the table (wide screens) and the cards (phones)
  const nameEl = (r) => <span className="ms-tk-name">{r.listed?.[1] && <span className="ms-tk-tag">[{r.listed[1]}]</span>}{r.name}</span>;
  const powerIn = (r, cls = "") => (
    <input className={"ms-input ms-tk-cell " + cls} style={cls ? null : { width: 82 }} defaultValue={r.power != null ? fmtPower(r.power) : ""}
      key={r.name + ":" + (r.power ?? "")} inputMode="decimal"
      onBlur={(e) => { const v = parsePower(e.target.value); if (v != null && v !== r.power) update(r.name, { power: v }); else e.target.value = r.power != null ? fmtPower(r.power) : ""; }}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      title="Highest power ever reached. Listed players start at today's power." />
  );
  const hasIn = (r, cls = "") => (
    <input className={"ms-input ms-tk-cell " + cls} style={cls ? { textAlign: "center" } : { width: 56, textAlign: "center" }} inputMode="numeric"
      value={r.has || ""} placeholder="0"
      onChange={(e) => update(r.name, { has: parseInt(e.target.value.replace(/\D/g, ""), 10) || 0 })} />
  );
  // alliance points: digits only, shown with commas as you type (1,300,000)
  const ptsIn = (r, cls = "") => (
    <input className={"ms-input ms-tk-cell " + cls} style={cls ? null : { width: 104 }} placeholder="0" inputMode="numeric"
      value={r.pts ? r.pts.toLocaleString("en-US") : ""}
      onChange={(e) => {
        const el = e.target, caret = el.selectionStart ?? el.value.length;
        const digitsBefore = el.value.slice(0, caret).replace(/\D/g, "").length;
        const v = parseInt(el.value.replace(/\D/g, "").slice(0, 12), 10) || 0;
        update(r.name, { pts: v });
        // keep the caret after the same digit once commas are added or removed
        requestAnimationFrame(() => {
          try {
            let i = 0, seen = 0;
            while (i < el.value.length && seen < digitsBefore) { if (/\d/.test(el.value[i])) seen++; i++; }
            el.setSelectionRange(i, i);
          } catch {}
        });
      }}
      title="Individual alliance points. 300,000 buys 1 ticket in the Alliance Shop." />
  );
  const bundleText = (r) => (r.buy && r.buy.pick.length ? r.buy.pick.map((b) => `${b.t}${b.count > 1 ? " ×" + b.count : ""}`).join(", ") : "");
  const removeBtn = (r) => <button className="ms-tk-x" aria-label={"Remove " + r.name} onClick={() => setPeople(people.filter((p) => p.name !== r.name))}>×</button>;

  return (
    <>
      <div className="ms-card">
        <div className="ms-tk-head">
          <div>
            <div className="ms-tk-h">Players on {world}</div>
            <div className="ms-tk-sub">
              {players === null ? "Loading…" : players.length
                ? `Top ${players.length} by power${asOf ? ", " + fmtDate(Date.parse(asOf + "T00:00:00Z")) : ""}. Pick people, or a whole alliance.`
                : "No player list for this server yet. Add people by hand below."}
            </div>
          </div>
          {!!players?.length && (
            <input className="ms-input ms-tk-search" placeholder="Search name or alliance" value={q} onChange={(e) => setQ(e.target.value)} />
          )}
        </div>
        {!!alliances.length && (
          <div className="ms-chips" style={{ marginTop: 14 }}>
            <button className={"ms-chip" + (!ally ? " on" : "")} style={!ally ? { background: "var(--arc-text, #E8EAEE)" } : null} onClick={() => setAlly("")}>All</button>
            {alliances.slice(0, 12).map(([tag, n]) => (
              <button key={tag} className={"ms-chip" + (ally === tag ? " on" : "")} style={ally === tag ? { background: "var(--arc-text, #E8EAEE)" } : null}
                onClick={() => setAlly(ally === tag ? "" : tag)}>
                {tag} <span className="ms-tk-n">{n}</span>
              </button>
            ))}
          </div>
        )}
        {!!list.length && (
          <>
            <div className="ms-tk-list">
              {list.map((p) => (
                <label key={p[0]} className={"ms-tk-p" + (chosen.has(p[0]) ? " on" : "")}>
                  <input type="checkbox" checked={chosen.has(p[0])} onChange={() => toggle(p)} />
                  <span className="ms-tk-name">{p[1] && <span className="ms-tk-tag">[{p[1]}]</span>}{p[0]}</span>
                  <span className="ms-tk-pw">{fmtPower(p[2])}</span>
                </label>
              ))}
            </div>
            <div className="ms-row" style={{ marginTop: 12, flexWrap: "wrap" }}>
              <button className="ms-btn" onClick={() => addMany(list)}>
                Add all {list.length}{ally ? " in " + ally : nq ? " shown" : ""}
              </button>
              {!!people.length && <button className="ms-btn ghost" onClick={() => setPeople([])}>Clear selection</button>}
            </div>
          </>
        )}
        <div className="ms-tk-add">
          <input className="ms-input" placeholder="Name (not listed)" value={addName} onChange={(e) => setAddName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addManual()} />
          <input className="ms-input" placeholder="Power, e.g. 62M" value={addPower} onChange={(e) => setAddPower(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addManual()} style={{ width: 190 }} />
          <button className="ms-btn" onClick={addManual} disabled={!addName.trim() || parsePower(addPower) == null}>Add</button>
        </div>
      </div>

      {!!rows.length && (
        <div className="ms-card">
          <div className="ms-tk-head">
            <div className="ms-stats">
              <div className="ms-stat"><div className="k">People</div><div className="v">{rows.length}</div></div>
              {!!totalShop && <div className="ms-stat"><div className="k">From Alliance Shop</div><div className="v">{totalShop}</div></div>}
              <div className="ms-stat"><div className="k">Tickets to buy</div><div className="v">{totalShort}</div></div>
              <div className="ms-stat"><div className="k">Total cost</div><div className="v">{money(totalUsd)}</div></div>
            </div>
            <div className="ms-row ms-tk-imgbtns">
              {canCopyImage && (
                <button className="ms-btn" onClick={async () => {
                  try { await copyTicketImage(imgOpts()); setImgMsg("Image copied"); } catch { setImgMsg("Couldn't copy, use Save image"); }
                  setTimeout(() => setImgMsg(""), 2500);
                }}>Copy image</button>
              )}
              <button className="ms-btn" onClick={async () => {
                const r = await saveTicketImage(imgOpts());
                setImgMsg(r === "saved" ? "Image saved" : r === "error" ? "Couldn't make the image" : "");
                setTimeout(() => setImgMsg(""), 2500);
              }}>{canCopyImage ? "Save image" : "Share image"}</button>
              {imgMsg && <span className="ms-tk-sub" style={{ marginTop: 0 }}>{imgMsg}</span>}
            </div>
          </div>
          {rows.length > 5 && (
            <div className="ms-tk-find">
              <input className="ms-input" type="search" placeholder={`Find in your ${rows.length} players`} value={findQ}
                onChange={(e) => setFindQ(e.target.value)} />
              <label className="ms-tk-hide">
                <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} />
                Hide covered
              </label>
            </div>
          )}
          {rows.length > 5 && !shown.length && (
            <div className="ms-tk-sub" style={{ marginTop: 14 }}>No players match.</div>
          )}
          <div className="ms-scroll ms-tk-scroll" style={{ marginTop: 16, display: shown.length ? null : "none" }}>
            <table className="ms-table ms-tk-table">
              <thead>
                <tr><th>Player</th><th>Highest power</th><th style={{ textAlign: "right" }}>Needed</th><th>Has</th><th>Alliance points<div className="ms-tk-th2">300,000 = 1 ticket</div></th><th style={{ textAlign: "right" }}>Alliance<br />Shop</th><th style={{ textAlign: "right" }}>To buy</th><th>Bundles<div className="ms-tk-th2">tickets each</div></th><th style={{ textAlign: "right" }}>Cost</th><th></th></tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={r.name} className={r.short === 0 ? "ms-tk-done" : ""}>
                    <td>{nameEl(r)}</td>
                    <td>{powerIn(r)}</td>
                    <td style={{ textAlign: "right" }}>{r.need ?? "—"}</td>
                    <td>{hasIn(r)}</td>
                    <td>{ptsIn(r)}</td>
                    <td style={{ textAlign: "right" }} className={r.fromShop ? "ms-tk-shop" : ""}>{r.need == null ? "—" : r.fromShop}</td>
                    <td style={{ textAlign: "right", fontWeight: 600, color: r.short ? "var(--arc-text, #E8EAEE)" : "var(--arc-ok, #5FD394)" }}>
                      {r.short == null ? "—" : r.short || "✓"}
                    </td>
                    <td className="ms-tk-bundles">
                      {bundleText(r) || "—"}
                      {r.buy?.short ? <div className="ms-tk-warn">{r.buy.short} more than bundles can cover</div> : null}
                    </td>
                    <td style={{ textAlign: "right" }}>{r.buy && r.buy.usd ? money(r.buy.usd) : "—"}</td>
                    <td style={{ textAlign: "right" }}>{removeBtn(r)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ms-tk-cards">
            {shown.map((r) => (
              <div key={r.name} className={"ms-tk-c" + (r.short === 0 ? " done" : "")}>
                <div className="ms-tk-c-top">
                  {nameEl(r)}
                  {r.short === 0 && <span className="ms-tk-c-res">✓ Covered</span>}
                  {removeBtn(r)}
                </div>
                <div className="ms-tk-c-nums">
                  <div><span>Needed</span><b>{r.need ?? "—"}</b></div>
                  <div><span>Alliance Shop</span><b className={r.fromShop ? "ms-tk-shop" : ""}>{r.need == null ? "—" : r.fromShop}</b><i>300,000 pts each</i></div>
                  <div><span>To buy</span><b>{r.short ?? "—"}</b>{r.buy?.usd ? <i>{money(r.buy.usd)}</i> : null}</div>
                </div>
                <div className="ms-tk-c-grid">
                  <label><span>Highest power</span>{powerIn(r, "full")}</label>
                  <label><span>Has</span>{hasIn(r, "full")}</label>
                  <label><span>Alliance points</span>{ptsIn(r, "full")}</label>
                </div>
                {(bundleText(r) || r.buy?.short) ? (
                  <div className="ms-tk-c-foot">
                    {bundleText(r) ? <>Bundles to buy (tickets each): {bundleText(r)}</> : null}
                    {r.buy?.short ? <span className="ms-tk-warn"> · {r.buy.short} more than bundles can cover</span> : null}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="ms-note">
        Tickets needed go by a player's <b>highest power ever reached</b>, not today's power, so listed players start
        at today's power: change it if their highest was more. Each player buys their own bundles. The Bundle Shop has
        2, 3, 5 and 10 ticket bundles ({BUNDLES.slice(0, 4).map((b) => money(b.usd)).join(", ")}) once each per migration,
        and the 20 ticket bundle ({money(99.99)}) up to 3 times; the table picks the cheapest mix that covers what's missing.
        Tickets also come from the Alliance Shop for 300,000 individual alliance points each: enter a player's points
        and the tickets they can get there are counted before bundles.
        Prices are in US dollars.{" "}
        Ticket table and player power from{" "}
        <a className="ms-link" href="https://dengsden.com/avatar/migration/" target="_blank" rel="noopener">dengsden.com</a>.
      </div>
    </>
  );
}

export default function MigrationScout() {
  const dataTick = useWorldDays();
  const vanguard = useVanguard();
  // Default event = live event if one is running, otherwise the next one
  const defaultEvent = useMemo(() => {
    const now = Date.now();
    for (let n = 1; n < 1000; n++) if (now < eventStart(n, 0) + EVENT_LENGTH) return n;
    return 1;
  }, []);

  const num = (k) => { const v = parseInt(urlParam(k), 10); return Number.isFinite(v) ? v : null; };
  // the ticket list is also remembered on this device, for opening the tool again without a link
  const savedTk = useMemo(() => {
    try {
      const v = JSON.parse(localStorage.getItem("ms-tickets") || "null");
      if (!v || urlParam("p")) return null;
      if (num("server") && String(num("server")) !== v.server) return null;
      if (urlParam("tab") && urlParam("tab") !== "tickets" && !num("server")) return null;
      return v;
    } catch { return null; }
  }, []);
  const [serverStr, setServerStr] = useState(() => (num("server") ? String(num("server")) : savedTk?.server || "1097"));
  const [eventN, setEventN] = useState(() => (num("event") >= 1 ? num("event") : defaultEvent));
  const [offset, setOffset] = useState(() => num("offset") ?? 0);
  const [posFilter, setPosFilter] = useState(() => num("pos") ?? 0); // 0 = all
  const [tab, setTab] = useState(() => (urlParam("tab") === "tickets" || (!urlParam("tab") && !location.search && savedTk?.tab === "tickets") ? "tickets" : "worlds"));
  // ticket calculator: people as [name, has, highest power if typed in, alliance points]
  const [people, setPeople] = useState(() => {
    try {
      const v = urlParam("p") ? JSON.parse(urlParam("p")) : savedTk?.people || [];
      return Array.isArray(v) ? v.filter((x) => Array.isArray(x) && typeof x[0] === "string")
        .map((x) => ({ name: x[0], has: Math.max(0, parseInt(x[1], 10) || 0), power: Number.isFinite(x[2]) ? x[2] : null, pts: Number.isFinite(x[3]) ? x[3] : 0 })) : [];
    } catch { return []; }
  });
  useEffect(() => {
    try {
      localStorage.setItem("ms-tickets", JSON.stringify({
        tab, server: serverStr,
        people: people.map((x) => [x.name, x.has || 0, x.power ?? null, x.pts || 0]),
      }));
    } catch {}
  }, [tab, serverStr, people]);
  useShareParams(tab === "tickets" ? {
    tab: "tickets",
    server: serverStr,
    p: people.length ? JSON.stringify(people.map((x) => x.pts ? [x.name, x.has || 0, x.power ?? null, x.pts] : x.power != null ? [x.name, x.has || 0, x.power] : [x.name, x.has || 0])) : "",
  } : {
    server: serverStr,
    event: eventN !== defaultEvent ? eventN : "",
    offset: offset || "",
    pos: posFilter || "",
  });

  const server = parseInt(serverStr, 10);
  const validServer = Number.isFinite(server) && server >= 1001;

  const start = eventStart(eventN, offset);
  // Which Vanguard list applies to this event: the next migration and later ones use
  // dengsden.com's projected picks (☆); earlier ones use the actual picks (★), taking
  // the latest pick made on or before the event from the saved history.
  const vg = (() => {
    const nx = vanguard.next;
    if (nx && Array.isArray(nx.worlds) && start >= Date.parse(nx.event + "T00:00:00Z"))
      return { kind: "next", worlds: nx.worlds, event: nx.event, as_of: nx.as_of };
    const hist = Object.entries(vanguard.history || {})
      .filter(([d]) => Date.parse(d + "T00:00:00Z") <= start)
      .sort(([a], [b]) => (a < b ? -1 : 1));
    if (hist.length) { const [picked, worlds] = hist[hist.length - 1]; return { kind: "now", worlds, picked }; }
    return { kind: "now", worlds: vanguard.worlds || [], picked: vanguard.picked };
  })();
  const isVg = (s) => vg.worlds.includes(s);
  const vgMark = (s, style) => !isVg(s) ? null : vg.kind === "next"
    ? <span className="ms-vg next" style={style} title={`Projected Vanguard world for the ${fmtPicked(vg.event)} migration (dengsden.com estimate)`} aria-label="Projected Vanguard world">☆</span>
    : <span className="ms-vg" style={style} title="Vanguard (Upper Ring) world: takes only a few migrants" aria-label="Vanguard world">★</span>;
  const lastDay = start + EVENT_LENGTH - DAY;
  const now = Date.now();
  const status =
    now < start ? "Upcoming" : now < start + EVENT_LENGTH ? "Live now" : "Ended";

  const result = useMemo(() => {
    if (!validServer) return null;
    const launch = launchOf(server);
    const age = ageOn(server, start);
    if (age < 1) return { launch, age, state: "unlaunched" };
    const group = groupOf(age);
    if (group === 0) {
      // First event where this server reaches age 78
      let firstN = eventN;
      for (let n = 1; n <= 600; n++) {
        if (ageOn(server, eventStart(n, offset)) >= 78) { firstN = n; break; }
      }
      return { launch, age, state: "young", firstN };
    }
    // All servers in the same group at this event
    const launchedNewest = launchOf(NEWEST_KNOWN);
    const newest =
      NEWEST_KNOWN +
      Math.max(0, Math.floor((start - launchedNewest) / (7 * DAY)));
    const list = [];
    for (let s = 1001; s <= newest; s++) {
      const a = ageOn(s, start);
      if (a >= 1 && groupOf(a) === group) {
        list.push({ s, age: a, pos: svsPos(s), launch: launchOf(s), est: isProjected(s) });
      }
    }
    return { launch, age, group, list, state: "ok" };
  }, [server, validServer, start, eventN, offset, dataTick]);

  const filtered =
    result?.list?.filter((r) => posFilter === 0 || r.pos === posFilter) ?? [];

  const css = `
    .ms-root { min-height: 100vh; background: var(--arc-bg, #0E1116); color: var(--arc-text, #E8EAEE);
      font-family: var(--arc-font, "Geist", Inter, system-ui, sans-serif); font-size: 14px; line-height: 1.5;
      padding: 48px 40px 72px; -webkit-font-smoothing: antialiased; }
    .ms-root * { box-sizing: border-box; }
    .ms-root button { font-family: inherit; }
    .ms-wrap { max-width: 880px; margin: 0 auto; }
    .ms-eyebrow { display: none; }
    .ms-title { font-size: 32px; font-weight: 700; letter-spacing: -0.03em; line-height: 1.1; margin: 0 0 8px; }
    .ms-sub { color: var(--arc-mut, #8B93A1); font-size: 15px; max-width: 62ch; margin-bottom: 28px; }
    .ms-card { background: var(--arc-panel, #161A21); border: 1px solid var(--arc-line, #232934); border-radius: 14px;
      padding: 20px; margin-bottom: 16px; }
    .ms-controls { display: flex; flex-wrap: wrap; gap: 20px 28px; }
    .ms-field label { display: block; font-size: 13px; font-weight: 500; color: var(--arc-mut, #8B93A1); margin-bottom: 8px; }
    .ms-input { background: var(--arc-bg, #0E1116); border: 1px solid var(--arc-line-2, #2E3542); color: var(--arc-text, #E8EAEE);
      border-radius: 10px; padding: 0 12px; height: 40px; width: 130px;
      font: 500 16px/1 var(--arc-font, "Geist", Inter, system-ui, sans-serif); font-variant-numeric: tabular-nums; color-scheme: dark;
      transition: border-color .15s, box-shadow .15s; }
    .ms-input:focus { outline: none; border-color: var(--arc-accent, #7EA0FF); box-shadow: 0 0 0 3px var(--arc-accent-soft, #1D2640); }
    .ms-status { display: inline-flex; align-items: center; height: 22px; padding: 0 9px; border-radius: 999px;
      border: 1px solid var(--arc-line-2, #2E3542); color: var(--arc-mut, #8B93A1); font-size: 12px; font-weight: 500; vertical-align: middle; }
    .ms-status.live { color: var(--arc-ok, #5FD394); border-color: color-mix(in srgb, var(--arc-ok, #5FD394) 45%, transparent); }
    .ms-status.upcoming { color: var(--arc-accent, #7EA0FF); border-color: color-mix(in srgb, var(--arc-accent, #7EA0FF) 45%, transparent); }
    .ms-stats { display: flex; gap: 18px 32px; flex-wrap: wrap; }
    .ms-stat .k { font-size: 12.5px; font-weight: 500; color: var(--arc-mut, #8B93A1); }
    .ms-stat .v { font-size: 17px; font-weight: 600; letter-spacing: -0.01em; margin-top: 4px; font-variant-numeric: tabular-nums; }
    .ms-seg { display: inline-flex; padding: 3px; gap: 2px; border-radius: 10px; background: var(--arc-bg, #0E1116);
      border: 1px solid var(--arc-line-2, #2E3542); margin-bottom: 16px; }
    .ms-seg button { border: 0; background: transparent; color: var(--arc-mut, #8B93A1); font-size: 13.5px; font-weight: 500;
      height: 34px; padding: 0 16px; border-radius: 7px; cursor: pointer; }
    .ms-seg button.on { background: var(--arc-raise, #1C222B); color: var(--arc-text, #E8EAEE); }
    .ms-btn { height: 36px; padding: 0 14px; border-radius: 10px; border: 1px solid var(--arc-line-2, #2E3542);
      background: var(--arc-raise, #1C222B); color: var(--arc-text, #E8EAEE); font-size: 13.5px; font-weight: 500; cursor: pointer; }
    .ms-btn:hover { background: var(--arc-hover, #212833); }
    .ms-btn:disabled { opacity: .45; cursor: default; }
    .ms-btn.ghost { background: transparent; color: var(--arc-mut, #8B93A1); }
    .ms-tk-head { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 14px 24px; }
    .ms-tk-h { font-size: 15px; font-weight: 600; }
    .ms-tk-sub { color: var(--arc-mut, #8B93A1); font-size: 13.5px; margin-top: 2px; }
    .ms-tk-search { width: 240px; }
    .ms-tk-n { opacity: .6; margin-left: 4px; font-weight: 500; }
    .ms-tk-list { margin-top: 14px; display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 4px 10px;
      max-height: 300px; overflow-y: auto; padding: 2px; }
    .ms-tk-p { display: flex; align-items: center; gap: 10px; min-height: 36px; padding: 0 10px; border-radius: 8px; cursor: pointer; font-size: 13.5px; }
    .ms-tk-p:hover { background: var(--arc-raise, #1C222B); }
    .ms-tk-p.on { background: var(--arc-accent-soft, #1D2640); }
    .ms-tk-p input { accent-color: var(--arc-accent, #7EA0FF); margin: 0; flex: none; }
    .ms-tk-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .ms-tk-tag { color: var(--arc-mut, #8B93A1); margin-right: 5px; }
    .ms-tk-pw { color: var(--arc-mut, #8B93A1); font-variant-numeric: tabular-nums; }
    .ms-tk-add { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--arc-line, #232934); }
    .ms-tk-add .ms-input:first-child { flex: 1 1 180px; width: auto; }
    .ms-tk-scroll { overflow-x: auto; }
    .ms-tk-table { min-width: 740px; }
    .ms-tk-table td { vertical-align: middle; }
    .ms-tk-table th { white-space: nowrap; vertical-align: bottom; }
    .ms-tk-table th, .ms-tk-table td { padding-left: 10px; padding-right: 10px; }
    .ms-tk-table td.ms-tk-name { max-width: 200px; }
    .ms-tk-cell { height: 34px; font-size: 14px; padding: 0 8px; }
    .ms-tk-table tr.ms-tk-done td { background: var(--arc-ok-soft, #173326); }
    .ms-tk-table tr.ms-tk-done:hover td { background: color-mix(in srgb, var(--arc-ok, #5FD394) 18%, var(--arc-panel, #161A21)); }
    .ms-tk-table tr.ms-tk-done td:first-child { box-shadow: inset 3px 0 0 var(--arc-ok, #5FD394); }
    .ms-tk-bundles { color: var(--arc-mut, #8B93A1); font-size: 13px; }
    .ms-tk-shop { color: var(--arc-ok, #5FD394); font-weight: 600; }
    .ms-wide { max-width: 1120px; }
    .ms-wide > .ms-sub, .ms-wide > .ms-note { max-width: 72ch; }
    .ms-tk-imgbtns { gap: 8px; flex-wrap: wrap; align-items: center; }
    .ms-tk-find { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 16px; margin-top: 16px; }
    .ms-tk-find .ms-input { flex: 1 1 220px; width: auto; max-width: 360px; }
    .ms-tk-hide { display: flex; align-items: center; gap: 8px; font-size: 13.5px; color: var(--arc-mut, #8B93A1); cursor: pointer; }
    .ms-tk-hide input { accent-color: var(--arc-accent, #7EA0FF); margin: 0; }
    .ms-tk-cards { display: none; }
    .ms-tk-c { border: 1px solid var(--arc-line, #232934); border-radius: 12px; background: var(--arc-bg, #0E1116); padding: 12px 12px 12px 14px; }
    .ms-tk-c.done { background: var(--arc-ok-soft, #173326); border-color: color-mix(in srgb, var(--arc-ok, #5FD394) 40%, transparent);
      box-shadow: inset 3px 0 0 var(--arc-ok, #5FD394); }
    .ms-tk-c-top { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; }
    .ms-tk-c-top .ms-tk-tag { font-weight: 500; }
    .ms-tk-c-res { flex: none; font-size: 13.5px; font-weight: 500; color: var(--arc-mut, #8B93A1); }
    .ms-tk-c-res b { color: var(--arc-text, #E8EAEE); font-weight: 600; }
    .ms-tk-c.done .ms-tk-c-res { color: var(--arc-ok, #5FD394); font-weight: 600; }
    .ms-tk-c-top .ms-tk-x { margin: -6px -6px -6px 0; }
    .ms-tk-c-nums { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 10px; padding: 10px 0;
      border-top: 1px solid var(--arc-line, #232934); border-bottom: 1px solid var(--arc-line, #232934); }
    .ms-tk-c.done .ms-tk-c-nums { border-color: color-mix(in srgb, var(--arc-ok, #5FD394) 25%, transparent); }
    .ms-tk-c-nums > div { display: flex; flex-direction: column; min-width: 0; }
    .ms-tk-c-nums span { font-size: 12px; color: var(--arc-mut, #8B93A1); }
    .ms-tk-c-nums b { font-size: 19px; font-weight: 600; font-variant-numeric: tabular-nums; margin-top: 1px; }
    .ms-tk-c-nums i { font-style: normal; font-size: 12px; color: var(--arc-mut, #8B93A1); }
    .ms-tk-th2 { font-size: 11.5px; color: var(--arc-dim, #5F6774); font-weight: 400; }
    .ms-tk-c-grid { display: grid; grid-template-columns: 1.1fr .7fr 1.2fr; gap: 8px; margin-top: 10px; }
    .ms-tk-c-grid label { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
    .ms-tk-c-grid label > span { font-size: 12px; color: var(--arc-mut, #8B93A1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ms-tk-cell.full { width: 100%; min-width: 0; height: 40px; }
    .ms-tk-c-foot { margin-top: 10px; font-size: 12.5px; color: var(--arc-mut, #8B93A1); line-height: 1.5; }
    .ms-tk-warn { color: var(--arc-warn, #F0B35A); font-size: 12px; }
    .ms-tk-x { width: 30px; height: 30px; border-radius: 8px; border: 0; background: transparent; color: var(--arc-mut, #8B93A1);
      font-size: 18px; cursor: pointer; }
    .ms-tk-x:hover { background: var(--arc-hover, #212833); color: var(--arc-text, #E8EAEE); }
    .ms-scroll { border: 1px solid var(--arc-line, #232934); border-radius: 12px; background: var(--arc-panel, #161A21); }
    .ms-table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .ms-table th { position: sticky; top: 0; z-index: 1; text-align: left; font-size: 12.5px; font-weight: 500;
      color: var(--arc-mut, #8B93A1); padding: 11px 14px; background: var(--arc-rail, #12161C); border-bottom: 1px solid var(--arc-line, #232934); }
    .ms-table td { padding: 10px 14px; border-bottom: 1px solid var(--arc-line, #232934); font-variant-numeric: tabular-nums; }
    .ms-table tr:last-child td { border-bottom: none; }
    .ms-table tbody tr:hover td { background: var(--arc-raise, #1C222B); }
    .ms-table tr.you td { background: var(--arc-accent-soft, #1D2640); }
    .ms-mono { font-variant-numeric: tabular-nums; }
    .ms-dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 8px; }
    .ms-link { color: var(--arc-accent, #7EA0FF); text-decoration: none; font-weight: 500; }
    .ms-link:hover { text-decoration: underline; }
    .ms-link:focus-visible { outline: 2px solid var(--arc-accent, #7EA0FF); outline-offset: 2px; border-radius: 3px; }
    .ms-more { font-size: 13.5px; color: var(--arc-mut, #8B93A1); margin-top: 18px;
      padding-top: 16px; border-top: 1px solid var(--arc-line, #232934); }
    .ms-note { color: var(--arc-mut, #8B93A1); font-size: 13px; line-height: 1.65; max-width: 72ch; margin-top: 28px; }
    .ms-note a { color: var(--arc-accent, #7EA0FF); }
    .ms-warn { color: var(--arc-warn, #F0B35A); font-size: 14px; line-height: 1.6; }
    .ms-warn b { color: var(--arc-text, #E8EAEE); font-weight: 600; }
    .ms-est { color: var(--arc-warn, #F0B35A); }
    .ms-vg { color: var(--arc-gold, #F4BF41); margin-left: 5px; cursor: help; }
    .ms-vg.next { opacity: .85; }
    .ms-vg + .ms-vg { margin-left: 1px; }
    .ms-vgline { display: flex; flex-wrap: wrap; gap: 4px 18px; }
    .ms-row { display: flex; align-items: center; gap: 8px; }
    .ms-step { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 10px;
      border: 1px solid var(--arc-line-2, #2E3542); background: var(--arc-raise, #1C222B); color: var(--arc-text, #E8EAEE);
      font-size: 18px; line-height: 1; cursor: pointer; transition: background .15s; }
    .ms-step:hover { background: var(--arc-hover, #212833); }
    .ms-eventmeta { font-size: 13.5px; color: var(--arc-mut, #8B93A1); margin-top: 16px; display: flex; flex-wrap: wrap; align-items: center; gap: 6px 8px; }
    .ms-eventmeta b { color: var(--arc-text, #E8EAEE); font-weight: 600; }
    .ms-eventmeta.ms-est { color: var(--arc-warn, #F0B35A); margin-top: 10px; }
    .ms-seal { display: inline-grid; place-items: center; width: 64px; height: 64px; border-radius: 50%;
      border: 2px solid; font-size: 24px; font-weight: 700; letter-spacing: -0.02em; flex: none; }
    .ms-yourgrid { display: flex; gap: 22px; align-items: center; flex-wrap: wrap; }
    .ms-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
    .ms-chip { height: 32px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--arc-line-2, #2E3542);
      background: transparent; color: var(--arc-mut, #8B93A1); font-size: 13px; font-weight: 500; cursor: pointer;
      transition: background .15s, color .15s; }
    .ms-chip:hover { color: var(--arc-text, #E8EAEE); background: var(--arc-raise, #1C222B); }
    .ms-chip.on, .ms-chip.on:hover { color: var(--arc-bg, #0E1116); font-weight: 600; }
    .ms-scroll { max-height: 440px; overflow-y: auto; }
    @media (max-width: 760px) {
      .ms-tk-scroll { display: none; }
      .ms-tk-cards { display: grid; gap: 8px; margin-top: 16px; }
      .ms-tk-head .ms-stats { display: grid; grid-template-columns: 1fr 1fr; width: 100%; }
      .ms-tk-search { width: 100%; }
      .ms-tk-add .ms-input:nth-child(2) { flex: 1 1 140px; width: auto !important; }
    }
    @media (max-width: 600px) {
      .ms-root { padding: 28px 16px 56px; }
      .ms-title { font-size: 26px; }
      .ms-stats { gap: 14px 22px; }
      .ms-card { padding: 16px; }
      .ms-table th, .ms-table td { padding-left: 10px; padding-right: 10px; }
    }
  `;

  const groupColor = result?.group === 1 ? "#4FA3D1" : "#E8C468";

  return (
    <div className="ms-root">
      <style>{css}</style>
      <div className={"ms-wrap" + (tab === "tickets" ? " ms-wide" : "")}>
        <div className="ms-eyebrow">Avatar Realms Collide · All times UTC</div>
        <h1 className="ms-title">Migration Scout</h1>
        <div className="ms-sub">
          Find your migration group and every compatible server, with SvS bracket order, and work out how many
          migration tickets your players still need and what they cost. All dates are in UTC.
        </div>

        <div className="ms-seg" role="tablist">
          <button role="tab" aria-selected={tab === "worlds"} className={tab === "worlds" ? "on" : ""} onClick={() => setTab("worlds")}>Worlds</button>
          <button role="tab" aria-selected={tab === "tickets"} className={tab === "tickets" ? "on" : ""} onClick={() => setTab("tickets")}>Tickets</button>
        </div>

        {tab === "tickets" && (<>
          <div className="ms-card">
            <div className="ms-controls">
              <div className="ms-field">
                <label htmlFor="ms-server2">Server</label>
                <input id="ms-server2" className="ms-input" inputMode="numeric" value={serverStr}
                  onChange={(e) => { const v = e.target.value.replace(/\D/g, ""); if (v !== serverStr) setPeople([]); setServerStr(v); }}
                  placeholder="e.g. 1097" />
              </div>
            </div>
          </div>
          <TicketCalc world={validServer ? server : null} people={people} setPeople={setPeople} />
        </>)}

        {tab === "worlds" && (<>
        {/* Controls */}
        <div className="ms-card">
          <div className="ms-controls">
            <div className="ms-field">
              <label htmlFor="ms-server">Server</label>
              <input
                id="ms-server"
                className="ms-input"
                inputMode="numeric"
                value={serverStr}
                onChange={(e) => setServerStr(e.target.value.replace(/\D/g, ""))}
                placeholder="e.g. 1097"
              />
            </div>
            <div className="ms-field">
              <label htmlFor="ms-event">Migration event #</label>
              <div className="ms-row">
                <button
                  className="ms-step"
                  onClick={() => setEventN((n) => Math.max(1, n - 1))}
                  aria-label="Previous event"
                >
                  –
                </button>
                <input
                  id="ms-event"
                  className="ms-input"
                  style={{ width: 70, textAlign: "center" }}
                  inputMode="numeric"
                  value={eventN}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (Number.isFinite(v) && v >= 1) setEventN(v);
                    else if (e.target.value === "") setEventN(1);
                  }}
                />
                <button
                  className="ms-step"
                  onClick={() => setEventN((n) => n + 1)}
                  aria-label="Next event"
                >
                  +
                </button>
              </div>
            </div>
            <div className="ms-field">
              <label htmlFor="ms-offset">Day offset</label>
              <div className="ms-row">
                <button
                  className="ms-step"
                  onClick={() => setOffset((o) => o - 1)}
                  aria-label="Shift events one day earlier"
                >
                  –
                </button>
                <input
                  id="ms-offset"
                  className="ms-input"
                  style={{ width: 70, textAlign: "center" }}
                  inputMode="numeric"
                  value={offset}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^\d-]/g, "");
                    if (raw === "" || raw === "-") setOffset(0);
                    else {
                      const v = parseInt(raw, 10);
                      if (Number.isFinite(v)) setOffset(v);
                    }
                  }}
                />
                <button
                  className="ms-step"
                  onClick={() => setOffset((o) => o + 1)}
                  aria-label="Shift events one day later"
                >
                  +
                </button>
                {offset !== 0 && (
                  <button
                    className="ms-chip"
                    style={{ padding: "6px 10px" }}
                    onClick={() => setOffset(0)}
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="ms-eventmeta">
            Event {eventN}: <b>{fmtDate(start)} – {fmtDate(lastDay)}</b>
            <span className={"ms-status" + (status === "Live now" ? " live" : "")}>
              {status}
            </span>
            {isKnownEvent(eventN) ? (
              <span className="ms-status">confirmed date</span>
            ) : offset !== 0 ? (
              <span className="ms-status" style={{ color: "var(--arc-warn, #F0B35A)", borderColor: "color-mix(in srgb, var(--arc-warn, #F0B35A) 45%, transparent)" }}>
                {offset > 0 ? "+" : ""}{offset}d shifted
              </span>
            ) : (
              <span className="ms-status">projected</span>
            )}
          </div>
          {vg.worlds.length > 0 && (
            <div className="ms-eventmeta ms-vgline">
              {vg.kind === "next" ? (
                <span><span className="ms-vg next" style={{ marginLeft: 0 }}>☆</span> Projected Vanguard worlds for this event (<a className="ms-link" href="https://dengsden.com/avatar/migration/vanguard/" target="_blank" rel="noopener">dengsden.com</a> estimate, {fmtPicked(vg.as_of)}): <b className="ms-mono">{vg.worlds.join(", ")}</b></span>
              ) : (
                <span><span className="ms-vg" style={{ marginLeft: 0 }}>★</span> Vanguard worlds for this event ({Date.parse(vg.picked + "T00:00:00Z") > start ? "earliest recorded picks, " : "picked "}{fmtPicked(vg.picked)}): <b className="ms-mono">{vg.worlds.join(", ")}</b></span>
              )}
            </div>
          )}
          {isKnownEvent(eventN) && offset !== 0 && (
            <div className="ms-eventmeta ms-est">
              Offset is ignored for events 1–{LAST_KNOWN} since their dates are known. It
              applies from event {LAST_KNOWN + 1} onward.
            </div>
          )}
        </div>

        {/* Your server */}
        {!validServer && (
          <div className="ms-card ms-warn">Enter a server number (1001 or higher).</div>
        )}

        {validServer && result?.state === "unlaunched" && (
          <div className="ms-card ms-warn">
            Server {server} doesn't exist yet on {fmtDate(start)} — it launches{" "}
            {fmtDate(result.launch)}.
          </div>
        )}

        {validServer && result?.state === "young" && (
          <div className="ms-card">
            <div className="ms-warn">
              Server {server} is only <b>{result.age} days old</b> at the start of
              event {eventN} — servers need to be at least 78 days old to migrate.
            </div>
            <div className="ms-eventmeta">
              First eligible event: <b>#{result.firstN}</b> (
              {fmtDate(eventStart(result.firstN, offset))})
            </div>
            <div className="ms-more">
              For more info on world {server}, check{" "}
              <a
                className="ms-link"
                href={dengsdenUrl(server)}
                target="_blank"
                rel="noopener"
              >
                Deng's Den ↗
              </a>
            </div>
          </div>
        )}

        {validServer && result?.state === "ok" && (
          <>
            <div className="ms-card">
              <div className="ms-yourgrid">
                <div
                  className="ms-seal"
                  style={{ borderColor: groupColor, color: groupColor }}
                  aria-label={"Group " + result.group}
                >
                  {result.group === 1 ? "I" : "II"}
                </div>
                <div className="ms-stats">
                  <div className="ms-stat">
                    <div className="k">Migration group</div>
                    <div className="v">
                      Group {result.group}{" "}
                      <span style={{ color: "var(--arc-mut, #8B93A1)", fontSize: 13, fontWeight: 500 }}>
                        ({result.group === 1 ? "78–161 days" : "162+ days"})
                      </span>
                    </div>
                  </div>
                  <div className="ms-stat">
                    <div className="k">Age at event start</div>
                    <div className="v ms-mono">
                      {isProjected(server) ? "~" : ""}day {result.age}
                    </div>
                  </div>
                  <div className="ms-stat">
                    <div className="k">Launched</div>
                    <div className="v">
                      {isProjected(server) ? "~" : ""}{fmtDate(result.launch)}
                    </div>
                  </div>
                  {isVg(server) && (
                    <div className="ms-stat">
                      <div className="k">Vanguard</div>
                      <div className="v">
                        {vgMark(server, { marginLeft: 0 })} {vg.kind === "next" ? "Projected pick" : "Upper Ring world"}
                      </div>
                    </div>
                  )}
                  <div className="ms-stat">
                    <div className="k">SvS bracket</div>
                    <div className="v">
                      <span
                        className="ms-dot"
                        style={{ background: ELEMENT[svsPos(server)].color }}
                      />
                      {ORD[svsPos(server)]} of {svsBracket(server)[0]}–
                      {svsBracket(server)[3]}
                    </div>
                  </div>
                </div>
              </div>
              <div className="ms-more">
                For more info on world {server}, check{" "}
                <a
                  className="ms-link"
                  href={dengsdenUrl(server)}
                  target="_blank"
                  rel="noopener"
                >
                  Deng's Den ↗
                </a>
              </div>
            </div>

            {/* Compatible servers */}
            <div className="ms-card">
              <div className="ms-chips" role="group" aria-label="Filter by SvS position">
                {[0, 1, 2, 3, 4].map((p) => (
                  <button
                    key={p}
                    className={"ms-chip" + (posFilter === p ? " on" : "")}
                    style={
                      posFilter === p
                        ? {
                            background: p === 0 ? "var(--arc-text, #E8EAEE)" : ELEMENT[p].color,
                            borderColor: p === 0 ? "var(--arc-text, #E8EAEE)" : ELEMENT[p].color,
                          }
                        : {}
                    }
                    onClick={() => setPosFilter(p)}
                  >
                    {p === 0 ? "All positions" : ORD[p] + " in SvS"}
                  </button>
                ))}
              </div>
              <div className="ms-eventmeta" style={{ marginTop: 0, marginBottom: 10 }}>
                <b>{filtered.length}</b> compatible server
                {filtered.length === 1 ? "" : "s"} in Group {result.group} for event{" "}
                {eventN}
                {vg.worlds.length > 0 && (
                  <span> · {vgMark(vg.worlds[0], { marginLeft: 0 })} {vg.kind === "next" ? "projected Vanguard world" : "Vanguard world"}</span>
                )}
              </div>
              <div className="ms-scroll">
                <table className="ms-table">
                  <thead>
                    <tr>
                      <th>Server</th>
                      <th>Age (days)</th>
                      <th>Launched</th>
                      <th>SvS order</th>
                      <th>SvS bracket</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr key={r.s} className={r.s === server ? "you" : ""}>
                        <td className="ms-mono">
                          <a
                            className="ms-link"
                            href={dengsdenUrl(r.s)}
                            target="_blank"
                            rel="noopener"
                            title={`World ${r.s} on Deng's Den`}
                          >
                            {r.s}
                          </a>
                          {vgMark(r.s)}
                          {r.s === server ? "  ← you" : ""}
                        </td>
                        <td className="ms-mono">
                          {r.est ? <span className="ms-est">~</span> : ""}
                          {r.age}
                        </td>
                        <td>{r.est ? "~" : ""}{fmtDate(r.launch)}</td>
                        <td>
                          <span
                            className="ms-dot"
                            style={{ background: ELEMENT[r.pos].color }}
                          />
                          {ORD[r.pos]}
                        </td>
                        <td className="ms-mono">
                          {svsBracket(r.s)[0]}–{svsBracket(r.s)[3]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        <div className="ms-note">
          Each world's age is its in-game Day counter, read from the Migration
          screen on Nov 1, 2026 and matching Deng's Den open dates. Worlds opened
          irregularly early on — 1007/1008 share an open day, as do 1009/1010/1011
          — so ages come from a table rather than a weekly formula. Worlds past{" "}
          {NEWEST_KNOWN} assume the current weekly Friday cadence and are marked
          with <span className="ms-est">~</span>. Event dates through Nov 28, 2026 are confirmed
          (Jul 6, Aug 24, Oct 3, Oct 31, Nov 28); later events assume the 28-day
          cycle continues, shiftable with the day offset control. Group is judged by age on the event's first day;
          SvS brackets are consecutive blocks of 4 anchored at 1097
          (1097–1100, … 1997–2000).{" "}
          Vanguard (Upper Ring) worlds take only a few migrants. The game picks
          them when each migration event opens: the 5 worlds furthest above their
          era's average power. <span className="ms-vg" style={{ marginLeft: 0 }}>★</span> marks the actual
          picks for events that have opened;{" "}
          <span className="ms-vg next" style={{ marginLeft: 0 }}>☆</span> marks <a className="ms-link" href="https://dengsden.com/avatar/migration/vanguard/" target="_blank" rel="noopener">dengsden.com</a>'s projected picks
          for the upcoming event and later ones, based on today's standings. Lists
          are refreshed daily.
          Per-world details link out to{" "}
          <a href="https://dengsden.com/" target="_blank" rel="noopener">
            dengsden.com
          </a>.
        </div>
        </>)}
      </div>
    </div>
  );
}
