/* ARC Tools: tool registry.
 *
 * Each tool is one entry. Fields:
 *   id       short name used in the address bar (zephyrus44.github.io/#id)
 *   name     shown in the sidebar and on the home page
 *   group    "planners" or "calculators" (see GROUPS)
 *   blurb    one line about what it does, shown on the home page
 *   accent   colour of its icon
 *   icon     one of: swords, spark, temple, arrows, layers, cycle (optional)
 *   page     a finished HTML page, shown full size        ─┐ use one
 *   file     a React .jsx component, compiled in the page ─┘
 *   aliases  older ids that should still open this tool (optional)
 *
 * The order here is the order on the site.
 */

window.ARC_GROUPS = [
  { id: "planners",    name: "Event planners" },
  { id: "calculators", name: "Calculators" },
];

window.ARC_TOOLS = [
  {
    id: "grand-melee",
    name: "Grand Melee",
    group: "planners",
    blurb: "Plan Murong's Grand Melee phase by phase with arrows, markers and team rosters, then share the plan.",
    accent: "#F08C33",
    icon: "swords",
    page: "tools/grand-melee/",
    aliases: ["MGM", "mgm"],
  },
  {
    id: "glowworms-ruse",
    name: "Glowworm's Ruse",
    group: "planners",
    blurb: "Map the Land of the Abyss, pick Chronicle and Domination goals, and mark targets and claims.",
    accent: "#50B080",
    icon: "spark",
    page: "tools/glowworms-ruse/",
    aliases: ["glowwormsruse", "glowworm"],
  },
  {
    id: "z3",
    name: "Z3 Temple War",
    group: "planners",
    blurb: "Claim Zone 3 territories for each alliance and track points against the 10,000 reward cap.",
    accent: "#F4BF41",
    icon: "temple",
    file: "tools/z3-temple-war/z3-temple-war-planner.jsx",
  },
  {
    id: "migration",
    name: "Migration Scout",
    group: "calculators",
    blurb: "Find a world's migration group, every compatible world, and its SvS bracket position.",
    accent: "#5A9FE6",
    icon: "arrows",
    file: "tools/migration-scout/migration-scout.jsx",
  },
  {
    id: "era-grouping",
    name: "Era Grouping",
    group: "calculators",
    blurb: "See which era every world falls into for a Glowworm's Ruse round, and the predicted warzones.",
    accent: "#A070D6",
    icon: "layers",
    page: "tools/era-grouping/",
    aliases: ["eragrouping"],
  },
  {
    id: "hero-cycle",
    name: "Hero Cycle",
    group: "calculators",
    blurb: "The Greatest Leader and Wheel of Fate hero pair for any world on any date.",
    accent: "#E06A9E",
    icon: "cycle",
    file: "tools/hero-cycle/hero-cycle-calculator.jsx",
    aliases: ["hero"],
  },
];
