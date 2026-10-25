import { describe, expect, it } from "vitest";
import { createDiagnosticJournal } from "@/lib/diagnostics";
import { createInitialRadio, CHANNELS, radioReducer, type RadioState } from "./radioModel";
import { radioCommandDiagnostic, recordRadioCommand, recordRadioCommandFailure } from "./commandDiagnostics";

const on = () => radioReducer(createInitialRadio(), { type: "dial-hold" });
describe("safe radio command diagnostics", () => {
  it("reports a real change and a clamp as accepted and noop, rather than object identity", () => {
    const state: RadioState = { ...on(), screen: "volume", volume: 20 };
    const event = { type: "dial-rotate", dir: 1 } as const;
    const clamped = radioReducer(state, event);
    expect(clamped).not.toBe(state);
    expect(radioCommandDiagnostic(state, event, clamped)).toMatchObject({ outcome: "noop", reason: "limit", volume: 20 });
    const decrease = { type: "dial-rotate", dir: -1 } as const;
    expect(radioCommandDiagnostic(state, decrease, radioReducer(state, decrease))).toMatchObject({ outcome: "accepted", volume: 19 });
  });
  it("distinguishes powered-off commands and prohibited voice on channel70", () => {
    const off = createInitialRadio(), event = { type: "dial-push" } as const;
    expect(radioCommandDiagnostic(off, event, radioReducer(off, event))).toMatchObject({ outcome: "rejected", reason: "power-off" });
    const state = { ...on(), channelIndex: CHANNELS.findIndex(item => item.num === "70") }, ptt = { type: "ptt-down" } as const;
    expect(radioCommandDiagnostic(state, ptt, radioReducer(state, ptt))).toMatchObject({ outcome: "rejected", reason: "tx-inhibit", channel: 70 });
  });
  it("emits only meaningful automatic scan/watch transitions", () => {
    const state = on();
    expect(radioCommandDiagnostic(state, { type: "scan-tick" }, state)).toBeNull();
    expect(radioCommandDiagnostic(state, { type: "dw-tick", sixteenBusy: false }, state)).toBeNull();
  });
  it("does not inspect or serialize private source fields, logs or command payloads", () => {
    const state = on();
    for (const key of ["vessel", "pos", "idEntryMmsi", "positionTime", "deviceLog", "rxDistress", "rxCall", "odSent", "coast"] as const) Object.defineProperty(state, key, { get: () => { throw new Error("PRIVATE_CANARY"); } });
    const projected = radioCommandDiagnostic(state, { type: "menu" }, { ...on(), screen: "menu" });
    expect(projected).toMatchObject({ outcome: "accepted", screenTo: "menu" });
    expect(JSON.stringify(projected)).not.toContain("PRIVATE_CANARY");
    expect(createDiagnosticJournal({ now: () => 0 }).record(projected!)).not.toBeNull();
  });
  it("can classify a protected MMSI digit turn without reading that identifier", () => {
    const before = { ...on(), screen: "individual-id-add-mmsi" } as RadioState;
    const after = { ...before };
    Object.defineProperty(before, "idEntryMmsi", { get: () => { throw new Error("PRIVATE_MMSI"); } });
    Object.defineProperty(after, "idEntryMmsi", { get: () => { throw new Error("PRIVATE_MMSI"); } });
    expect(radioCommandDiagnostic(before, { type: "dial-rotate", dir: 1 }, after)).toMatchObject({ outcome: "accepted" });
  });
  it("neither recorder failure nor a private raw error can interrupt a command", () => {
    const state = on(), event = { type: "menu" } as const, after = radioReducer(state, event);
    expect(() => recordRadioCommand(state, event, after, () => { throw new Error("PRIVATE_STORAGE"); })).not.toThrow();
    const records: unknown[] = [];
    recordRadioCommandFailure(state, event, record => records.push(record));
    expect(records).toEqual([{ type: "radio.command", surface: "radio", action: "menu", outcome: "failed", reason: "unknown", model: "M330", screenFrom: "standby", power: true }]);
  });
});
