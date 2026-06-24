export type DocsNavItem = {
  slug: string;
  title: string;
  description: string;
};

export type DocsNavSection = {
  title: string;
  items: DocsNavItem[];
};

export const docsSections: DocsNavSection[] = [
  {
    title: "Getting started",
    items: [
      {
        slug: "overview",
        title: "Overview",
        description: "What Scrobbling Away measures and the assumptions behind every stat.",
      },
      {
        slug: "data-pipeline",
        title: "Data pipeline",
        description: "From Last.fm sync to derived analytics in your browser.",
      },
    ],
  },
  {
    title: "Core analytics",
    items: [
      {
        slug: "listening-sessions",
        title: "Listening sessions",
        description: "How scrobbles are grouped into sessions and what each metric means.",
      },
      {
        slug: "concentration",
        title: "Listening concentration",
        description: "Gini, Lorenz curve, and how much your top artists dominate.",
      },
      {
        slug: "discovery-replay",
        title: "Discovery vs replay",
        description: "First-time plays, repeats, heavy repeats, and discovery rate.",
      },
      {
        slug: "library-growth",
        title: "Library growth",
        description: "Unique artists, albums, tracks, and recent expansion.",
      },
      {
        slug: "overlap",
        title: "Current vs historical",
        description: "Recent taste compared to all-time listening.",
      },
      {
        slug: "listening-rhythm",
        title: "Listening rhythm",
        description: "Clock, weekday, month, and year charts.",
      },
    ],
  },
  {
    title: "Advanced analytics",
    items: [
      {
        slug: "artist-switches",
        title: "Artist switches",
        description: "Markov chain, switch map, vibe groups, and force layout.",
      },
      {
        slug: "session-types",
        title: "Session types",
        description: "New music, one-artist focus, replays, and mixed sessions.",
      },
      {
        slug: "sequential-analysis",
        title: "Sequential patterns",
        description: "Hawkes contagion, artist chains, and switch paths.",
      },
      {
        slug: "information-theory",
        title: "Information & drift",
        description: "Entropy, transfer entropy, taste drift, order effects, ergodicity.",
      },
      {
        slug: "time-series",
        title: "Time series",
        description: "Habit shifts, decomposition, Hurst, PACF, and recurrence.",
      },
      {
        slug: "retention",
        title: "Retention & decay",
        description: "Track replays, artist cohorts, same-session repeats, album half-life.",
      },
      {
        slug: "graph-structure",
        title: "Session co-occurrence",
        description: "Artists that appear together, PMI pairs, and bridge artists.",
      },
      {
        slug: "anomalies",
        title: "Anomalies & phase space",
        description: "Unusual sessions and recent daily stability.",
      },
    ],
  },
  {
    title: "Compare & reference",
    items: [
      {
        slug: "compare",
        title: "Compare mode",
        description: "Taste distance, session overlap, and discovery coupling.",
      },
      {
        slug: "glossary",
        title: "Glossary",
        description: "Definitions for every statistical term used in the app.",
      },
      {
        slug: "implementation",
        title: "Implementation",
        description: "Source files, workers, constants, and thresholds.",
      },
    ],
  },
];

export const allDocsPages = docsSections.flatMap((section) => section.items);

export const getDocsPage = (slug: string) => allDocsPages.find((page) => page.slug === slug);
