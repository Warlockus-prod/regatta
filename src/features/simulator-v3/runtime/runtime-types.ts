import type { SailingSession } from "../../sailing-lab/runtime/session";

// Legacy Trainer API. All authoritative simulation fields now belong to the
// common session. Only the course slider's intended heading is view-specific.
export interface RuntimeState extends SailingSession { targetHeading: number }
export { CONTROL_RATES } from "../../sailing-lab/runtime/controls";
export { HEADING_TURN_RATE_DEG_PER_S } from "../../sailing-lab/runtime/session";
