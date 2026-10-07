import { useState, useMemo } from "react";

// ---------------- Core game math (all UTC) ----------------
const DAY = 86400000;
// Reference moment: 00:00 UTC July 13, 2026.
// Screenshots taken ~Jul 12 22:00 UTC showed each server at "Xd22h",
// so elapsed whole days at the reference = X + 1.
const REF = Date.UTC(2026, 6, 13);

// Exact elapsed days at REF, read from in-game migration screen.
// Early servers launched on an irregular schedule (some on the same day!),
// so a lookup table is required instead of a formula.
const KNOWN = {
  1001: 817, 1002: 761, 1003: 705, 1004: 635, 1005: 586, 1006: 516,
  1007: 495, 1008: 495, 1009: 483, 1010: 483, 1011: 483, 1012: 481,
  1013: 480, 1014: 478, 1015: 477,
  1042: 377, 1043: 370, 1044: 363, 1045: 358, 1046: 353, 1047: 347,
  1048: 340, 1049: 333,
  1064: 220, 1065: 213, 1066: 206, 1067: 199, 1068: 192, 1069: 185,
  1070: 178, 1071: 171,
  1074: 150, 1075: 143, 1076: 136, 1077: 129, 1078: 122, 1079: 115,
  1080: 108, 1081: 101,
  1088: 52, 1089: 45, 1090: 38, 1091: 31, 1092: 24, 1093: 17,
  1094: 10, 1095: 3,
};
const NEWEST_KNOWN = 1095; // launched Fri Jul 10, 2026; weekly thereafter

// Fill gaps by linear interpolation between the nearest known anchors.
// If the gap divides evenly (uniform 7-day cadence), treat as exact;
// otherwise mark the estimate as approximate.
const { ELAPSED, APPROX } = (() => {
  const elapsed = {};
  const approx = {};
  const keys = Object.keys(KNOWN).map(Number).sort((a, b) => a - b);
  for (const k of keys) elapsed[k] = KNOWN[k];
  for (let i = 0; i < keys.length - 1; i++) {
    const lo = keys[i], hi = keys[i + 1];
    const steps = hi - lo;
    if (steps <= 1) continue;
    const delta = KNOWN[lo] - KNOWN[hi];
    const uneven = delta % steps !== 0;
    for (let s = lo + 1; s < hi; s++) {
      elapsed[s] = Math.round(KNOWN[lo] - ((s - lo) * delta) / steps);
      if (uneven) approx[s] = true;
    }
  }
  return { ELAPSED: elapsed, APPROX: approx };
})();

const launchOf = (s) =>
  s <= NEWEST_KNOWN
    ? REF - ELAPSED[s] * DAY
    : REF - ELAPSED[NEWEST_KNOWN] * DAY + (s - NEWEST_KNOWN) * 7 * DAY;
const isApprox = (s) => !!APPROX[s];
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

const ORD = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th" };
const ELEMENT = {
  1: { name: "Water", color: "#4FA3D1" },
  2: { name: "Earth", color: "#7FB069" },
  3: { name: "Fire", color: "#E2704A" },
  4: { name: "Air", color: "#E8C468" },
};

