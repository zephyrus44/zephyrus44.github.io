/* ARC Tools: tool registry.
 *
 * Each tool is one entry. Fields:
 *   id       short name used in the address bar (zephyrus44.github.io/#id)
 *   name     shown in the sidebar and on the home page
 *   group    "planners" or "calculators" (see GROUPS)
 *   blurb    one line about what it does, shown on the home page
 *   accent   colour of its icon
 *   icon     one of the ARC_ICONS below (optional)
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
    name: "Murong's Grand Melee",
    group: "planners",
    blurb: "Plan the event phase by phase with arrows, markers and team rosters, then share the plan.",
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

/* Tool icons: 24×24 line drawings (SVG path data). */
window.ARC_ICONS = {
  swords: '<path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6M16 16l4 4M19 21l2-2"/><path d="M14.5 6.5L18 3h3v3l-3.5 3.5"/><path d="M5 14l4 4M7 17l-3 3M3 19l2 2"/>',
  spark: '<path d="M11 3.5l1.9 5.1 5.1 1.9-5.1 1.9L11 17.5l-1.9-5.1L4 10.5l5.1-1.9z"/><path d="M18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  temple: '<path d="M12 3l8.5 5h-17z"/><path d="M5 11v7M9.7 11v7M14.3 11v7M19 11v7"/><path d="M3 21h18"/>',
  arrows: '<path d="M7.5 4L3.5 8l4 4"/><path d="M3.5 8H17"/><path d="M16.5 12l4 4-4 4"/><path d="M20.5 16H7"/>',
  layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 12.5l9 5 9-5"/><path d="M3 16.5l9 5 9-5"/>',
  cycle: '<path d="M20.5 12a8.5 8.5 0 1 1-2.5-6"/><path d="M20.5 3.5V9H15"/>',
};
