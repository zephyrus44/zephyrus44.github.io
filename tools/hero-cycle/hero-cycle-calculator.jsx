import { useState, useMemo } from "react";

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
const isProjected = (s) => s > NEWEST_LISTED;
// In-game day counter on date t (Day 1 = opening day)
const gameDayOn = (s, t) => Math.floor((t - launchOf(s)) / DAY) + 1;

/* ---------------- Hero pair schedule ----------------
   Each cycle is 14 days, and each hero pair runs for three cycles.
   Both events run 5 days, Monday–Friday. A world's first event opens on
   the second Monday after it launches (10 days after opening day), and
   every later event opens 14 days after the previous one.            */
const CYCLE_LEN = 14;
const EVENT_LEN = 5;
const FIRST_EVENT_OFFSET = 10; // days after opening day

// Servers from 1061 on opened on Fridays, so their first event opens on
// day 11 (the second Monday). Older servers opened on other weekdays and
// are lined up with 1061's Mondays instead, a whole number of cycles ahead
// based on how much older they are.
const ANCHOR_SERVER = 1061;
const CYCLE_MS = 14 * DAY;
// When a server's cycle 1 event opens (may be a back-calculated date)
const cycleOneStart = (server) => {
  if (server >= ANCHOR_SERVER) return launchOf(server) + FIRST_EVENT_OFFSET * DAY;
  const ahead = Math.round((launchOf(ANCHOR_SERVER) - launchOf(server)) / CYCLE_MS);
  return launchOf(ANCHOR_SERVER) + FIRST_EVENT_OFFSET * DAY - ahead * CYCLE_MS;
};

// unlock = server day the pair's heroes unlock (game data, Deng's Den hero roster).
// Pairs with split: false are confirmed as a pair, but which hero is on
// which event isn't known yet.
const PAIRS = [
  { wheel: "Iroh",                          tgl: "Aang",           el: "fire",  unlock: 1   },
  { wheel: "King Bumi (KB)",                tgl: "Amon",           el: "earth", unlock: 46  },
  { wheel: "Painted Lady Katara (PLK)",     tgl: "Yangchen",       el: "water", unlock: 82  },
  { wheel: "Lin Beifong",                   tgl: "Roku",           el: "earth", unlock: 124 },
  { wheel: "Fire Nation Aang (FNA)",        tgl: "Kuruk",          el: "air",   unlock: 166 },
  { wheel: "Avatar Hunter Zuko (AH Zuko)",  tgl: "Zaheer",         el: "fire",  unlock: 208 },
  { wheel: "Wolf Warrior Sokka (WW Sokka)", tgl: "Kuvira",         el: "water", unlock: 250 },
  { wheel: "Mako",                          tgl: "Jinora",         el: "fire",  unlock: 292 },
  { wheel: "Lady Beifong Toph (LB Toph)",   tgl: "Desna and Eska", el: "earth", unlock: 334 },
  { wheel: "Ozai",                          tgl: "Opal",           el: "fire",  unlock: 376 },
  { wheel: "Disguised Equalist Korra",      tgl: "Bolin",          el: "water", unlock: 418 },
  { wheel: "Jet Sun",                       tgl: "Ty Lee",         el: "air",   unlock: 460 },
  { heroes: ["Sapphire Fire Katara", "Mad King Bumi"], el: "water", unlock: 502, split: false },
  { heroes: ["Kelsang", "Rangi"],                      el: "air",   unlock: 544, split: false },
  { heroes: ["Yun", "Varrick"],                        el: "earth", unlock: 586, split: false },
];
const TOTAL_CYCLES = PAIRS.length * 3;
const wheelName = (p) => (p.split === false ? null : p.wheel);
const pairLabel = (p) =>
  p.split === false ? p.heroes.join(" & ") : `${p.wheel} / ${p.tgl}`;

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

const cycleInfo = (server, totalCycle) => {
  const disp = totalCycle;
  const loop = 1;
  const pairIdx = Math.floor((disp - 1) / 3);
  const evStart = cycleOneStart(server) + (totalCycle - 1) * CYCLE_MS;
  return {
    totalCycle, disp, loop, pairIdx,
    pair: PAIRS[pairIdx] || null,
    occ: ((disp - 1) % 3) + 1,
    evStart,
    evEnd: evStart + EVENT_LEN * DAY, // exclusive
  };
};

