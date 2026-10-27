import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GLTF, GLTFLoader } from "three-stdlib";
import { observeYachtLoader } from "./yacht-loader-observer";

const { report } = vi.hoisted(() => ({ report: vi.fn() }));
vi.mock("./scene-diagnostics", () => ({ recordSceneLifecycle: report }));
beforeEach(() => report.mockReset());

function fixture() {
  const load = vi.fn<GLTFLoader["load"]>();
  const parse = vi.fn<GLTFLoader["parse"]>();
  const loader = { load, parse };
  observeYachtLoader(loader);
  return { loader, load, parse };
}

describe("actual yacht asset and decode observations", () => {
  it("keeps a pending load pending, forwarding its request, progress and exact result", () => {
    const { loader, load } = fixture();
    const result = {} as GLTF, ready = vi.fn(), progress = vi.fn(), error = vi.fn();
    loader.load("private-model-url", ready, progress, error);
    expect(load.mock.instances[0]).toBe(loader);
    expect(load.mock.calls[0][0]).toBe("private-model-url");
    expect(load.mock.calls[0][2]).toBe(progress);
    expect(report.mock.calls).toEqual([["asset", "begin"]]);
    load.mock.calls[0][1](result);
    expect(ready).toHaveBeenCalledExactlyOnceWith(result);
    expect(report.mock.calls).toEqual([["asset", "begin"], ["asset", "ready"]]);
    expect(JSON.stringify(report.mock.calls)).not.toContain("private");
  });

  it("separates actual decode completion from the asset request", () => {
    const { loader, parse } = fixture();
    const data = new ArrayBuffer(16), result = {} as GLTF, ready = vi.fn();
    loader.parse(data, "private-resource-path", ready, vi.fn());
    expect(parse.mock.instances[0]).toBe(loader);
    expect(parse.mock.calls[0].slice(0, 2)).toEqual([data, "private-resource-path"]);
    expect(report.mock.calls).toEqual([["decode", "begin"]]);
    parse.mock.calls[0][2](result);
    expect(ready).toHaveBeenCalledExactlyOnceWith(result);
    expect(report.mock.calls).toEqual([["decode", "begin"], ["decode", "ready"]]);
    expect(JSON.stringify(report.mock.calls)).not.toContain("private");
  });

  it.each(["load", "parse"] as const)("preserves the actual %s error object and callback", method => {
    const { loader, load, parse } = fixture();
    const error = { message: "private-error" } as ErrorEvent, failed = vi.fn();
    if (method === "load") {
      loader.load("private", vi.fn(), undefined, failed);
      load.mock.calls[0][3]!(error);
    } else {
      loader.parse(new ArrayBuffer(1), "private", vi.fn(), failed);
      parse.mock.calls[0][3]!(error);
    }
    expect(failed).toHaveBeenCalledExactlyOnceWith(error);
    expect(report.mock.calls).toEqual([[method === "load" ? "asset" : "decode", "begin"], [method === "load" ? "asset" : "decode", "error"]]);
    expect(JSON.stringify(report.mock.calls)).not.toContain("private");
  });

  it.each(["load", "parse"] as const)("does not swallow synchronous %s failure", method => {
    const { loader, load, parse } = fixture();
    const error = new Error("private-error");
    (method === "load" ? load : parse).mockImplementation(() => { throw error; });
    expect(() => method === "load" ? loader.load("private", vi.fn()) : loader.parse(new ArrayBuffer(1), "private", vi.fn(), vi.fn())).toThrow(error);
    expect(report.mock.calls.at(-1)).toEqual([method === "load" ? "asset" : "decode", "error"]);
  });

  it("does not stack wrappers on repeated renders or replace the absent load error callback", () => {
    const { loader, load } = fixture();
    const wrapped = loader.load;
    observeYachtLoader(loader); observeYachtLoader(loader);
    expect(loader.load).toBe(wrapped);
    loader.load("private", vi.fn());
    expect(load.mock.calls[0][3]).toBeUndefined();
    expect(report.mock.calls).toEqual([["asset", "begin"]]);
  });
});
