"""Download each server's top 400 players (name, alliance tag, power) from dengsden.com.

Warzone matchmaking uses each world's top-200 power. Deng's Den only publishes
top-100 totals, so the top 200 is added up here from the player board.

Writes:
  <out>/index.json                    snapshot time and the servers included
  <out>/servers/<n>.json              {"server", "taken_at", "players": [[name, tag, power], ...]}
                                      top 400, sorted by power, highest first (for the editor)
  <out>/top200.json                   {"taken_at", "top200": {"<n>": sum},
                                       "active_since": {"<days>": start of that window},
                                       "top200_active": {"<days>": {"<n>": sum without inactive}}}
  <out>/history/top200-<date>.json    the same, kept for every run so past rounds
                                      can use their Matching-day numbers
  <out>/history/players-<date>.json   {"taken_at", "power": {"<n>": {"<player id>": power}}}
                                      pruned after 5 weeks
  <out>/history/idle7-<date>.json     {"<n>": [player ids with no change in the 7 days to <date>]}

Inactive = power exactly unchanged for N days (N = 7, 14 or 30). Deng's Den lists
every player whose power changed over the last 7 or 30 days (its "hustlers" board
with days=7 / days=30), so anyone missing from that list had no change. 14 days =
no change in this run's 7-day window and in the previous weekly run's. Totals for
every N are worked out here, so the page just picks one.
Rows in servers/<n>.json are [name, tag, power, idle7, idle14, idle30], each
1 (inactive), 0 (active) or null (not known).
"""
import glob, json, os, re, sys, time, urllib.request
from datetime import datetime, timedelta

API = "https://dengsden.com/avatar/api/"
UA = "Mozilla/5.0 (ARC Tools warzone tools; weekly)"
PAGES = 8          # 8 x 50 = top 400
PAUSE = 0.5
OUT = sys.argv[1] if len(sys.argv) > 1 else "out"
FORCE = "--force" in sys.argv
calls = 0


