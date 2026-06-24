import { useDashboardSnapshot } from "../dashboard-context";
import { SectionTitle } from "../section-title";
import { AnomalyPanel, PhaseSpacePanel } from "./advanced/anomaly-panels";
import { CompareAdvancedPanel } from "./advanced/compare-panels";
import { GraphStructurePanel } from "./advanced/graph-panels";
import {
  CounterfactualPanel,
  EntropyPanel,
  ErgodicityPanel,
  TasteDriftPanel,
  TransferEntropyPanel,
} from "./advanced/information-panels";
import {
  HawkesPanel,
  ListeningModesPanel,
  MarkovChainPanel,
  SequentialPatternsPanel,
} from "./advanced/sequential-panels";
import {
  AlbumDecayPanel,
  CohortRetentionPanel,
  InterArrivalPanel,
  SurvivalPanel,
} from "./advanced/survival-panels";
import {
  ChangePointsPanel,
  DecompositionPanel,
  DfaPanel,
  PacfPanel,
  RecurrencePanel,
} from "./advanced/time-series-panels";

export function AdvancedAnalyticsSection() {
  const advanced = useDashboardSnapshot().derived.analytics.advanced;

  return (
    <div className="grid gap-8">
      <SectionTitle description="Sessions, artist switches, retention, taste drift, and more.">
        Advanced analytics
      </SectionTitle>
      <div className="columns-1 gap-x-10 lg:columns-2">
        <MarkovChainPanel analytics={advanced.markov} />
        <ListeningModesPanel analytics={advanced.listeningModes} />
        <HawkesPanel analytics={advanced.hawkes} />
        <SequentialPatternsPanel analytics={advanced.sequentialPatterns} />
        <EntropyPanel analytics={advanced.entropy} />
        <TransferEntropyPanel analytics={advanced.transferEntropy} />
        <TasteDriftPanel analytics={advanced.tasteDrift} />
        <CounterfactualPanel analytics={advanced.counterfactual} />
        <ErgodicityPanel analytics={advanced.ergodicity} />
        <ChangePointsPanel analytics={advanced.changePoints} />
        <DecompositionPanel analytics={advanced.decomposition} />
        <DfaPanel analytics={advanced.dfa} />
        <PacfPanel analytics={advanced.pacf} />
        <RecurrencePanel analytics={advanced.recurrence} />
        <SurvivalPanel analytics={advanced.survival} />
        <CohortRetentionPanel analytics={advanced.cohortRetention} />
        <InterArrivalPanel analytics={advanced.interArrival} />
        <AlbumDecayPanel analytics={advanced.albumDecay} />
        <GraphStructurePanel analytics={advanced.graph} />
        <AnomalyPanel analytics={advanced.anomalies} />
        <PhaseSpacePanel analytics={advanced.phaseSpace} />
      </div>
    </div>
  );
}

export function CompareAdvancedAnalyticsSection({
  analytics,
}: {
  analytics: import("@/lib/compare-advanced-analytics").CompareAdvancedAnalytics;
}) {
  return (
    <section className="grid gap-8">
      <SectionTitle description="Artist overlap, session grouping, and discovery timing between compared listeners.">
        Advanced compare
      </SectionTitle>
      <CompareAdvancedPanel analytics={analytics} />
    </section>
  );
}
