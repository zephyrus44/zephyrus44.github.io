import { useState, useMemo, useEffect } from "react";

/* ---------------- World ages (all UTC) ----------------
   In-game "Day N" for every world as shown on the Migration screen
   on Sun Nov 1, 2026 (UTC). Day 1 = the day the world opened.
   Worlds after the newest listed open every Friday at 00:00 UTC.   */
const DAY = 86400000;
const REF = Date.UTC(2026, 10, 1);

const GAME_DAY = {
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
const NEWEST_LISTED = 1111;

const launchOf = (s) =>
  s <= NEWEST_LISTED
    ? REF - (GAME_DAY[s] - 1) * DAY
    : REF - (GAME_DAY[NEWEST_LISTED] - 1) * DAY + (s - NEWEST_LISTED) * 7 * DAY;
// Only servers that haven't opened yet have an estimated opening date;
// servers past the list that have already opened follow the weekly Friday rule.
const isProjected = (s) => s > NEWEST_LISTED && launchOf(s) > Date.now();
// In-game day counter on date t (Day 1 = opening day)
const gameDayOn = (s, t) => Math.floor((t - launchOf(s)) / DAY) + 1;

/* ---------------- Hero pair schedule ----------------
   Each cycle is 14 days, and each hero pair runs for three cycles.
   Both events run 5 days, Monday–Friday. A world's first event opens on
   the second Monday after it launches (10 days after opening day), and
   every later event opens 14 days after the previous one.            */
const EVENT_LEN = 5;
// Events run on the same Mondays on every server, every 14 days.
const CYCLE_MS = 14 * DAY;
const EVENT_ANCHOR = Date.UTC(2026, 10, 16); // Mon Nov 16, 2026
const sharedOnOrAfter = (t) =>
  EVENT_ANCHOR + Math.ceil((t - EVENT_ANCHOR) / CYCLE_MS) * CYCLE_MS;

// Start of the first event on this server opening at or after time t
const eventOnOrAfter = (server, t) => sharedOnOrAfter(Math.max(t, launchOf(server)));

// Number of events from the server's first event up to and including ev
const eventNumber = (server, ev) =>
  Math.round((ev - eventOnOrAfter(server, launchOf(server))) / CYCLE_MS) + 1;

// unlock = server age (days) a pair needs; release = the update that added
// the pair (UTC). A server gets a pair once it is both old enough and the pair
// has been released. Sources: the game's update notes and Deng's Den hero roster.
// Pairs with split: false are confirmed as a pair, but which hero is on
// which event isn't known yet.
const PAIRS = [
  { wheel: "Iroh",                     tgl: "Aang",           el: "fire",  unlock: 1   },
  { wheel: "King Bumi",                tgl: "Amon",           el: "earth", unlock: 46  },
  { wheel: "Painted Lady Katara",      tgl: "Yangchen",       el: "water", unlock: 84  },
  { wheel: "Lin Beifong",              tgl: "Roku",           el: "earth", unlock: 126 },
  { wheel: "Fire Nation Aang",         tgl: "Kuruk",          el: "air",   unlock: 168 },
  { wheel: "Avatar Hunter Zuko",       tgl: "Zaheer",         el: "fire",  unlock: 210 },
  { wheel: "Wolf Warrior Sokka",       tgl: "Kuvira",         el: "water", unlock: 252, release: Date.UTC(2025, 10, 26) },
  { wheel: "Mako",                     tgl: "Jinora",         el: "fire",  unlock: 294, release: Date.UTC(2026, 0, 1) },
  { wheel: "Lady Beifong Toph",        tgl: "Desna and Eska", el: "earth", unlock: 336, release: Date.UTC(2026, 1, 4) },
  { wheel: "Ozai",                     tgl: "Opal",           el: "fire",  unlock: 378, release: Date.UTC(2026, 3, 1) },
  { wheel: "Disguised Equalist Korra", tgl: "Bolin",          el: "water", unlock: 420, release: Date.UTC(2026, 3, 29) },
  { wheel: "Jetsun",                   tgl: "Ty Lee",         el: "air",   unlock: 462, release: Date.UTC(2026, 5, 24) },
  { wheel: "Sapphire Fire Katara",     tgl: "Mad King Bumi",  el: "earth", unlock: 504, release: Date.UTC(2026, 6, 22) },
  { wheel: "Rangi",                    tgl: "Kelsang",        el: "air",   unlock: 546, release: Date.UTC(2026, 8, 16) },
  { wheel: "Yun",                      tgl: "Varrick",        el: "water", unlock: 588, release: Date.UTC(2026, 9, 28) },
];

// Each hero's element and what they're used for. "Lead" = has a leader skill.
const HEROES = {
  "Iroh":                     { el: "fire",  roles: ["Garrison"] },
  "Aang":                     { el: "air",   roles: ["Lead", "Versatile"] },
  "King Bumi":                { el: "earth", roles: ["Garrison"] },
  "Amon":                     { el: "water", roles: ["Siege"] },
  "Painted Lady Katara":      { el: "water", roles: ["Garrison"] },
  "Yangchen":                 { el: "air",   roles: ["Lead", "Versatile"] },
  "Lin Beifong":              { el: "earth", roles: ["Garrison"] },
  "Roku":                     { el: "fire",  roles: ["Lead", "Versatile"] },
  "Fire Nation Aang":         { el: "air",   roles: ["Siege"] },
  "Kuruk":                    { el: "water", roles: ["Lead", "Hunt"] },
  "Avatar Hunter Zuko":       { el: "fire",  roles: ["Siege"] },
  "Zaheer":                   { el: "air",   roles: ["Siege"] },
  "Wolf Warrior Sokka":       { el: "water", roles: ["Hunt"] },
  "Kuvira":                   { el: "earth", roles: ["Lead", "Siege"] },
  "Mako":                     { el: "fire",  roles: ["Hunt"] },
  "Jinora":                   { el: "air",   roles: ["Versatile"] },
  "Lady Beifong Toph":        { el: "earth", roles: ["Siege"] },
  "Desna and Eska":           { el: "water", roles: ["Versatile"] },
  "Ozai":                     { el: "fire",  roles: ["Lead", "Siege"] },
  "Opal":                     { el: "air",   roles: ["Versatile"] },
  "Disguised Equalist Korra": { el: "water", roles: ["Lead", "Siege"] },
  "Bolin":                    { el: "earth", roles: ["Garrison"] },
  "Jetsun":                   { el: "air",   roles: ["Lead", "Versatile"] },
  "Ty Lee":                   { el: "fire",  roles: ["Hunt"] },
  "Sapphire Fire Katara":     { el: "water", roles: ["Siege"] },
  "Mad King Bumi":            { el: "earth", roles: ["Lead", "Hunt"] },
  "Kelsang":                  { el: "air",   roles: ["Hunt"] },
  "Rangi":                    { el: "fire",  roles: ["Siege"] },
  "Yun":                      { el: "earth", roles: ["Versatile"] },
  "Varrick":                  { el: "water", roles: ["Hunt"] },
};
const ROLE_INFO = {
  Lead: "Leader skill",
  Siege: "PvP, cities, strongholds",
  Garrison: "Walls, defense",
  Versatile: "All-rounder",
  Hunt: "Skulls, dark spirits",
  Gathering: "Gathering",
};
const NO_PORTRAIT = new Set();
const IMG_BASE = "tools/hero-cycle/heroes/";
const slug = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const heroInfo = (n) => HEROES[n] || { el: "air", roles: [] };
const heroColor = (n) => EL[heroInfo(n).el].c;

const EL = {
  fire:  { c: "#E0715A", name: "Fire" },
  water: { c: "#4FA3D1", name: "Water" },
  earth: { c: "#7FB069", name: "Earth" },
  air:   { c: "#E8C468", name: "Air" },
};

const Portrait = ({ name, size = 40 }) => {
  const c = heroColor(name);
  return (
    <span className="hc-pt" style={{ width: size, height: size, boxShadow: `0 0 0 2px ${c}` }}>
      {NO_PORTRAIT.has(name)
        ? <span className="hc-pt-ph" style={{ color: c, fontSize: size * 0.42 }}>{name[0]}</span>
        : <img src={IMG_BASE + slug(name) + ".webp"} alt="" width={size} height={size} loading="lazy" />}
    </span>
  );
};

const Roles = ({ name }) => {
  const { el, roles } = heroInfo(name);
  return (
    <span className="hc-roles">
      <span className="hc-chip hc-chip-el" style={{ color: EL[el].c }}>
        <span className="hc-dot" style={{ background: EL[el].c }} />{EL[el].name}
      </span>
      {roles.map((r) => (
        <span key={r} className={"hc-chip" + (r === "Lead" ? " lead" : "")} title={ROLE_INFO[r]}>{r}</span>
      ))}
    </span>
  );
};

// Big hero block for the current event
const HeroFeature = ({ name, label }) => (
  <div className="hc-feat">
    <Portrait name={name} size={64} />
    <div style={{ minWidth: 0 }}>
      <div className="hc-k">{label}</div>
      <div className="hc-name">{name}</div>
      <Roles name={name} />
    </div>
  </div>
);

// Compact hero for the schedule list
const HeroRow = ({ name, label }) => (
  <div className="hc-hrow">
    <Portrait name={name} size={36} />
    <div style={{ minWidth: 0 }}>
      {label && <div className="hc-k" style={{ fontSize: 11.5 }}>{label}</div>}
      <div className="hc-hname">{name}</div>
      <Roles name={name} />
    </div>
  </div>
);

const pairLabel = (p) =>
  p.split === false ? p.heroes.join(" & ") : `${p.tgl} / ${p.wheel}`;

const ord = (n) => n + (["th", "st", "nd", "rd"][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] || "th");
const fmtDate = (t) =>
  new Date(t).toLocaleDateString("en-US", {
    timeZone: "UTC", month: "short", day: "numeric", year: "numeric",
  });
const fmtShort = (t) =>
  new Date(t).toLocaleDateString("en-US", {
    timeZone: "UTC", weekday: "short", month: "short", day: "numeric",
  });
// "Mon, Nov 16 – Fri, Nov 20"; adds the year once at the end when it isn't this year
const fmtRange = (a, b) => {
  const y = new Date(b).getUTCFullYear();
  return `${fmtShort(a)} – ${fmtShort(b)}${y !== new Date().getUTCFullYear() ? ", " + y : ""}`;
};

// A hero pair starts at the first event on or after the day its heroes
// unlock on that server, and runs until the next pair starts.
// Every pair runs at least 3 times before the next one can start.
const MIN_RUNS = 3;
const pairStarts = (server) => {
  const out = [];
  PAIRS.forEach((p, i) => {
    let start = eventOnOrAfter(server,
      Math.max(launchOf(server) + (p.unlock - 1) * DAY, p.release || -Infinity));
    if (i > 0) start = Math.max(start, out[i - 1] + MIN_RUNS * CYCLE_MS);
    out.push(start);
  });
  return out;
};

// Details for the event that opens at evStart on this server
const eventInfo = (server, evStart) => {
  const starts = pairStarts(server);
  let pairIdx = -1;
  for (let i = 0; i < starts.length; i++) if (starts[i] <= evStart) pairIdx = i;
  if (pairIdx < 0) return null;
  const last = pairIdx === PAIRS.length - 1;
  const n = eventNumber(server, evStart);
  const n0 = eventNumber(server, starts[pairIdx]);
  const run = n - n0 + 1;
  // The newest pair keeps running until the next heroes are released
  const runs = last ? null : eventNumber(server, starts[pairIdx + 1]) - n0;
  return {
    evStart,
    evEnd: evStart + EVENT_LEN * DAY, // exclusive
    cycle: n,
    pairIdx,
    pair: PAIRS[pairIdx], last,
    run, runs,
  };
};

// The event live on date t, or the next one if none is live
const currentEvent = (server, t) =>
  eventOnOrAfter(server, Math.max(t - (EVENT_LEN - 1) * DAY, launchOf(server)));

// The n events starting with the one that opens at ev
const eventsFrom = (server, ev, n) => {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(ev);
    ev = eventOnOrAfter(server, ev + DAY);
  }
  return out;
};



