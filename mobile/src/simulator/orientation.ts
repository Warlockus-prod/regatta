import { useCallback, useEffect, type EffectCallback } from 'react';
import * as Router from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';

// The app is portrait everywhere except the trainers, where the owner allowed
// landscape (2026-10-19): the web trainers lay the scene out on the left and
// the control dock on the right when the phone is turned. The Info.plist
// allows every orientation and expo-screen-orientation starts the app locked
// to portrait (app.json plugin initialOrientation), so a screen unlocks only
// while it is focused and locks back on the way out. iPad without
// UIRequiresFullScreen cannot lock; the calls then fail quietly and iPad keeps
// its usual free rotation.

export function lockPortrait() {
  return ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => undefined);
}

// Outside a navigator (unit tests mock expo-router) a plain mount effect stands in for focus.
const useFocus: (effect: EffectCallback) => void = Router.useFocusEffect ?? ((effect) => useEffect(effect, [effect]));

export function useLandscapeWhileFocused(enabled: boolean) {
  useFocus(useCallback(() => {
    if (!enabled) return undefined;
    void ScreenOrientation.unlockAsync().catch(() => undefined);
    return () => { void lockPortrait(); };
  }, [enabled]));
}
