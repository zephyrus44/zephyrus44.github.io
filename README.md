# ARC Tools

Event planners and calculators for Avatar Realms Collide, served at https://zephyrus44.github.io.

## Layout

```
index.html      the site: home page, sidebar, and the frame each tool opens in
tools.js        the list of tools (names, groups, descriptions, icons, files)
theme.css       shared colours, fonts and shapes used by the site and every tool
nav.js          top bar and tool menu for HTML tools opened as full pages (phones and tablets)
404.html        shown for addresses that don't exist
tools/<name>/   one folder per tool
data/           world power and warzone data from dengsden.com, used by Era Grouping
.github/workflows/deng-data.yml   refreshes data/ once a day
.github/workflows/deng-alliances.yml   builds the top 8 alliances on every server, with
                each member's power, onto the deng-alliances branch once a day
                (script: .github/scripts/deng_alliances.py). The Grand Melee planner's
                "From Deng's Den" import reads it from raw.githubusercontent.com. The
                branch is replaced on every run, so it adds nothing to main's history.
```

Older addresses (`grand-melee-planner.html`, `era-grouping.html`, `GlowwormsRusePlanner/glowworm/`) redirect to the new folders, so old bookmarks and share links keep working.

## Adding or updating a tool

- **Update:** replace the file inside its `tools/<name>/` folder.
- **Add:** create `tools/<name>/`, put the tool in it, and add an entry to `tools.js`.
  - A finished HTML page goes in as `index.html` and is listed with `page: "tools/<name>/"`. Add `<script src="/nav.js" defer></script>` to its `<head>` so it gets the site menu on phones.
  - A React component goes in as a `.jsx` file and is listed with `file: "tools/<name>/<file>.jsx"`.

## Look and feel

Every tool uses `theme.css`: the same dark palette, the Geist typeface, and one blue accent for active and selected states. HTML tools link it with `<link rel="stylesheet" href="/theme.css">`. React tools read its `--arc-*` variables, which the site page provides. New tools should do the same so everything stays consistent.
