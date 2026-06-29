// Public surface of the standalone V2 (3D) simulator module.
//
// This barrel exposes ONLY the portable, framework-agnostic pieces (react +
// three + r3f + drei). The Next.js-coupled wrapper SimulatorV2.tsx is imported
// directly by the route (src/app/simulator2/page.tsx) and is intentionally NOT
// re-exported here, so `import { Simulator3D } from '.../simulator-3d'` never
// statically pulls in next/* or the app i18n.

export { Simulator3D, type Simulator3DProps } from './Simulator3D'; // portable core
export { RegattaScene } from './RegattaScene';
export { Yacht } from './Yacht';
export { Ocean } from './ocean/Ocean';
export { WindDial } from './ui/WindDial';
export { useSailAudio } from './audio/useSailAudio';
export { useSailingSim, type SimTelemetry } from './physics/useSailingSim';
export { SIM_V2_ENABLED, YACHT_MODEL_URL } from './config';
export { DEFAULT_LABELS, NEUTRAL_YACHT, type YachtState, type SimLabels } from './types';
export * as sailModel from './physics/sailModel';
