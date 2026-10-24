import { afterEach, describe, expect, it, vi } from "vitest";
import { RadioAudioEngine, type AudioRadioView } from "./RadioAudioEngine";

function audioNode() {
  const parameter = () => ({ value: 0, setValueAtTime: vi.fn(), setTargetAtTime: vi.fn() });
  const node = { gain: parameter(), frequency: parameter(), Q: parameter(), connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null };
  node.connect.mockReturnValue(node);
  return node;
}

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe("station speech channel routing", () => {
  it("keeps a station inaudible on the wrong channel even with SQL open, and follows retuning", () => {
    vi.useFakeTimers();
    const gains: ReturnType<typeof audioNode>[] = [];
    const sources: ReturnType<typeof audioNode>[] = [];
    class Context {
      currentTime = 0; sampleRate = 100; destination = audioNode();
      createGain() { const node = audioNode(); gains.push(node); return node; }
      createBiquadFilter() { return audioNode(); }
      createOscillator() { return audioNode(); }
      createBuffer() { return { getChannelData: () => new Float32Array(300) }; }
      createBufferSource() { const node = audioNode(); sources.push(node); return node; }
      close() { return Promise.resolve(); }
    }
    vi.stubGlobal("window", { AudioContext: Context });
    const engine = new RadioAudioEngine();
    const view: AudioRadioView = { power: true, volume: 15, squelch: 0, channelNum: "16", noVoice: false, ptt: false };
    engine.start(); engine.update(view);
    engine.speak({ duration: 3 } as AudioBuffer, "12");
    const stationGate = gains.at(-1)!;
    expect(stationGate.gain.value).toBe(0);
    engine.update({ ...view, channelNum: "12" });
    expect(stationGate.gain.setValueAtTime).toHaveBeenLastCalledWith(1, 0);
    engine.update(view);
    expect(stationGate.gain.setValueAtTime).toHaveBeenLastCalledWith(0, 0);
    engine.dispose();
    expect(sources.at(-1)!.stop).toHaveBeenCalled();
  });
});
