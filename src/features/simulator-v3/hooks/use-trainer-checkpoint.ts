'use client';

import { useEffect, useRef, useState } from "react";
import { checkpointStorage } from "../../sailing-lab/runtime/checkpoint-storage";
import { readTrainerCheckpoint, writeTrainerCheckpoint, type TrainerCheckpoint } from "../../sailing-lab/runtime/trainer-checkpoint";

export type CheckpointStatus = "idle" | "saved" | "restored" | "empty" | "unavailable" | "corrupt" | "incompatible";
export function useTrainerCheckpoint(current: Omit<TrainerCheckpoint, "savedAt">, restore: (saved: TrainerCheckpoint) => void) {
  const [status, setStatus] = useState<CheckpointStatus>("idle");
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const actionRevision = useRef(0);
  useEffect(() => {
    let live = true;
    const revision = actionRevision.current;
    checkpointStorage.read().then(raw => { if (live && revision === actionRevision.current) setAvailable(raw !== null); })
      .catch(() => { if (live && revision === actionRevision.current) setStatus("unavailable"); });
    return () => { live = false; };
  }, []);
  const run = async (action: "save" | "restore") => {
    if (busyRef.current) return;
    actionRevision.current++;
    busyRef.current = true; setBusy(true);
    try {
      if (action === "save") {
        const raw = writeTrainerCheckpoint({ ...current, savedAt: Date.now() });
        await checkpointStorage.write(raw);
        setAvailable(true); setStatus("saved");
      } else {
        const raw = await checkpointStorage.read();
        if (raw === null) { setAvailable(false); setStatus("empty"); return; }
        const result = readTrainerCheckpoint(raw);
        if (!result.ok) { setStatus(result.reason); return; }
        restore(result.checkpoint); setStatus("restored");
      }
    } catch { setStatus("unavailable"); }
    finally { busyRef.current = false; setBusy(false); }
  };
  return { status, available, busy, save: () => void run("save"), restore: () => void run("restore") };
}
