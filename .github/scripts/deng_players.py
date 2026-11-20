"""Download each server's top 400 players (name, alliance tag, power) from dengsden.com.

Warzone matchmaking uses each world's top-200 power. Deng's Den only publishes
top-100 totals, so the top 200 is added up here from the player board.

Writes:
  <out>/index.json                    snapshot time and the servers included
  <out>/servers/<n>.json              {"server", "taken_at", "players": [[name, tag, power], ...]}
                                      top 400, sorted by power, highest first (for the editor)
  <out>/top200.json                   {"taken_at", "top200": {"<n>": sum},
                                       "active_since": {"<days>": compared-with date},
                                       "top200_active": {"<days>": {"<n>": sum without inactive}}}
  <out>/history/top200-<date>.json    the same, kept for every run so past rounds
                                      can use their Matching-day numbers
  <out>/history/players-<date>.json   {"taken_at", "power": {"<n>": {"<player id>": power}}}
                                      used to spot inactive players; pruned after 5 weeks

Inactive: a player whose power hasn't gone up in N days (N = 7, 14, 21 or 28),
i.e. is no higher than in the newest saved run at least N-1 days older than
this one. Totals for every N are worked out here, so the page just picks one.
Rows in servers/<n>.json are [name, tag, power, p7, p14, p21, p28], where pN is
the player's power N days earlier (null when unknown).

Deng's board returns 50 players per request, so each server takes 8 requests.
Runs weekly from .github/workflows/deng-players.yml; requests are sequential
and spaced out.
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
    # for each cutoff, the newest saved player snapshot at least N-1 days older than this one
    CUTOFFS = (7, 14, 21, 28)
    snaps = sorted(datetime.strptime(os.path.basename(f)[8:18], "%Y-%m-%d")
                   for f in glob.glob(os.path.join(OUT, "history", "players-*.json")))
    olds, old_dates, cache = {}, {}, {}
    for k in CUTOFFS:
        ok = [d0 for d0 in snaps if d0 <= day - timedelta(days=k - 1)]
        if ok:
            d0 = ok[-1]
            if d0 not in cache:
                cache[d0] = json.load(open(os.path.join(OUT, "history", f"players-{d0:%Y-%m-%d}.json")))["power"]
            olds[k], old_dates[k] = cache[d0], d0
    print("comparing:", {k: str(v.date()) for k, v in old_dates.items()} or "no older runs yet", flush=True)
    done, top200, power_now = [], {}, {}
    top200_active = {k: {} for k in olds}
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
        was = {k: olds[k].get(str(server), {}) for k in olds}
        players = [[clean(r["name"]), r.get("ally_tag") or "", int(r["value"])] +
                   [was[k].get(str(r.get("player_id"))) if k in was else None for k in CUTOFFS] for r in rows]
        power_now[str(server)] = {str(r["player_id"]): int(r["value"]) for r in rows if r.get("player_id")}
        json.dump({"server": server, "taken_at": taken, "players": players},
                  open(os.path.join(OUT, "servers", f"{server}.json"), "w"),
                  ensure_ascii=False, separators=(",", ":"))
        done.append(server)
        if len(players) >= 200:
            top200[str(server)] = sum(p[2] for p in players[:200])
            for i, k in enumerate(CUTOFFS):
                if k in olds:
                    active = [p for p in players if not (p[3 + i] is not None and p[2] <= p[3 + i])]
                    top200_active[k][str(server)] = sum(p[2] for p in active[:200])
        print(f"server {server}: {len(players)} players", flush=True)
    json.dump({"taken_at": taken, "source": "https://dengsden.com/avatar/rankings/", "servers": done},
              open(idx_path, "w"), ensure_ascii=False, separators=(",", ":"))
    json.dump({"taken_at": taken, "power": power_now},
              open(os.path.join(OUT, "history", f"players-{taken[:10]}.json"), "w"), separators=(",", ":"))
    for f in glob.glob(os.path.join(OUT, "history", "players-*.json")):
        if datetime.strptime(os.path.basename(f)[8:18], "%Y-%m-%d") < day - timedelta(days=35):
            os.remove(f)
    t200 = {"taken_at": taken, "top200": top200,
            "active_since": {str(k): f"{d0:%Y-%m-%d}" for k, d0 in old_dates.items()},
            "top200_active": {str(k): v for k, v in top200_active.items()}}
    json.dump(t200, open(os.path.join(OUT, "top200.json"), "w"), separators=(",", ":"))
    json.dump(t200, open(os.path.join(OUT, "history", f"top200-{taken[:10]}.json"), "w"), separators=(",", ":"))
    open(os.path.join(OUT, ".changed"), "w").write(taken)
    print("requests:", calls)
    return 0


if __name__ == "__main__":
    sys.exit(main())
