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

// Event 1: Jul 6–10, 2026. Event 2: Aug 24–28, 2026 (a 49-day gap, not 28).
// Events 3+ assume the 28-day cycle continues from event 2, plus an optional
// user-supplied day offset to correct for schedule drift.
const EVENT_1 = Date.UTC(2026, 6, 6);
const EVENT_2 = Date.UTC(2026, 7, 24);
const EVENT_CYCLE = 28 * DAY;
const EVENT_LENGTH = 5 * DAY;
const eventStart = (n, offset = 0) =>
  n <= 1
    ? EVENT_1
    : n === 2
    ? EVENT_2
    : EVENT_2 + (n - 2) * EVENT_CYCLE + offset * DAY;

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

export default function MigrationScout() {
  const dataTick = useWorldDays();
  // Default event = live event if one is running, otherwise the next one
  const defaultEvent = useMemo(() => {
    const now = Date.now();
    if (now < EVENT_1 + EVENT_LENGTH) return 1;
    if (now < EVENT_2 + EVENT_LENGTH) return 2;
    const n = 2 + Math.floor((now - EVENT_2) / EVENT_CYCLE);
    return now < eventStart(n, 0) + EVENT_LENGTH ? n : n + 1;
  }, []);

  const num = (k) => { const v = parseInt(urlParam(k), 10); return Number.isFinite(v) ? v : null; };
  const [serverStr, setServerStr] = useState(() => (num("server") ? String(num("server")) : "1097"));
  const [eventN, setEventN] = useState(() => (num("event") >= 1 ? num("event") : defaultEvent));
  const [offset, setOffset] = useState(() => num("offset") ?? 0);
  const [posFilter, setPosFilter] = useState(() => num("pos") ?? 0); // 0 = all
  useShareParams({
    server: serverStr,
    event: eventN !== defaultEvent ? eventN : "",
    offset: offset || "",
    pos: posFilter || "",
  });

  const server = parseInt(serverStr, 10);
  const validServer = Number.isFinite(server) && server >= 1001;

  const start = eventStart(eventN, offset);
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
      <div className="ms-wrap">
        <div className="ms-eyebrow">Avatar Realms Collide · All times UTC</div>
        <h1 className="ms-title">Migration Scout</h1>
        <div className="ms-sub">
          Find your migration group and every compatible server, with SvS bracket order. All dates are in UTC.
        </div>

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
            {eventN <= 2 ? (
              <span className="ms-status">confirmed date</span>
            ) : offset !== 0 ? (
              <span className="ms-status" style={{ color: "var(--arc-warn, #F0B35A)", borderColor: "color-mix(in srgb, var(--arc-warn, #F0B35A) 45%, transparent)" }}>
                {offset > 0 ? "+" : ""}{offset}d shifted
              </span>
            ) : (
              <span className="ms-status">projected</span>
            )}
          </div>
          {eventN <= 2 && offset !== 0 && (
            <div className="ms-eventmeta ms-est">
              Offset is ignored for events 1–2 since their dates are known. It
              applies from event 3 onward.
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
          with <span className="ms-est">~</span>. Event 1 ran Jul 6–10 and event 2 ran Aug 24–28;
          events 3+ assume a 28-day cycle from Aug 24, shiftable with the day
          offset control. Group is judged by age on the event's first day;
          SvS brackets are consecutive blocks of 4 anchored at 1097
          (1097–1100, … 1997–2000). Per-world details link out to{" "}
          <a href="https://dengsden.com/" target="_blank" rel="noopener">
            dengsden.com
          </a>.
        </div>
      </div>
    </div>
  );
}