// Every TGL / Wheel of Fate hero, with its event and partner
const HERO_LIST = PAIRS.flatMap((p, i) => [
  { name: p.tgl, event: "TGL", partner: p.wheel, partnerEvent: "Wheel of Fate", pairIdx: i },
  { name: p.wheel, event: "Wheel of Fate", partner: p.tgl, partnerEvent: "TGL", pairIdx: i },
]);

// Servers that have opened by time t
const openServers = (t) => {
  const out = [];
  for (let s = 1001; launchOf(s) <= t; s++) out.push(s);
  return out;
};

// For one hero pair on date t: which servers have it now, and which get it later
const pairByServer = (pairIdx, t) => {
  const now = [], later = [];
  for (const s of openServers(t)) {
    const cur = eventInfo(s, currentEvent(s, t));
    if (!cur) continue;
    if (cur.pairIdx === pairIdx) now.push({ s, e: cur });
    else if (cur.pairIdx < pairIdx) {
      const start = pairStarts(s)[pairIdx];
      later.push({ s, e: eventInfo(s, start) });
    }
  }
  const group = (list) => {
    const m = new Map();
    for (const x of list) {
      const k = x.e.evStart;
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(x);
    }
    return [...m.entries()].sort((a, b) => a[0] - b[0]).map(([k, xs]) => ({ evStart: k, evEnd: xs[0].e.evEnd, xs }));
  };
  return { now: group(now), later: group(later) };
};

