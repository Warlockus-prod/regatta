/** Invalidates in-flight race work before the serial global-clear sweep. */
let epoch = 0;
const listeners = new Set<() => void>();
export const nativeDataEpoch = () => epoch;
export function subscribeNativeDataEpoch(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function invalidateNativeDataEpoch(): void {
  epoch += 1;
  listeners.forEach(listener => listener());
}
