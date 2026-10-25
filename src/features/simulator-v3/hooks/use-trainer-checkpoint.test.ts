import { beforeEach, describe, expect, it, vi } from "vitest";
import { recordWebDiagnostic } from "@/lib/diagnostics-web";
import { checkpointStorage } from "../../sailing-lab/runtime/checkpoint-storage";
import { writeTrainerCheckpoint } from "../../sailing-lab/runtime/trainer-checkpoint";
import { createRuntimeState } from "../runtime/create-runtime-state";
import { FREE_TRAINER_UI } from "../ui/shared";
import { getBoatParams } from "@/lib/sailing-physics";
import { useTrainerCheckpoint } from "./use-trainer-checkpoint";
vi.mock("react", async original => ({ ...await original<typeof import("react")>(),
  useEffect: () => {}, useRef: (current: unknown) => ({ current }), useState: (initial: unknown) => [initial, () => {}],
}));
vi.mock("@/lib/diagnostics-web", () => ({ recordWebDiagnostic: vi.fn() }));
vi.mock("../../sailing-lab/runtime/checkpoint-storage", () => ({ checkpointStorage: { read: vi.fn(), write: vi.fn() } }));
const current = { ui: FREE_TRAINER_UI, session: createRuntimeState({ ui: FREE_TRAINER_UI, params: getBoatParams() }), study: null };
beforeEach(() => { vi.mocked(recordWebDiagnostic).mockReset(); vi.mocked(checkpointStorage.read).mockReset(); vi.mocked(checkpointStorage.write).mockReset(); });
describe("checkpoint command outcomes", () => {
  it("does not claim a durable save while its storage promise is pending", async () => {
    let acknowledge!: () => void;
    vi.mocked(checkpointStorage.write).mockImplementation(() => new Promise(resolve => { acknowledge = () => resolve(null); }));
    const checkpoint = useTrainerCheckpoint(current, vi.fn());
    checkpoint.save();
    expect(checkpointStorage.write).toHaveBeenCalledOnce();
    expect(recordWebDiagnostic).not.toHaveBeenCalled();
    checkpoint.save();
    expect(recordWebDiagnostic).toHaveBeenCalledWith(expect.objectContaining({ type: "trainer.checkpoint", action: "save", outcome: "rejected", reason: "disabled" }));
    acknowledge();
    await vi.waitFor(() => expect(recordWebDiagnostic).toHaveBeenCalledWith(expect.objectContaining({ action: "save", outcome: "accepted" })));
  });
  it.each([[null, "noop", "not-found"], ["{", "rejected", "storage-invalid"]] as const)("distinguishes a %s restore without applying it", async (raw, outcome, reason) => {
    vi.mocked(checkpointStorage.read).mockResolvedValue(raw);
    const restore = vi.fn(); useTrainerCheckpoint(current, restore).restore();
    await vi.waitFor(() => expect(recordWebDiagnostic).toHaveBeenCalledWith(expect.objectContaining({ action: "restore", outcome, reason })));
    expect(restore).not.toHaveBeenCalled();
  });
  it("reports failed reads without exposing the actual storage error", async () => {
    vi.mocked(checkpointStorage.read).mockRejectedValue(new Error("private error"));
    useTrainerCheckpoint(current, vi.fn()).restore();
    await vi.waitFor(() => expect(recordWebDiagnostic).toHaveBeenCalledWith(expect.objectContaining({ action: "error", outcome: "failed", reason: "storage-read" })));
    expect(JSON.stringify(vi.mocked(recordWebDiagnostic).mock.calls)).not.toContain("private error");
  });
  it("restores the actual validated checkpoint even when the diagnostic recorder fails", async () => {
    vi.mocked(checkpointStorage.read).mockResolvedValue(writeTrainerCheckpoint({ ...current, savedAt: 1 }));
    vi.mocked(recordWebDiagnostic).mockImplementation(() => { throw new Error("diagnostic error"); });
    const restore = vi.fn(); useTrainerCheckpoint(current, restore).restore();
    await vi.waitFor(() => expect(restore).toHaveBeenCalledOnce());
    expect(restore.mock.calls[0][0]).toEqual({ ...current, savedAt: 1 });
  });
});
