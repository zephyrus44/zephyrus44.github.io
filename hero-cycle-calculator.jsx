import { useState, useMemo } from "react";

/* ---------------- Server age data (all UTC) ----------------
   Reference: 00:00 UTC July 13, 2026. KNOWN = in-game day counter
   at that moment, read from migration-screen screenshots.        */
const DAY = 86400000;
const REF = Date.UTC(2026, 6, 13);

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
const NEWEST_KNOWN = 1095; // Fri Jul 10 2026; weekly Fridays after

// Fill gaps by linear interpolation between nearest known anchors.
const { ELAPSED, APPROX } = (() => {
  const elapsed = {}, approx = {};
  const keys = Object.keys(KNOWN).map(Number).sort((a, b) => a - b);
  for (const k of keys) elapsed[k] = KNOWN[k];
  for (let i = 0; i < keys.length - 1; i++) {
    const lo = keys[i], hi = keys[i + 1], steps = hi - lo;
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
// In-game day counter (server 1001 reads day 817 at 00:00 Jul 13).
// Launch is a Friday, so day 1 = Saturday, day 3 = Monday, day 5 = Wednesday.
const dayNumberOn = (s, t) => Math.floor((t - launchOf(s)) / DAY);

/* ---------------- Hero pair schedule ----------------
   14-day cycles, cycle 1 = server days 1–14. Each pair holds for
   three cycles. Both events run 5 days inside each cycle.
   Verified: server 1076 → cycle 10 = Roku / Lin Beifong.            */
const CYCLE_LEN = 14;
const EVENT_LEN = 5;
const TOTAL_CYCLES = 36;

const START_DAY = 3; // events open Monday (day 3 of each cycle)

const PAIRS = [
  { wheel: "Iroh",                          tgl: "Aang",           el: "fire"  },
  { wheel: "King Bumi (KB)",                tgl: "Amon",           el: "earth" },
  { wheel: "Painted Lady Katara (PLK)",     tgl: "Yangchen",       el: "water" },
  { wheel: "Lin Beifong",                   tgl: "Roku",           el: "earth" },
  { wheel: "Fire Nation Aang (FNA)",        tgl: "Kuruk",          el: "fire"  },
  { wheel: "Avatar Hunter Zuko (AH Zuko)",  tgl: "Zaheer",         el: "fire"  },
  { wheel: "Wolf Warrior Sokka (WW Sokka)", tgl: "Kuvira",         el: "water" },
  { wheel: "Mako",                          tgl: "Jinora",         el: "fire"  },
  { wheel: "Lady Beifong Toph (LB Toph)",   tgl: "Desna and Eska", el: "earth" },
  { wheel: "Ozai",                          tgl: "Opal",           el: "fire"  },
  { wheel: "Korra (variation)",             tgl: "Bolin",          el: "water" },
  { wheel: "Jet Sun",                       tgl: "Ty Lee",         el: "air"   },
];

const EL = {
  fire:  { c: "#E0715A" },
  water: { c: "#4FA3D1" },
  earth: { c: "#7FB069" },
  air:   { c: "#E8C468" },
};

const ORD = ["", "1st", "2nd", "3rd"];
const fmtDate = (t) =>
  new Date(t).toLocaleDateString("en-US", {
    timeZone: "UTC", month: "short", day: "numeric", year: "numeric",
  });
const fmtShort = (t) =>
  new Date(t).toLocaleDateString("en-US", {
    timeZone: "UTC", weekday: "short", month: "short", day: "numeric",
  });

// Moment day d begins = launch + d * DAY
const cycleInfo = (server, totalCycle, startDay) => {
  const launch = launchOf(server);
  const base = (totalCycle - 1) * CYCLE_LEN;
  const disp = ((totalCycle - 1) % TOTAL_CYCLES) + 1;
  const loop = Math.floor((totalCycle - 1) / TOTAL_CYCLES) + 1;
  const pairIdx = Math.floor((disp - 1) / 3);
  return {
    totalCycle, disp, loop, pairIdx,
    pair: PAIRS[pairIdx],
    occ: ((disp - 1) % 3) + 1,
    cycleStart: launch + (base + 1) * DAY,
    cycleEnd: launch + (base + CYCLE_LEN) * DAY,          // first moment of last day
    evStart: launch + (base + startDay) * DAY,
    evEnd: launch + (base + startDay + EVENT_LEN) * DAY,  // exclusive
  };
};

export default function HeroCycleCalculator() {
  const todayISO = new Date().toISOString().slice(0, 10);
  const [serverStr, setServerStr] = useState("1076");
  const [dateStr, setDateStr] = useState(todayISO);

  const server = parseInt(serverStr, 10);
  const validServer = Number.isFinite(server) && server >= 1001;
  const t = dateStr ? Date.parse(dateStr + "T00:00:00Z") : NaN;
  const validDate = Number.isFinite(t);

  const result = useMemo(() => {
    if (!validServer || !validDate) return null;
    if (t < launchOf(server)) return { state: "unlaunched", launch: launchOf(server) };
    const dayN = Math.max(1, dayNumberOn(server, t));
    const totalCycle = Math.ceil(dayN / CYCLE_LEN);
    const cur = cycleInfo(server, totalCycle, START_DAY);
    const dayInCycle = dayN - (totalCycle - 1) * CYCLE_LEN;

    let status, statusText;
    if (t < cur.evStart) {
      status = "upcoming";
      const d = Math.round((cur.evStart - t) / DAY);
      statusText = `Starts in ${d} day${d === 1 ? "" : "s"}`;
    } else if (t < cur.evEnd) {
      status = "live";
      statusText = `Live · day ${Math.floor((t - cur.evStart) / DAY) + 1} of ${EVENT_LEN}`;
    } else {
      status = "ended";
      statusText = "Ended this cycle";
    }
    const next = status === "ended" ? cycleInfo(server, totalCycle + 1, START_DAY) : null;

    const upcoming = [];
    for (let c = totalCycle; c < totalCycle + 8; c++)
      upcoming.push(cycleInfo(server, c, START_DAY));

    return {
      state: "ok", dayN, dayInCycle, cur, next, status, statusText, upcoming,
      est: server <= NEWEST_KNOWN && isApprox(server),
    };
  }, [server, validServer, t, validDate]);

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
    .hc-root { min-height: 100vh; background: #0E1520; color: #E9E2D0;
      font-family: 'IBM Plex Sans', sans-serif; padding: 28px 16px 60px; }
    .hc-root * { box-sizing: border-box; }
    .hc-wrap { max-width: 760px; margin: 0 auto; }
    .hc-eyebrow { font-family: 'IBM Plex Mono', monospace; font-size: 11px;
      letter-spacing: 0.22em; color: #8FA0B3; text-transform: uppercase; }
    .hc-title { font-family: 'Cinzel', serif; font-weight: 600; font-size: 30px;
      letter-spacing: 0.04em; margin: 6px 0 2px; }
    .hc-sub { color: #8FA0B3; font-size: 13px; margin-bottom: 24px; }
    .hc-card { background: #16202E; border: 1px solid #24364A; border-radius: 10px;
      padding: 18px; margin-bottom: 16px; }
    .hc-controls { display: flex; flex-wrap: wrap; gap: 20px; }
    .hc-field label { display: block; font-size: 11px; letter-spacing: 0.14em;
      text-transform: uppercase; color: #8FA0B3; margin-bottom: 6px;
      font-family: 'IBM Plex Mono', monospace; }
    .hc-input { background: #0E1520; border: 1px solid #24364A; color: #E9E2D0;
      border-radius: 6px; padding: 9px 12px; font-size: 16px; width: 130px; height: 42px;
      font-family: 'IBM Plex Mono', monospace; color-scheme: dark; }
    .hc-input:focus { outline: 2px solid #4FA3D1; outline-offset: 1px; }
    .hc-status { display: inline-block; font-family: 'IBM Plex Mono', monospace;
      font-size: 11px; padding: 2px 8px; border-radius: 999px;
      border: 1px solid #24364A; color: #8FA0B3; }
    .hc-status.live { color: #7FB069; border-color: #7FB069; }
    .hc-status.upcoming { color: #4FA3D1; border-color: #4FA3D1; }
    .hc-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 14px 0 16px; }
    .hc-hero { background: #0E1520; border: 1px solid #24364A; border-radius: 8px;
      padding: 14px; border-left-width: 3px; }
    .hc-k { font-family: 'IBM Plex Mono', monospace; font-size: 11px;
      letter-spacing: 0.14em; text-transform: uppercase; color: #8FA0B3; }
    .hc-name { font-family: 'Cinzel', serif; font-weight: 600; font-size: 20px;
      letter-spacing: 0.02em; margin-top: 4px; line-height: 1.2; }
    .hc-stats { display: flex; gap: 26px; flex-wrap: wrap; }
    .hc-stat .v { font-size: 16px; margin-top: 3px; }
    .hc-band { display: flex; gap: 3px; margin-top: 18px; }
    .hc-seg { flex: 1; height: 8px; border-radius: 2px; opacity: 0.25; }
    .hc-seg.cur { opacity: 1; }
    .hc-bandlbl { display: flex; justify-content: space-between; margin-top: 6px;
      font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: #8FA0B3; }
    .hc-next { margin-top: 14px; font-size: 13px; color: #8FA0B3; }
    .hc-next b { color: #E9E2D0; font-weight: 500; }
    .hc-scroll { overflow-x: auto; border: 1px solid #24364A; border-radius: 8px; }
    .hc-table { width: 100%; border-collapse: collapse; font-size: 14px; min-width: 560px; }
    .hc-table th { text-align: left; font-family: 'IBM Plex Mono', monospace;
      font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
      color: #8FA0B3; font-weight: 400; padding: 8px 10px;
      border-bottom: 1px solid #24364A; }
    .hc-table td { padding: 8px 10px; border-bottom: 1px solid #1c2a3b; }
    .hc-table tr:last-child td { border-bottom: none; }
    .hc-table tr.you td { background: #1d2c40; }
    .hc-mono { font-family: 'IBM Plex Mono', monospace; }
    .hc-dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%;
      margin-right: 7px; vertical-align: baseline; }
    .hc-note { color: #8FA0B3; font-size: 12px; line-height: 1.6; margin-top: 22px; }
    .hc-warn { color: #E8C468; font-size: 14px; line-height: 1.6; }
    .hc-est { color: #E8C468; }
    @media (max-width: 520px) {
      .hc-title { font-size: 24px; } .hc-stats { gap: 16px; }
      .hc-pair { grid-template-columns: 1fr; }
    }
  `;

  const r = result;
  const range = (c) => `${fmtShort(c.evStart)} – ${fmtShort(c.evEnd - DAY)}`;

  return (
    <div className="hc-root">
      <style>{css}</style>
      <div className="hc-wrap">
        <div className="hc-eyebrow">Avatar Realms Collide · All times UTC</div>
        <h1 className="hc-title">Hero Cycle</h1>
        <div className="hc-sub">
          The Greatest Leader and Wheel of Fate heroes for any server on any date.
        </div>

        <div className="hc-card">
          <div className="hc-controls">
            <div className="hc-field">
              <label htmlFor="hc-server">Server</label>
              <input id="hc-server" className="hc-input" inputMode="numeric"
                value={serverStr} placeholder="e.g. 1076"
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
          <div className="hc-card hc-warn">Enter a server number (1001 or higher).</div>
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

              <div className="hc-pair">
                <div className="hc-hero" style={{ borderLeftColor: EL[r.cur.pair.el].c }}>
                  <div className="hc-k">Wheel of Fate</div>
                  <div className="hc-name" style={{ color: EL[r.cur.pair.el].c }}>
                    {r.cur.pair.wheel}
                  </div>
                </div>
                <div className="hc-hero" style={{ borderLeftColor: "#8FA0B3" }}>
                  <div className="hc-k">TGL rewards</div>
                  <div className="hc-name">{r.cur.pair.tgl}</div>
                </div>
              </div>

              <div className="hc-stats">
                <div className="hc-stat">
                  <div className="hc-k">Event</div>
                  <div className="v">{r.est && <span className="hc-est">~</span>}{range(r.cur)}</div>
                </div>
                <div className="hc-stat">
                  <div className="hc-k">Cycle</div>
                  <div className="v hc-mono">
                    {r.cur.disp}/36{r.cur.loop > 1 ? ` · L${r.cur.loop}` : ""}
                  </div>
                </div>
                <div className="hc-stat">
                  <div className="hc-k">Run</div>
                  <div className="v">{ORD[r.cur.occ]} of 3</div>
                </div>
                <div className="hc-stat">
                  <div className="hc-k">Server day</div>
                  <div className="v hc-mono">
                    {r.est && <span className="hc-est">~</span>}{r.dayN}
                  </div>
                </div>
              </div>

              {r.next && (
                <div className="hc-next">
                  Next: <b>{r.next.pair.wheel}</b> / <b>{r.next.pair.tgl}</b> · {range(r.next)}
                </div>
              )}

              <div className="hc-band" aria-hidden="true">
                {PAIRS.map((p, i) => (
                  <div key={i} className={"hc-seg" + (i === r.cur.pairIdx ? " cur" : "")}
                    style={{ background: EL[p.el].c }} title={p.wheel + " / " + p.tgl}/>
                ))}
              </div>
              <div className="hc-bandlbl"><span>Cycle 1</span><span>36</span></div>
            </div>

            <div className="hc-scroll">
              <table className="hc-table">
                <thead>
                  <tr><th>Cycle</th><th>Event</th><th>Wheel of Fate</th><th>TGL rewards</th><th>Run</th></tr>
                </thead>
                <tbody>
                  {r.upcoming.map((c, i) => (
                    <tr key={c.totalCycle} className={i === 0 ? "you" : ""}>
                      <td className="hc-mono">{c.disp}{c.loop > 1 ? ` L${c.loop}` : ""}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{r.est ? "~" : ""}{range(c)}</td>
                      <td><span className="hc-dot" style={{ background: EL[c.pair.el].c }} />{c.pair.wheel}</td>
                      <td>{c.pair.tgl}</td>
                      <td>{ORD[c.occ]}/3</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="hc-note">
          Cycles are 14 days starting at server day 1; each hero pair holds for three cycles.
          Both events run 5 days, Monday–Friday (days 3–7 of each cycle). Calibrated against
          server 1076 (cycle 10 = Roku / Lin Beifong). Servers 1016–1041 and 1050–1063 use
          estimated ages, marked <span className="hc-est">~</span>; servers after 1095 assume
          weekly Friday launches. After cycle 36 the schedule is assumed to loop.
        </div>
      </div>
    </div>
  );
}
