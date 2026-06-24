import { DocLead } from "@/docs/components/docs-primitives";
import { DocsPageHeader } from "@/docs/components/docs-layout";

const terms = [
  {
    term: "Scrobble",
    definition:
      "A single logged play event from Last.fm, with artist, track, album, and timestamp.",
  },
  {
    term: "Session",
    definition:
      "A contiguous block of scrobbles separated by gaps shorter than the adaptive session threshold (typically 90 min–6 h).",
  },
  {
    term: "Discovery rate",
    definition: "Share of scrobbles that are the first time you played that artist+track pair.",
  },
  {
    term: "Focus",
    definition: "Within a session, the fraction of plays belonging to the most-played artist.",
  },
  {
    term: "Gini coefficient",
    definition:
      "Inequality measure 0–1. Higher means play counts are concentrated in fewer artists.",
  },
  {
    term: "Jaccard similarity",
    definition:
      "Intersection size divided by union size of two sets. Used for overlap and graph similarity.",
  },
  {
    term: "Lorenz / concentration curve",
    definition: "Cumulative share of plays as you walk down the ranked artist list.",
  },
  {
    term: "Markov chain",
    definition:
      "Model of artist-to-artist transitions. Edge probability = switches to B when leaving A.",
  },
  {
    term: "Stationary distribution",
    definition:
      "Long-run artist mix implied by transition probabilities if you kept switching indefinitely within a session.",
  },
  {
    term: "Mixing time",
    definition:
      "Steps until the running distribution is close to the stationary distribution (L1 < 0.2).",
  },
  {
    term: "PMI (pointwise mutual information)",
    definition: "log₂(P(A,B) / (P(A)P(B))). Measures co-occurrence strength beyond chance.",
  },
  {
    term: "Shannon entropy",
    definition: "−Σ p log₂(p). Higher = more uniform distribution; lower = more concentrated.",
  },
  {
    term: "Total variation distance",
    definition: "½ Σ |P(a) − Q(a)|. Measures how different two probability distributions are.",
  },
  {
    term: "Kaplan-Meier estimator",
    definition:
      "Non-parametric survival curve: share of items not yet experiencing an event (replay) by time t.",
  },
  {
    term: "Hurst exponent",
    definition:
      "DFA slope measuring long-range dependence in daily play counts. >0.5 persistent, <0.5 anti-persistent.",
  },
  {
    term: "PACF",
    definition:
      "Partial autocorrelation: correlation with lag k after removing shorter lag effects.",
  },
  {
    term: "Recurrence",
    definition:
      "Whether days with similar profiles (volume, diversity, discovery) reappear in history.",
  },
  {
    term: "Lift",
    definition:
      "Pattern confidence divided by baseline probability. >1 means more common than random.",
  },
  {
    term: "Wasserstein distance",
    definition:
      "Earth mover's distance between distributions. Here approximated as sorted 1D L1 distance.",
  },
  {
    term: "Vibe group",
    definition:
      "Cluster of artists that frequently switch among each other in the Markov graph, from label propagation.",
  },
  {
    term: "Ergodicity (panel sense)",
    definition:
      "Comparison of time-average (lifetime) vs slice-average (monthly) top-artist dominance.",
  },
  {
    term: "Label propagation",
    definition:
      "Community detection: nodes adopt the weighted majority label of neighbors over repeated passes.",
  },
];

export function GlossaryPage() {
  return (
    <>
      <DocsPageHeader
        title="Glossary"
        description="Definitions for statistical and music-analytics terms used throughout the app."
      />
      <div className="grid gap-14">
        <DocLead>
          Terms are defined in the context of Scrobbling Away — they may differ slightly from
          textbook usage where we use simplified estimators.
        </DocLead>

        <dl className="grid gap-6">
          {terms.map((entry) => (
            <div key={entry.term}>
              <dt className="text-[13px] font-medium text-foreground">{entry.term}</dt>
              <dd className="mt-1 text-[14px] leading-[1.6] text-muted-foreground">
                {entry.definition}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </>
  );
}