// The cycle whose event most recently opened on or before t
// (cycle 1 before a world's first event)
const cycleOn = (server, t) => {
  return Math.max(1, Math.floor((t - cycleOneStart(server)) / CYCLE_MS) + 1);
};

export default function HeroCycleCalculator() {
  const todayISO = new Date().toISOString().slice(0, 10);
  const [serverStr, setServerStr] = useState("");
  const [dateStr, setDateStr] = useState(todayISO);

  const server = parseInt(serverStr, 10);
  const validServer = Number.isFinite(server) && server >= 1001;
  const t = dateStr ? Date.parse(dateStr + "T00:00:00Z") : NaN;
  const validDate = Number.isFinite(t);

  const result = useMemo(() => {
    if (!validServer || !validDate) return null;
    if (t < launchOf(server)) return { state: "unlaunched", launch: launchOf(server) };
    const dayN = gameDayOn(server, t);
    const totalCycle = cycleOn(server, t);
    const cur = cycleInfo(server, totalCycle);
    if (!cur.pair) return { state: "beyond", dayN };

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
    const nx = status === "ended" ? cycleInfo(server, totalCycle + 1) : null;
    const next = nx && nx.pair ? nx : null;

    const upcoming = [];
    for (let c = totalCycle; c < Math.min(totalCycle + 8, TOTAL_CYCLES + 1); c++)
      upcoming.push(cycleInfo(server, c));

    return {
      state: "ok", dayN, cur, next, status, statusText, upcoming,
      est: isProjected(server),
    };
  }, [server, validServer, t, validDate]);

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
    .hc-scroll { border: 1px solid var(--arc-line, #232934); border-radius: 12px; background: var(--arc-panel, #161A21); }
    .hc-table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .hc-table th { position: sticky; top: 0; z-index: 1; text-align: left; font-size: 12.5px; font-weight: 500;
      color: var(--arc-mut, #8B93A1); padding: 11px 14px; background: var(--arc-rail, #12161C); border-bottom: 1px solid var(--arc-line, #232934); }
    .hc-table td { padding: 10px 14px; border-bottom: 1px solid var(--arc-line, #232934); font-variant-numeric: tabular-nums; }
    .hc-table tr:last-child td { border-bottom: none; }
    .hc-table tbody tr:hover td { background: var(--arc-raise, #1C222B); }
    .hc-table tr.you td { background: var(--arc-accent-soft, #1D2640); }
    .hc-mono { font-variant-numeric: tabular-nums; }
    .hc-dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 8px; }
    .hc-note { color: var(--arc-mut, #8B93A1); font-size: 13px; line-height: 1.65; max-width: 72ch; margin-top: 28px; }
    .hc-warn { color: var(--arc-warn, #F0B35A); font-size: 14px; line-height: 1.6; }
    .hc-warn b { color: var(--arc-text, #E8EAEE); font-weight: 600; }
    .hc-est { color: var(--arc-warn, #F0B35A); }
    .hc-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0 18px; }
    .hc-hero { background: var(--arc-bg, #0E1116); border: 1px solid var(--arc-line, #232934); border-left-width: 3px; border-radius: 12px; padding: 14px 16px; }
    .hc-k { font-size: 12.5px; font-weight: 500; color: var(--arc-mut, #8B93A1); }
    .hc-name { font-size: 20px; font-weight: 600; letter-spacing: -0.015em; line-height: 1.2; margin-top: 4px; }
    .hc-band { display: flex; gap: 3px; margin-top: 20px; }
    .hc-seg { flex: 1; height: 8px; border-radius: 3px; opacity: 0.22; }
    .hc-seg.cur { opacity: 1; }
    .hc-bandlbl { display: flex; justify-content: space-between; margin-top: 8px; font-size: 11.5px;
      color: var(--arc-mut, #8B93A1); font-variant-numeric: tabular-nums; }
    .hc-next { margin-top: 16px; font-size: 13.5px; color: var(--arc-mut, #8B93A1); }
    .hc-next b { color: var(--arc-text, #E8EAEE); font-weight: 600; }
    .hc-scroll { overflow-x: auto; }
    .hc-table { min-width: 560px; }
    @media (max-width: 600px) {
      .hc-root { padding: 28px 16px 56px; }
      .hc-title { font-size: 26px; }
      .hc-stats { gap: 14px 22px; }
      .hc-card { padding: 16px; }
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
          The Greatest Leader and Wheel of Fate heroes for any server on any date. All dates are in UTC.
        </div>

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

        {r?.state === "beyond" && (
          <div className="hc-card" style={{ color: "var(--arc-mut, #8B93A1)" }}>
            Server {server} is on day {r.dayN}, past the end of the known hero list (the last
            pair unlocks on day {PAIRS[PAIRS.length - 1].unlock}). Its hero pair can't be worked
            out from the schedule.
          </div>
        )}

        {r?.state === "ok" && (
          <>
            <div className="hc-card">
              <span className={"hc-status " + r.status}>{r.statusText}</span>

              {r.cur.pair.split === false ? (
                <div className="hc-pair" style={{ gridTemplateColumns: "1fr" }}>
                  <div className="hc-hero" style={{ borderLeftColor: EL[r.cur.pair.el].c }}>
                    <div className="hc-k">Wheel of Fate &amp; TGL heroes</div>
                    <div className="hc-name" style={{ color: EL[r.cur.pair.el].c }}>
                      {r.cur.pair.heroes.join(" & ")}
                    </div>
                    <div className="hc-next" style={{ marginTop: 6 }}>
                      Which hero is on which event isn't confirmed yet.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="hc-pair">
                  <div className="hc-hero" style={{ borderLeftColor: EL[r.cur.pair.el].c }}>
                    <div className="hc-k">Wheel of Fate</div>
                    <div className="hc-name" style={{ color: EL[r.cur.pair.el].c }}>
                      {r.cur.pair.wheel}
                    </div>
                  </div>
                  <div className="hc-hero" style={{ borderLeftColor: "var(--arc-line-2, #2E3542)" }}>
                    <div className="hc-k">TGL rewards</div>
                    <div className="hc-name">{r.cur.pair.tgl}</div>
                  </div>
                </div>
              )}

              <div className="hc-stats">
                <div className="hc-stat">
                  <div className="hc-k">Event</div>
                  <div className="v">{r.est && <span className="hc-est">~</span>}{range(r.cur)}</div>
                </div>
                <div className="hc-stat">
                  <div className="hc-k">Cycle</div>
                  <div className="v hc-mono">
                    {r.cur.disp}/{TOTAL_CYCLES}
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
                  Next: <b>{pairLabel(r.next.pair)}</b> · {range(r.next)}
                </div>
              )}

              <div className="hc-band" aria-hidden="true">
                {PAIRS.map((p, i) => (
                  <div key={i} className={"hc-seg" + (i === r.cur.pairIdx ? " cur" : "")}
                    style={{ background: EL[p.el].c }} title={pairLabel(p)}/>
                ))}
              </div>
              <div className="hc-bandlbl"><span>Cycle 1</span><span>{TOTAL_CYCLES}</span></div>
            </div>

            <div className="hc-scroll">
              <table className="hc-table">
                <thead>
                  <tr><th>Cycle</th><th>Event</th><th>Wheel of Fate</th><th>TGL rewards</th><th>Run</th></tr>
                </thead>
                <tbody>
                  {r.upcoming.map((c, i) => (
                    <tr key={c.totalCycle} className={i === 0 ? "you" : ""}>
                      <td className="hc-mono">{c.disp}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{r.est ? "~" : ""}{range(c)}</td>
                      {c.pair.split === false ? (
                        <td colSpan={2}>
                          <span className="hc-dot" style={{ background: EL[c.pair.el].c }} />
                          {c.pair.heroes.join(" & ")}
                          <span style={{ color: "var(--arc-mut, #8B93A1)" }}> · split not confirmed</span>
                        </td>
                      ) : (
                        <>
                          <td><span className="hc-dot" style={{ background: EL[c.pair.el].c }} />{c.pair.wheel}</td>
                          <td>{c.pair.tgl}</td>
                        </>
                      )}
                      <td>{ORD[c.occ]}/3</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="hc-note">
          Each hero pair runs for three 14-day cycles. Both events run 5 days, Monday–Friday.
          A server's first event opens on its 11th day (the second Monday after a Friday
          opening), and a new event opens every 14 days after that. Servers that didn't open on a
          Friday follow the same Monday schedule as server 1061, a whole number of cycles ahead.
          Events haven't always opened on Mondays, so dates before that change may be off by a
          few days.
          Server ages come from the in-game Migration screen, and hero unlock days come from the
          game data on Deng's Den. Servers that haven't opened yet are assumed to open on Fridays,
          one per week, and their dates are marked <span className="hc-est">~</span>.
        </div>
      </div>
    </div>
  );
}
