"""Download each server's top 400 players (name, alliance tag, power) from dengsden.com.

Warzone matchmaking uses each world's top-200 power. Deng's Den only publishes
top-100 totals, so the top 200 is added up here from the player board.

Writes:
  <out>/index.json                    snapshot time and the servers included
  <out>/servers/<n>.json              {"server", "taken_at", "players": [[name, tag, power], ...]}
                                      top 400, sorted by power, highest first (for the editor)
  <out>/top200.json                   {"taken_at", "top200": {"<n>": sum}} (latest)
  <out>/history/top200-<date>.json    the same, kept for every run so past rounds
                                      can use their Matching-day numbers

Deng's board returns 50 players per request, so each server takes 8 requests.
Runs weekly from .github/workflows/deng-players.yml; requests are sequential
and spaced out.
"""
import json, os, re, sys, time, urllib.request

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
    done, top200 = [], {}
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
        players = [[clean(r["name"]), r.get("ally_tag") or "", int(r["value"])] for r in rows]
        json.dump({"server": server, "taken_at": taken, "players": players},
                  open(os.path.join(OUT, "servers", f"{server}.json"), "w"),
                  ensure_ascii=False, separators=(",", ":"))
        done.append(server)
        if len(players) >= 200:
            top200[str(server)] = sum(p[2] for p in players[:200])
        print(f"server {server}: {len(players)} players", flush=True)
    json.dump({"taken_at": taken, "source": "https://dengsden.com/avatar/rankings/", "servers": done},
              open(idx_path, "w"), ensure_ascii=False, separators=(",", ":"))
    os.makedirs(os.path.join(OUT, "history"), exist_ok=True)
    t200 = {"taken_at": taken, "top200": top200}
    json.dump(t200, open(os.path.join(OUT, "top200.json"), "w"), separators=(",", ":"))
    json.dump(t200, open(os.path.join(OUT, "history", f"top200-{taken[:10]}.json"), "w"), separators=(",", ":"))
    open(os.path.join(OUT, ".changed"), "w").write(taken)
    print("requests:", calls)
    return 0


if __name__ == "__main__":
    sys.exit(main())