def get(path, tries=5):
    global calls
    for i in range(tries):
        try:
            calls += 1
            req = urllib.request.Request(API + path, headers={"User-Agent": UA, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=40) as r:
                data = json.load(r)
            time.sleep(PAUSE)
            return data
        except Exception as e:  # back off on rate limits and hiccups
            wait = 5 * (i + 1)
            print(f"  retry {path} in {wait}s ({e})", flush=True)
            time.sleep(wait)
    raise RuntimeError("giving up on " + path)


def clean(name):
    # drop a leading "[TAG] " so names match what players see in game
    return re.sub(r"^\[[^\]]*\]\s*", "", name).strip() if name else name


def main():
    meta = get("meta")
    taken = meta["snapshot"]["taken_at"]
    idx_path = os.path.join(OUT, "index.json")
    if not FORCE and os.path.exists(idx_path):
        try:
            if json.load(open(idx_path)).get("taken_at") == taken:
                print("Deng's Den snapshot unchanged:", taken)
                return 0
        except Exception:
            pass
    os.makedirs(os.path.join(OUT, "servers"), exist_ok=True)
    os.makedirs(os.path.join(OUT, "history"), exist_ok=True)
    day = datetime.strptime(taken[:10], "%Y-%m-%d")
    CUTOFFS = (7, 14, 30)
    # previous weekly run's 7-day inactive list (6-8 days back) for the 14-day check
    prev7, prev7_date = None, None
    for f in sorted(glob.glob(os.path.join(OUT, "history", "idle7-*.json"))):
        d0 = datetime.strptime(os.path.basename(f)[6:16], "%Y-%m-%d")
        if day - timedelta(days=8) <= d0 <= day - timedelta(days=6):
            prev7, prev7_date = json.load(open(f)), d0
    print("14-day check uses", prev7_date.date() if prev7_date else "nothing yet", flush=True)
    windows = {}

    def changed(server, days):
        """ids of players whose power changed over the last `days` days (None if unavailable)"""
        ids, page = set(), 0
        try:
            while True:
                d = get(f"board?board=hustlers&server={server}&page={page}&days={days}")
                w = d.get("window") or {}
                if str(w.get("from", ""))[:10] > (day - timedelta(days=days - 2)).strftime("%Y-%m-%d"):
                    return None  # Deng fell back to a shorter window
                windows[days] = str(w.get("from", ""))[:10]
                ids |= {str(r["player_id"]) for r in d["rows"] if r.get("player_id")}
                page += 1
                if len(d["rows"]) < d.get("per", 50) or page * d.get("per", 50) >= int(d.get("total") or 0):
                    return ids
        except RuntimeError as e:
            print(e, flush=True)
            return None

    done, top200, power_now, idle7_now = [], {}, {}, {}
    top200_active = {k: {} for k in CUTOFFS}
    for server in meta["servers"]:
        rows = []
        try:
            for page in range(PAGES):
                d = get(f"board?board=power&server={server}&page={page}")
                rows += [r for r in d["rows"] if r.get("server") == server]
                if len(d["rows"]) < d.get("per", 50):
                    break
        except RuntimeError as e:
            print(e, flush=True)
            continue  # keep the previous file for this server
        rows.sort(key=lambda r: -int(r["value"]))
        ch7, ch30 = changed(server, 7), changed(server, 30)
        p7 = set((prev7 or {}).get(str(server), [])) if prev7 is not None else None
        players = []
        for r in rows:
            pid = str(r.get("player_id"))
            i7 = None if ch7 is None else int(pid not in ch7)
            i30 = None if ch30 is None else int(pid not in ch30)
            i14 = None if (i7 is None or p7 is None) else int(i7 == 1 and pid in p7)
            players.append([clean(r["name"]), r.get("ally_tag") or "", int(r["value"]), i7, i14, i30])
        idle7_now[str(server)] = [str(r.get("player_id")) for r, p in zip(rows, players) if p[3] == 1]
        power_now[str(server)] = {str(r["player_id"]): int(r["value"]) for r in rows if r.get("player_id")}
        json.dump({"server": server, "taken_at": taken, "players": players},
                  open(os.path.join(OUT, "servers", f"{server}.json"), "w"),
                  ensure_ascii=False, separators=(",", ":"))
        done.append(server)
        if len(players) >= 200:
            top200[str(server)] = sum(p[2] for p in players[:200])
            for i, k in enumerate(CUTOFFS):
                if any(p[3 + i] is not None for p in players):
                    active = [p for p in players if p[3 + i] != 1]
                    top200_active[k][str(server)] = sum(p[2] for p in active[:200])
        print(f"server {server}: {len(players)} players", flush=True)
    json.dump({"taken_at": taken, "source": "https://dengsden.com/avatar/rankings/", "servers": done},
              open(idx_path, "w"), ensure_ascii=False, separators=(",", ":"))
    json.dump({"taken_at": taken, "power": power_now},
              open(os.path.join(OUT, "history", f"players-{taken[:10]}.json"), "w"), separators=(",", ":"))
    for f in glob.glob(os.path.join(OUT, "history", "players-*.json")):
        if datetime.strptime(os.path.basename(f)[8:18], "%Y-%m-%d") < day - timedelta(days=35):
            os.remove(f)
    json.dump(idle7_now, open(os.path.join(OUT, "history", f"idle7-{taken[:10]}.json"), "w"), separators=(",", ":"))
    for f in glob.glob(os.path.join(OUT, "history", "idle7-*.json")):
        if datetime.strptime(os.path.basename(f)[6:16], "%Y-%m-%d") < day - timedelta(days=35):
            os.remove(f)
    since = {}
    if 7 in windows and top200_active[7]: since["7"] = windows[7]
    if 30 in windows and top200_active[30]: since["30"] = windows[30]
    if prev7_date and top200_active[14]: since["14"] = f"{prev7_date - timedelta(days=7):%Y-%m-%d}"
    t200 = {"taken_at": taken, "top200": top200, "active_since": since,
            "top200_active": {str(k): v for k, v in top200_active.items() if str(k) in since}}
    json.dump(t200, open(os.path.join(OUT, "top200.json"), "w"), separators=(",", ":"))
    json.dump(t200, open(os.path.join(OUT, "history", f"top200-{taken[:10]}.json"), "w"), separators=(",", ":"))
    open(os.path.join(OUT, ".changed"), "w").write(taken)
    print("requests:", calls)
    return 0


if __name__ == "__main__":
    sys.exit(main())
