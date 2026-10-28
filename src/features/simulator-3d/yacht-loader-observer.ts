import type { GLTFLoader } from "three-stdlib";
import { recordSceneLifecycle } from "./scene-diagnostics";

type YachtLoader = Pick<GLTFLoader, "load" | "parse">;
const observed = new WeakSet<YachtLoader>();

/** Observe the existing loader callbacks, retaining its request, decoder,
 * progress, error identity and cache. URLs and model data never enter logs. */
export function observeYachtLoader(loader: YachtLoader): void {
  if (observed.has(loader)) return;
  observed.add(loader);
  const load = loader.load;
  const parse = loader.parse;
  loader.load = function (url, onLoad, onProgress, onError) {
    recordSceneLifecycle("asset", "begin");
    try {
      return load.call(this, url, value => {
        recordSceneLifecycle("asset", "ready"); onLoad(value);
      }, onProgress, onError && (error => {
        recordSceneLifecycle("asset", "error"); onError(error);
      }));
    } catch (error) {
      recordSceneLifecycle("asset", "error"); throw error;
    }
  };
  loader.parse = function (data, path, onLoad, onError) {
    recordSceneLifecycle("decode", "begin");
    try {
      return parse.call(this, data, path, value => {
        recordSceneLifecycle("decode", "ready"); onLoad(value);
      }, onError && (error => {
        recordSceneLifecycle("decode", "error"); onError(error);
      }));
    } catch (error) {
      recordSceneLifecycle("decode", "error"); throw error;
    }
  };
}
