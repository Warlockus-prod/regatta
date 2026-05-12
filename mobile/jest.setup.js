/* eslint-env node */
/* global jest */

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View } = require('react-native');
  const passthrough = React.forwardRef((props, ref) =>
    React.createElement(View, { ...props, ref }, props && props.children),
  );
  const Animated = {
    View: passthrough,
    Text: passthrough,
    ScrollView: passthrough,
    Image: passthrough,
    createAnimatedComponent: (Comp) => Comp,
  };
  const noop = () => {};
  return {
    __esModule: true,
    default: Animated,
    ...Animated,
    useSharedValue: (initial) => ({ value: initial }),
    useAnimatedStyle: (factory) => {
      try {
        return typeof factory === 'function' ? factory() : {};
      } catch {
        return {};
      }
    },
    useAnimatedProps: () => ({}),
    useDerivedValue: (factory) => ({
      value: typeof factory === 'function' ? factory() : 0,
    }),
    useAnimatedReaction: noop,
    withTiming: (toValue) => toValue,
    withSpring: (toValue) => toValue,
    withDecay: (toValue) => toValue,
    withDelay: (_d, anim) => anim,
    withRepeat: (anim) => anim,
    withSequence: (anim) => anim,
    cancelAnimation: noop,
    runOnJS: (fn) => fn,
    runOnUI: (fn) => fn,
    Easing: {
      linear: (t) => t,
      ease: (t) => t,
      out: () => (t) => t,
      in: () => (t) => t,
      inOut: () => (t) => t,
      cubic: (t) => t,
      bezier: () => (t) => t,
    },
  };
});

jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  const { View } = require('react-native');
  const passthrough = (props) => React.createElement(View, props, props && props.children);
  const NoopPath = () => ({
    moveTo() {},
    lineTo() {},
    close() {},
    addCircle() {},
    addPath() {},
    transform() {},
  });
  return {
    __esModule: true,
    Canvas: passthrough,
    Group: passthrough,
    Path: passthrough,
    Circle: passthrough,
    Line: passthrough,
    Rect: passthrough,
    Text: passthrough,
    Skia: {
      Path: { Make: NoopPath },
      Color: () => 0,
      Matrix: () => ({ identity() {} }),
    },
    useValue: () => ({ current: 0 }),
    useComputedValue: () => ({ current: 0 }),
    useTiming: () => ({ current: 0 }),
  };
});

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  impactAsync: jest.fn().mockResolvedValue(undefined),
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Light: 'Light', Medium: 'Medium', Heavy: 'Heavy' },
  NotificationFeedbackType: { Success: 'Success', Warning: 'Warning', Error: 'Error' },
}));

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Pass = ({ children, ...rest }) => React.createElement(View, rest, children);
  const chain = () => {
    const obj = {};
    const methods = [
      'enabled',
      'minDistance',
      'runOnJS',
      'shouldCancelWhenOutside',
      'onBegin',
      'onStart',
      'onUpdate',
      'onChange',
      'onEnd',
      'onFinalize',
      'onTouchesDown',
      'onTouchesMove',
      'onTouchesUp',
      'simultaneousWithExternalGesture',
      'requireExternalGestureToFail',
      'activeOffsetX',
      'activeOffsetY',
    ];
    for (const m of methods) {
      obj[m] = () => obj;
    }
    return obj;
  };
  return {
    __esModule: true,
    GestureHandlerRootView: Pass,
    GestureDetector: Pass,
    Gesture: {
      Pan: chain,
      Tap: chain,
      LongPress: chain,
      Manual: chain,
      Race: () => chain(),
      Simultaneous: () => chain(),
      Exclusive: () => chain(),
    },
  };
});