const HeroSearch = ({ onPick }) => {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const norm = (x) => x.toLowerCase().replace(/[^a-z]/g, "");
  const nq = norm(q);
  const matches = HERO_LIST
    .filter((h) => !nq || norm(h.name).includes(nq) ||
      h.name.toLowerCase().split(/\s+/).some((w) => w.startsWith(q.toLowerCase().trim())))
    .sort((a, b) => (norm(a.name).startsWith(nq) ? 0 : 1) - (norm(b.name).startsWith(nq) ? 0 : 1))
    .slice(0, 8);
  const pick = (h) => { onPick(h); setQ(h.name); setOpen(false); };
  return (
    <div className="hc-combo">
      <input id="hc-hero" className="hc-input" style={{ width: "100%", maxWidth: 360 }}
        placeholder="Start typing a hero name" autoComplete="off" role="combobox"
        aria-expanded={open && matches.length > 0} aria-controls="hc-hero-list" aria-autocomplete="list"
        aria-activedescendant={open && matches[hi] ? "hc-opt-" + hi : undefined}
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHi((i) => Math.min(i + 1, matches.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setHi((i) => Math.max(i - 1, 0)); }
          else if (e.key === "Enter" && open && matches[hi]) { e.preventDefault(); pick(matches[hi]); }
          else if (e.key === "Escape") setOpen(false);
        }}/>
      {open && matches.length > 0 && (
        <ul id="hc-hero-list" className="hc-opts" role="listbox">
          {matches.map((h, i) => (
            <li key={h.name} id={"hc-opt-" + i} role="option" aria-selected={i === hi}
              className={"hc-opt" + (i === hi ? " hi" : "")}
              onMouseDown={(e) => { e.preventDefault(); pick(h); }}
              onMouseEnter={() => setHi(i)}>
              <Portrait name={h.name} size={30} />
              <span className="hc-opt-name">{h.name}</span>
              <span className="hc-opt-ev">{h.event}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default function HeroCycleCalculator() {
  const todayISO = new Date().toISOString().slice(0, 10);
  // Remember the last server between visits (browser storage can be unavailable)
  const [serverStr, setServerStr] = useState(() => {
    try { return localStorage.getItem("hc-server") || ""; } catch { return ""; }
  });
  useEffect(() => {
    try { localStorage.setItem("hc-server", serverStr); } catch {}
  }, [serverStr]);
  const [dateStr, setDateStr] = useState(todayISO);
  const [mode, setMode] = useState(() => {
    try { return localStorage.getItem("hc-mode") || "server"; } catch { return "server"; }
  });
  useEffect(() => { try { localStorage.setItem("hc-mode", mode); } catch {} }, [mode]);
  const [hero, setHero] = useState(null);

  const server = parseInt(serverStr, 10);
  const validServer = Number.isFinite(server) && server >= 1001;
  const t = dateStr ? Date.parse(dateStr + "T00:00:00Z") : NaN;
  const validDate = Number.isFinite(t);

  const result = useMemo(() => {
    if (!validServer || !validDate) return null;
    if (t < launchOf(server)) return { state: "unlaunched", launch: launchOf(server) };
    const dayN = gameDayOn(server, t);
    const firstEv = currentEvent(server, t);
    const cur = eventInfo(server, firstEv);

    let status, statusText;
    if (t < cur.evStart) {
      status = "upcoming";
      const d = Math.round((cur.evStart - t) / DAY);
      statusText = `Starts in ${d} day${d === 1 ? "" : "s"}`;
    } else {
      status = "live";
      statusText = `Live · day ${Math.floor((t - cur.evStart) / DAY) + 1} of ${EVENT_LEN}`;
    }

    const upcoming = [];
    // Every remaining event; the newest pair is shown for 3 more events,
    // since it keeps running until new heroes are released
    let lastShown = 0;
    for (const ev of eventsFrom(server, firstEv, 80)) {
      const e = eventInfo(server, ev);
      if (e.last && ++lastShown > 3) break;
      upcoming.push(e);
    }

    return {
      state: "ok", dayN, cur, status, statusText, upcoming,
      est: isProjected(server),
      newServer: false,
    };
  }, [server, validServer, t, validDate]);

  const heroResult = useMemo(
    () => (hero && validDate ? pairByServer(hero.pairIdx, t) : null),
    [hero, t, validDate]);

  const css = `
    .hc-root { min-height: 100vh; background: var(--arc-bg, #0E1116); color: var(--arc-text, #E8EAEE);
      font-family: var(--arc-font, "Geist", Inter, system-ui, sans-serif); font-size: 14px; line-height: 1.5;
      padding: 48px 40px 72px; -webkit-font-smoothing: antialiased; }
    .hc-root * { box-sizing: border-box; }
    .hc-root button { font-family: inherit; }
    .hc-wrap { max-width: 880px; margin: 0 auto; }
    .hc-eyebrow { display: none; }
    .hc-title { font-size: 32px; font-weight: 700; letter-spacing: -0.03em; line-height: 1.1; margin: 0 0 8px; }
    .hc-sub { color: var(--arc-mut, #8B93A1); font-size: 15px; max-width: 62ch; margin-bottom: 28px; }
    .hc-card { background: var(--arc-panel, #161A21); border: 1px solid var(--arc-line, #232934); border-radius: 14px;
      padding: 20px; margin-bottom: 16px; }
    .hc-controls { display: flex; flex-wrap: wrap; gap: 20px 28px; }
    .hc-field label { display: block; font-size: 13px; font-weight: 500; color: var(--arc-mut, #8B93A1); margin-bottom: 8px; }
    .hc-input { background: var(--arc-bg, #0E1116); border: 1px solid var(--arc-line-2, #2E3542); color: var(--arc-text, #E8EAEE);
      border-radius: 10px; padding: 0 12px; height: 40px; width: 130px;
      font: 500 16px/1 var(--arc-font, "Geist", Inter, system-ui, sans-serif); font-variant-numeric: tabular-nums; color-scheme: dark;
      transition: border-color .15s, box-shadow .15s; }
    .hc-input:focus { outline: none; border-color: var(--arc-accent, #7EA0FF); box-shadow: 0 0 0 3px var(--arc-accent-soft, #1D2640); }
    .hc-status { display: inline-flex; align-items: center; height: 22px; padding: 0 9px; border-radius: 999px;
      border: 1px solid var(--arc-line-2, #2E3542); color: var(--arc-mut, #8B93A1); font-size: 12px; font-weight: 500; vertical-align: middle; }
    .hc-status.live { color: var(--arc-ok, #5FD394); border-color: color-mix(in srgb, var(--arc-ok, #5FD394) 45%, transparent); }
    .hc-status.upcoming { color: var(--arc-accent, #7EA0FF); border-color: color-mix(in srgb, var(--arc-accent, #7EA0FF) 45%, transparent); }
    .hc-stats { display: flex; gap: 18px 32px; flex-wrap: wrap; }
    .hc-stat .k { font-size: 12.5px; font-weight: 500; color: var(--arc-mut, #8B93A1); }
    .hc-stat .v { font-size: 17px; font-weight: 600; letter-spacing: -0.01em; margin-top: 4px; font-variant-numeric: tabular-nums; }
    .hc-mono { font-variant-numeric: tabular-nums; }
    .hc-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; flex: none; }
    .hc-warn { color: var(--arc-warn, #F0B35A); font-size: 14px; line-height: 1.6; }
    .hc-warn b { color: var(--arc-text, #E8EAEE); font-weight: 600; }
    .hc-est { color: var(--arc-warn, #F0B35A); }
    .hc-k { font-size: 12.5px; font-weight: 500; color: var(--arc-mut, #8B93A1); }
    .hc-name { font-size: 20px; font-weight: 600; letter-spacing: -0.015em; line-height: 1.2; margin: 2px 0 8px; }
    .hc-pt { position: relative; display: inline-flex; align-items: center; justify-content: center; flex: none;
      border-radius: 50%; overflow: hidden; background: var(--arc-raise, #1C222B); }
    .hc-pt img { width: 100%; height: 100%; object-fit: cover; display: block; transform: scale(1.12); }
    .hc-pt-ph { font-weight: 700; }
    .hc-roles { display: flex; flex-wrap: wrap; gap: 5px; }
    .hc-chip { display: inline-flex; align-items: center; height: 20px; padding: 0 8px; border-radius: 999px;
      font-size: 11.5px; font-weight: 500; color: var(--arc-text-2, #C3C8D1); background: var(--arc-raise, #1C222B);
      border: 1px solid var(--arc-line, #232934); white-space: nowrap; }
    .hc-chip-el { background: transparent; }
    .hc-chip.lead { color: #0E1116; background: var(--arc-warn, #F0B35A); border-color: transparent; font-weight: 600; }
    .hc-feats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0 18px; }
    .hc-feat { display: flex; gap: 14px; align-items: center; background: var(--arc-bg, #0E1116);
      border: 1px solid var(--arc-line, #232934); border-radius: 12px; padding: 14px 16px; }
    .hc-band { display: flex; gap: 3px; margin-top: 20px; }
    .hc-seg { flex: 1; height: 8px; border-radius: 3px; opacity: 0.22; }
    .hc-seg.cur { opacity: 1; }
    .hc-bandlbl { display: flex; justify-content: space-between; margin-top: 8px; font-size: 11.5px; color: var(--arc-mut, #8B93A1); }
    .hc-h2 { font-size: 15px; font-weight: 600; margin: 28px 0 12px; }
    .hc-list { display: flex; flex-direction: column; gap: 10px; }
    .hc-group { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 240px; gap: 16px; align-items: start;
      background: var(--arc-panel, #161A21); border: 1px solid var(--arc-line, #232934); border-radius: 12px; padding: 14px 16px; }
    .hc-group.now { border-color: color-mix(in srgb, var(--arc-accent, #7EA0FF) 55%, transparent); }
    .hc-group.split { grid-template-columns: minmax(0, 2fr) 240px; }
    .hc-group .hc-heroes2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .hc-hrow { display: flex; gap: 10px; align-items: flex-start; }
    .hc-hname { font-size: 14.5px; font-weight: 600; margin: 1px 0 5px; }
    .hc-runs { display: flex; flex-direction: column; gap: 4px; font-size: 13px; font-variant-numeric: tabular-nums; }
    .hc-run { display: flex; gap: 8px; color: var(--arc-text-2, #C3C8D1); white-space: nowrap; }
    .hc-run .n { color: var(--arc-mut, #8B93A1); width: 34px; flex: none; }
    .hc-run.now { color: var(--arc-accent, #7EA0FF); font-weight: 600; }
    .hc-run.now .n { color: inherit; }
    .hc-note2 { font-size: 12px; color: var(--arc-mut, #8B93A1); margin-top: 6px; }
    .hc-seg2 { display: inline-flex; padding: 3px; gap: 2px; border-radius: 10px; background: var(--arc-bg, #0E1116);
      border: 1px solid var(--arc-line, #232934); margin-bottom: 16px; }
    .hc-seg2 button { border: 0; background: transparent; color: var(--arc-mut, #8B93A1); font-size: 13.5px; font-weight: 500;
      height: 30px; padding: 0 14px; border-radius: 7px; cursor: pointer; }
    .hc-seg2 button.on { background: var(--arc-raise, #1C222B); color: var(--arc-text, #E8EAEE); }
    .hc-combo { position: relative; }
    .hc-opts { position: absolute; z-index: 5; left: 0; top: calc(100% + 6px); width: 100%; max-width: 360px; margin: 0; padding: 4px;
      list-style: none; background: var(--arc-panel, #161A21); border: 1px solid var(--arc-line-2, #2E3542); border-radius: 12px;
      box-shadow: 0 12px 32px rgba(0,0,0,.45); max-height: 340px; overflow-y: auto; }
    .hc-opt { display: flex; align-items: center; gap: 10px; padding: 6px 8px; border-radius: 8px; cursor: pointer; }
    .hc-opt.hi { background: var(--arc-raise, #1C222B); }
    .hc-opt-name { font-size: 14px; font-weight: 500; flex: 1; min-width: 0; }
    .hc-opt-ev { font-size: 11.5px; color: var(--arc-mut, #8B93A1); white-space: nowrap; }
    .hc-srvs { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .hc-srv { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border-radius: 8px;
      border: 1px solid var(--arc-line, #232934); background: var(--arc-bg, #0E1116); color: var(--arc-text, #E8EAEE);
      font: 500 13px/1 var(--arc-font, "Geist", Inter, system-ui, sans-serif); font-variant-numeric: tabular-nums; cursor: pointer; }
    .hc-srv:hover { border-color: var(--arc-line-2, #2E3542); background: var(--arc-raise, #1C222B); }
    .hc-srv .r { color: var(--arc-mut, #8B93A1); font-weight: 400; }
    .hc-evgrp + .hc-evgrp { margin-top: 14px; }
    .hc-evgrp .d { font-size: 13px; color: var(--arc-text-2, #C3C8D1); }
    .hc-legend { display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 12px; color: var(--arc-mut, #8B93A1); margin-top: 14px; }
    .hc-legend span { display: inline-flex; align-items: center; }
    .hc-legend b { color: var(--arc-text-2, #C3C8D1); font-weight: 600; margin-right: 4px; }
    @media (max-width: 600px) {
      .hc-root { padding: 28px 16px 56px; }
      .hc-title { font-size: 26px; }
      .hc-stats { gap: 14px 22px; }
      .hc-card { padding: 16px; }
      .hc-feats { grid-template-columns: 1fr; }
      .hc-group, .hc-group.split { grid-template-columns: 1fr; gap: 12px; }
      .hc-group .hc-heroes2 { grid-template-columns: 1fr; gap: 12px; }
    }
  `;

  const r = result;
  // Consecutive events with the same hero pair, grouped
  const groups = [];
  for (const c of r?.upcoming || []) {
    const g = groups[groups.length - 1];
    if (g && g.pair === c.pair) g.events.push(c);
    else groups.push({ pair: c.pair, events: [c] });
  }
  const range = (c) => fmtRange(c.evStart, c.evEnd - DAY);

  return (
    <div className="hc-root">
      <style>{css}</style>
      <div className="hc-wrap">
        <div className="hc-eyebrow">Avatar Realms Collide · All times UTC</div>
        <h1 className="hc-title">Hero Cycle</h1>
        <div className="hc-sub">
          The Greatest Leader and Wheel of Fate heroes for any server on any date. All dates are in UTC.
        </div>

        <div className="hc-seg2" role="tablist">
          <button role="tab" aria-selected={mode === "server"} className={mode === "server" ? "on" : ""}
            onClick={() => setMode("server")}>By server</button>
          <button role="tab" aria-selected={mode === "hero"} className={mode === "hero" ? "on" : ""}
            onClick={() => setMode("hero")}>By hero</button>
        </div>

        {mode === "hero" && (
          <>
            <div className="hc-card">
              <div className="hc-controls">
                <div className="hc-field" style={{ flex: "1 1 260px" }}>
                  <label htmlFor="hc-hero">Hero</label>
                  <HeroSearch onPick={setHero} />
                </div>
                <div className="hc-field">
                  <label htmlFor="hc-date2">Date</label>
                  <input id="hc-date2" className="hc-input" type="date" style={{ width: 170 }}
                    value={dateStr} onChange={(e) => setDateStr(e.target.value)}/>
                </div>
              </div>
            </div>

            {!hero && (
              <div className="hc-card" style={{ color: "var(--arc-mut, #8B93A1)" }}>
                Search for a hero to see which servers have them, and their partner on the other event.
              </div>
            )}

            {hero && heroResult && (
              <>
                <div className="hc-card">
                  <div className="hc-feats" style={{ marginTop: 0 }}>
                    <HeroFeature name={hero.name} label={hero.event} />
                    <HeroFeature name={hero.partner} label={hero.partnerEvent + " (same cycle)"} />
                  </div>

                  <div className="hc-h2" style={{ marginTop: 4 }}>Servers on this pair now</div>
                  {heroResult.now.length === 0 && (
                    <div className="hc-note2">No server has this pair for the event on or after this date.</div>
                  )}
                  {heroResult.now.map((g) => (
                    <div key={g.evStart} className="hc-evgrp">
                      <div className="d">
                        {fmtRange(g.evStart, g.evEnd - DAY)}
                        <span style={{ color: "var(--arc-mut, #8B93A1)" }}> · {g.xs.length} server{g.xs.length === 1 ? "" : "s"}</span>
                      </div>
                      <div className="hc-srvs">
                        {g.xs.map(({ s: sv, e }) => (
                          <button key={sv} className="hc-srv" title={"Open server " + sv}
                            onClick={() => { setServerStr(String(sv)); setMode("server"); }}>
                            {sv}<span className="r">{e.runs ? `${e.run}/${e.runs}` : ord(e.run)}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  {heroResult.later.length > 0 && (
                    <>
                      <div className="hc-h2">Coming up</div>
                      {heroResult.later.map((g) => (
                        <div key={g.evStart} className="hc-evgrp">
                          <div className="d">
                            First run {fmtRange(g.evStart, g.evEnd - DAY)}
                            <span style={{ color: "var(--arc-mut, #8B93A1)" }}> · {g.xs.length} server{g.xs.length === 1 ? "" : "s"}</span>
                          </div>
                          <div className="hc-srvs">
                            {g.xs.map(({ s: sv }) => (
                              <button key={sv} className="hc-srv" title={"Open server " + sv}
                                onClick={() => { setServerStr(String(sv)); setMode("server"); }}>{sv}</button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                  <div className="hc-note2" style={{ marginTop: 14 }}>
                    Tap a server to see its full schedule. 
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {mode === "server" && (<>
        <div className="hc-card">
          <div className="hc-controls">
            <div className="hc-field">
              <label htmlFor="hc-server">Server</label>
              <input id="hc-server" className="hc-input" inputMode="numeric"
                value={serverStr} placeholder="e.g. 1082"
                onChange={(e) => setServerStr(e.target.value.replace(/\D/g, ""))}/>
            </div>
            <div className="hc-field">
              <label htmlFor="hc-date">Date</label>
              <input id="hc-date" className="hc-input" type="date" style={{ width: 170 }}
                value={dateStr} onChange={(e) => setDateStr(e.target.value)}/>
            </div>
          </div>
        </div>

        {!validServer && (
          <div className="hc-card" style={{ color: "var(--arc-mut, #8B93A1)" }}>
            {serverStr ? "Server numbers start at 1001." : "Enter a server number to see its hero pair."}
          </div>
        )}
        {validServer && r?.state === "unlaunched" && (
          <div className="hc-card hc-warn">
            Server {server} doesn't exist yet on that date — it launches {fmtDate(r.launch)}.
          </div>
        )}


        {r?.state === "ok" && (
          <>
            <div className="hc-card">
              <span className={"hc-status " + r.status}>{r.statusText}</span>


              {r.cur.pair.split === false ? (
                <>
                  <div className="hc-feats">
                    {r.cur.pair.heroes.map((n) => <HeroFeature key={n} name={n} label="TGL or Wheel of Fate" />)}
                  </div>
                  <div className="hc-note2" style={{ marginTop: -8, marginBottom: 16 }}>
                    Which hero is on which event isn't confirmed yet.
                  </div>
                </>
              ) : (
                <div className="hc-feats">
                  <HeroFeature name={r.cur.pair.tgl} label="TGL" />
                  <HeroFeature name={r.cur.pair.wheel} label="Wheel of Fate" />
                </div>
              )}

              <div className="hc-stats">
                <div className="hc-stat">
                  <div className="hc-k">Event</div>
                  <div className="v">{(r.est || r.newServer) && <span className="hc-est">~</span>}{range(r.cur)}</div>
                </div>
                <div className="hc-stat">
                  <div className="hc-k">Run</div>
                  <div className="v">{ord(r.cur.run)}{r.cur.runs ? ` of ${r.cur.runs}` : ""}</div>
                </div>
                <div className="hc-stat">
                  <div className="hc-k">Server day</div>
                  <div className="v hc-mono">
                    {r.est && <span className="hc-est">~</span>}{r.dayN}
                  </div>
                </div>
              </div>

              <div className="hc-band" aria-hidden="true">
                {PAIRS.map((p, i) => (
                  <div key={i} className={"hc-seg" + (i === r.cur.pairIdx ? " cur" : "")}
                    style={{ background: EL[p.el].c }} title={pairLabel(p)}/>
                ))}
              </div>
              <div className="hc-bandlbl"><span>First pair</span><span>Last known pair</span></div>
            </div>

            <div className="hc-h2">Upcoming schedule</div>
            <div className="hc-list">
              {groups.map((g, gi) => (
                <div key={g.events[0].evStart}
                  className={"hc-group" + (g.pair.split === false ? " split" : "") + (gi === 0 ? " now" : "")}>
                  {g.pair.split === false ? (
                    <div>
                      <div className="hc-heroes2">
                        {g.pair.heroes.map((n) => <HeroRow key={n} name={n} />)}
                      </div>
                      <div className="hc-note2">Which hero is on which event isn't confirmed yet.</div>
                    </div>
                  ) : (
                    <>
                      <HeroRow name={g.pair.tgl} label="TGL" />
                      <HeroRow name={g.pair.wheel} label="Wheel of Fate" />
                    </>
                  )}
                  <div className="hc-runs">
                    {g.pair === PAIRS[PAIRS.length - 1] && (
                      <div className="hc-note2" style={{ marginTop: 0, marginBottom: 2 }}>
                        Newest heroes: repeats until the next ones are released
                      </div>
                    )}
                    {g.events.map((c, i) => (
                      <div key={c.evStart} className={"hc-run" + (gi === 0 && i === 0 ? " now" : "")}>
                        <span className="n">{c.runs ? `${c.run}/${c.runs}` : ord(c.run)}</span>
                        <span>{r.est || r.newServer ? "~" : ""}{range(c)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="hc-legend">
              {Object.values(EL).map((e) => (
                <span key={e.name}><span className="hc-dot" style={{ background: e.c }} />{e.name}</span>
              ))}
              {Object.entries(ROLE_INFO).filter(([k]) => k !== "Gathering").map(([k, v]) => (
                <span key={k}><b>{k}</b>{v}</span>
              ))}
            </div>
          </>
        )}

        </>)}
      </div>
    </div>
  );
}
