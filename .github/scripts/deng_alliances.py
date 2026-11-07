"""Build the top-8 alliance rosters for every server from dengsden.com.

Writes:
  <out>/index.json          snapshot time and, per server, its top 8 alliances
  <out>/servers/<n>.json    those alliances with their members and power

Used by the Grand Melee planner's roster import. Runs once a day from
.github/workflows/deng-alliances.yml; requests are sequential and spaced out.
"""
import json, os, re, sys, time, urllib.parse, urllib.request

API = "https://dengsden.com/avatar/api/"
UA = "Mozilla/5.0 (ARC Tools alliance rosters; once a day)"
TOP = 8
PAUSE = 0.35
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


def clean(name, tag):
    # drop a leading "[TAG] " so names match what players see in the event list
    return re.sub(r"^\[[^\]]*\]\s*", "", name).strip() if name else name


def members(server, a):
    tag, name, found = a.get("ally_tag"), a["ally_name"], {}
    squashed = re.sub(r"\W+", "", name.lower())
    for q in ([tag] if tag else []) + [name] + ([squashed] if squashed and squashed != name else []):
        page = 0
        while True:
            d = get(f"board?board=power&server={server}&q={urllib.parse.quote(q)}&page={page}")
            for r in d["rows"]:
                if tag:
                    ok = (r.get("ally_tag") or "") == tag
                else:  # untagged alliances list their name in the player's tag or alliance field
                    ok = name in (r.get("ally_name"), r.get("ally_tag"), r.get("alliance"))
                if ok:
                    found[r["name"]] = r
            total = d.get("total") or 0
            if not d["rows"] or (page + 1) * d["per"] >= total or page >= 6:
                break
            page += 1
        if found:
            break
    rows = sorted(found.values(), key=lambda r: -int(r["value"]))
    return [[clean(r["name"], tag), int(r["value"])] for r in rows]


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
    index = {"taken_at": taken, "source": "https://dengsden.com/avatar/rankings/", "servers": {}}
    for server in meta["servers"]:
        try:
            al = get(f"board?board=alliance_power&server={server}")["rows"][:TOP]
        except RuntimeError as e:
            print(e, flush=True)
            continue
        out = []
        for a in al:
            try:
                ps = members(server, a)
            except RuntimeError as e:
                print(e, flush=True)
                ps = []
            out.append({"tag": a.get("ally_tag"), "name": a["ally_name"], "power": int(a["value"]), "players": ps})
        json.dump({"server": server, "taken_at": taken, "alliances": out}, open(os.path.join(OUT, "servers", f"{server}.json"), "w"), ensure_ascii=False, separators=(",", ":"))
        index["servers"][str(server)] = [{"tag": a["tag"], "name": a["name"], "power": a["power"], "n": len(a["players"])} for a in out]
        print(f"server {server}: " + ", ".join(f"{a['name']} ({len(a['players'])})" for a in out), flush=True)
    json.dump(index, open(idx_path, "w"), ensure_ascii=False, separators=(",", ":"))
    open(os.path.join(OUT, ".changed"), "w").write(taken)
    print("requests:", calls)
    return 0


if __name__ == "__main__":
    sys.exit(main())
