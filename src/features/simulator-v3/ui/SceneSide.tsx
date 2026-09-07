'use client';

import { SceneElevation } from "./SceneElevation";
import type { SimulationModel, TpFn, UiState } from "./shared";

export function SceneSide(props: { ui: UiState; sim: SimulationModel; tp: TpFn }) {
  return <SceneElevation view="side" {...props} />;
}