export default function MigrationScout() {
  // Default event = live event if one is running, otherwise the next one
  const defaultEvent = useMemo(() => {
    const now = Date.now();
    if (now < EVENT_1 + EVENT_LENGTH) return 1;
    if (now < EVENT_2 + EVENT_LENGTH) return 2;
    const n = 2 + Math.floor((now - EVENT_2) / EVENT_CYCLE);
    return now < eventStart(n, 0) + EVENT_LENGTH ? n : n + 1;
  }, []);

  const [serverStr, setServerStr] = useState("1097");
  const [eventN, setEventN] = useState(defaultEvent);
  const [offset, setOffset] = useState(0);
  const [posFilter, setPosFilter] = useState(0); // 0 = all

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
    const launched1095 = launchOf(NEWEST_KNOWN);
    const newest =
      NEWEST_KNOWN +
      Math.max(0, Math.floor((start - launched1095) / (7 * DAY)));
    const list = [];
    for (let s = 1001; s <= newest; s++) {
      const a = ageOn(s, start);
      if (a >= 1 && groupOf(a) === group) {
        list.push({ s, age: a, pos: svsPos(s), launch: launchOf(s), est: isApprox(s) });
      }
    }
    return { launch, age, group, list, state: "ok" };
  }, [server, validServer, start, eventN, offset]);

  const filtered =
    result?.list?.filter((r) => posFilter === 0 || r.pos === posFilter) ?? [];

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
    .ms-root { min-height: 100vh; background: #0E1520; color: #E9E2D0;
      font-family: 'IBM Plex Sans', sans-serif; padding: 28px 16px 60px; }
    .ms-wrap { max-width: 760px; margin: 0 auto; }
    .ms-eyebrow { font-family: 'IBM Plex Mono', monospace; font-size: 11px;
      letter-spacing: 0.22em; color: #8FA0B3; text-transform: uppercase; }
    .ms-title { font-family: 'Cinzel', serif; font-weight: 600; font-size: 30px;
      letter-spacing: 0.04em; margin: 6px 0 2px; }
    .ms-sub { color: #8FA0B3; font-size: 13px; margin-bottom: 24px; }
    .ms-card { background: #16202E; border: 1px solid #24364A; border-radius: 10px;
      padding: 18px; margin-bottom: 16px; }
    .ms-controls { display: flex; flex-wrap: wrap; gap: 20px; }
    .ms-field label { display: block; font-size: 11px; letter-spacing: 0.14em;
      text-transform: uppercase; color: #8FA0B3; margin-bottom: 6px;
      font-family: 'IBM Plex Mono', monospace; }
    .ms-input { background: #0E1520; border: 1px solid #24364A; color: #E9E2D0;
      border-radius: 6px; padding: 9px 12px; font-size: 16px; width: 130px;
      font-family: 'IBM Plex Mono', monospace; }
    .ms-input:focus { outline: 2px solid #4FA3D1; outline-offset: 1px; }
    .ms-step { background: #24364A; border: none; color: #E9E2D0; width: 38px;
      height: 38px; border-radius: 6px; font-size: 18px; cursor: pointer; }
    .ms-step:hover { background: #2f4560; }
    .ms-row { display: flex; align-items: center; gap: 8px; }
    .ms-eventmeta { font-size: 13px; color: #8FA0B3; margin-top: 10px; }
    .ms-eventmeta b { color: #E9E2D0; font-weight: 500; }
    .ms-status { display: inline-block; font-family: 'IBM Plex Mono', monospace;
      font-size: 11px; padding: 2px 8px; border-radius: 999px; margin-left: 8px;
      border: 1px solid #24364A; color: #8FA0B3; }
    .ms-status.live { color: #7FB069; border-color: #7FB069; }
    .ms-seal { display: inline-flex; align-items: center; justify-content: center;
      width: 64px; height: 64px; border-radius: 50%; border: 2px solid;
      font-family: 'Cinzel', serif; font-size: 26px; font-weight: 600; flex: none; }
    .ms-yourgrid { display: flex; gap: 18px; align-items: center; flex-wrap: wrap; }
    .ms-stats { display: flex; gap: 26px; flex-wrap: wrap; }
    .ms-stat .k { font-family: 'IBM Plex Mono', monospace; font-size: 11px;
      letter-spacing: 0.14em; text-transform: uppercase; color: #8FA0B3; }
    .ms-stat .v { font-size: 16px; margin-top: 3px; }
    .ms-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
    .ms-chip { background: transparent; border: 1px solid #24364A; color: #8FA0B3;
      border-radius: 999px; padding: 6px 14px; font-size: 13px; cursor: pointer;
      font-family: 'IBM Plex Sans', sans-serif; }
    .ms-chip.on { color: #0E1520; font-weight: 600; }
    .ms-table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .ms-table th { text-align: left; font-family: 'IBM Plex Mono', monospace;
      font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
      color: #8FA0B3; font-weight: 400; padding: 6px 10px;
      border-bottom: 1px solid #24364A; }
    .ms-table td { padding: 8px 10px; border-bottom: 1px solid #1c2a3b; }
    .ms-table tr.you td { background: #1d2c40; }
    .ms-mono { font-family: 'IBM Plex Mono', monospace; }
    .ms-dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%;
      margin-right: 7px; vertical-align: baseline; }
    .ms-scroll { max-height: 420px; overflow-y: auto; border: 1px solid #24364A;
      border-radius: 8px; }
    .ms-note { color: #8FA0B3; font-size: 12px; line-height: 1.6; margin-top: 22px; }
    .ms-warn { color: #E8C468; font-size: 14px; line-height: 1.6; }
    .ms-est { color: #E8C468; }
    @media (max-width: 520px) { .ms-title { font-size: 24px; } .ms-stats { gap: 16px; } }
  `;

  const groupColor = result?.group === 1 ? "#4FA3D1" : "#E8C468";

  return (
    <div className="ms-root">
      <style>{css}</style>
      <div className="ms-wrap">
        <div className="ms-eyebrow">Avatar Realms Collide · All times UTC</div>
        <h1 className="ms-title">Migration Scout</h1>
        <div className="ms-sub">
          Find your migration group and every compatible server, with SvS bracket order.
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
              <span className="ms-status" style={{ color: "#E8C468", borderColor: "#E8C468" }}>
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
                      <span style={{ color: "#8FA0B3", fontSize: 13 }}>
                        ({result.group === 1 ? "78–161 days" : "162+ days"})
                      </span>
                    </div>
                  </div>
                  <div className="ms-stat">
                    <div className="k">Age at event start</div>
                    <div className="v ms-mono">
                      {isApprox(server) ? "~" : ""}day {result.age}
                    </div>
                  </div>
                  <div className="ms-stat">
                    <div className="k">Launched</div>
                    <div className="v">
                      {isApprox(server) ? "~" : ""}{fmtDate(result.launch)}
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
                            background: p === 0 ? "#E9E2D0" : ELEMENT[p].color,
                            borderColor: p === 0 ? "#E9E2D0" : ELEMENT[p].color,
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
                          {r.s}
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
          Server ages use exact values read from the in-game migration screen
          (as of Jul 12, 2026 UTC). Early servers launched irregularly — 1007/1008
          share a launch day, as do 1009/1010/1011 — so a lookup table is used
          instead of a weekly formula. Servers 1016–1041 and 1050–1063 weren't in
          the screenshots; their ages are linear estimates marked with{" "}
          <span className="ms-est">~</span>. Servers after 1095 assume the current
          weekly Friday cadence. Event 1 ran Jul 6–10 and event 2 runs Aug 24–28;
          events 3+ assume a 28-day cycle from Aug 24, shiftable with the day
          offset control. Group is judged by age on the event's first day;
          SvS brackets are consecutive blocks of 4 anchored at 1097
          (1097–1100, … 1997–2000).
        </div>
      </div>
    </div>
  );
}
