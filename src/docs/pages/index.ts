import type { ComponentType } from "react";

import { AnomaliesPage } from "./anomalies";
import { ArtistSwitchesPage } from "./artist-switches";
import { ComparePage } from "./compare";
import { ConcentrationPage } from "./concentration";
import { DataPipelinePage } from "./data-pipeline";
import { DiscoveryReplayPage } from "./discovery-replay";
import { GlossaryPage } from "./glossary";
import { GraphStructurePage } from "./graph-structure";
import { ImplementationPage } from "./implementation";
import { InformationTheoryPage } from "./information-theory";
import { LibraryGrowthPage } from "./library-growth";
import { ListeningRhythmPage } from "./listening-rhythm";
import { ListeningSessionsPage } from "./listening-sessions";
import { OverlapPage } from "./overlap";
import { OverviewPage } from "./overview";
import { RetentionPage } from "./retention";
import { SequentialAnalysisPage } from "./sequential-analysis";
import { SessionTypesPage } from "./session-types";
import { TimeSeriesPage } from "./time-series";

export const docsPageComponents: Record<string, ComponentType> = {
  overview: OverviewPage,
  "data-pipeline": DataPipelinePage,
  "listening-sessions": ListeningSessionsPage,
  concentration: ConcentrationPage,
  "discovery-replay": DiscoveryReplayPage,
  "library-growth": LibraryGrowthPage,
  overlap: OverlapPage,
  "listening-rhythm": ListeningRhythmPage,
  "artist-switches": ArtistSwitchesPage,
  "session-types": SessionTypesPage,
  "sequential-analysis": SequentialAnalysisPage,
  "information-theory": InformationTheoryPage,
  "time-series": TimeSeriesPage,
  retention: RetentionPage,
  "graph-structure": GraphStructurePage,
  anomalies: AnomaliesPage,
  compare: ComparePage,
  glossary: GlossaryPage,
  implementation: ImplementationPage,
};
