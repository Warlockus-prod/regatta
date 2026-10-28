import { render } from "@testing-library/react-native";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { StyleSheet, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppSurface, appStackOptions, appSurface, DarkSurface } from "../src/design-system/surface";
import { lightColors, darkColors } from "../src/design-system/tokens";
import { Screen } from "../src/design-system/components/Screen";
import { Text } from "../src/design-system/components/Text";
import { Slider } from "../src/design-system/components/Slider";
import { Icon } from "../src/design-system/components/Icon";

const metrics = { insets: { top: 47, bottom: 34, left: 0, right: 0 }, frame: { x: 0, y: 0, width: 390, height: 844 } };

it("keeps the native launch background and activity chrome on the app day surface even under a dark scene boundary", () => {
  const view = render(<SafeAreaProvider initialMetrics={metrics}><DarkSurface>
    <Text testID="scene-label">Scene</Text>
    <AppSurface><Screen><Text testID="app-label">Activity</Text><Icon name="unknown-icon" /></Screen></AppSurface>
  </DarkSurface></SafeAreaProvider>);
  expect(appSurface).toBe("light");
  expect(StyleSheet.flatten(view.getByTestId("app-label").props.style).color).toBe(lightColors.textPrimary);
  expect(StyleSheet.flatten(view.getByTestId("scene-label").props.style).color).toBe(darkColors.textPrimary);
  expect(StyleSheet.flatten(view.getByText("?").props.style).color).toBe(lightColors.textPrimary);
  const screen = view.UNSAFE_getByType(Screen);
  const firstActivityStyle = StyleSheet.flatten(screen.findByType(require("react-native").View).props.style);
  expect(firstActivityStyle).toMatchObject({ backgroundColor: lightColors.bgPrimary, paddingTop: 47, paddingBottom: 34 });
  const config = JSON.parse(readFileSync(join(__dirname, "../app.json"), "utf8")).expo;
  const { getIosSplashConfig } = require("@expo/prebuild-config/build/plugins/unversioned/expo-splash-screen/getIosSplashConfig");
  expect(config.userInterfaceStyle).toBe(appSurface);
  expect(getIosSplashConfig(config, null).backgroundColor).toBe(firstActivityStyle.backgroundColor);
  expect(appStackOptions).toMatchObject({ headerStyle: { backgroundColor: lightColors.bgPrimary }, contentStyle: { backgroundColor: lightColors.bgPrimary }, headerTintColor: lightColors.accentCyan, statusBarStyle: "dark" });
});

it("lets an explicit dark diagram keep its own readable icon without leaking into the next app surface", () => {
  const view = render(<DarkSurface><Icon name="unknown-icon" /><AppSurface><Icon name="unknown-icon" color={lightColors.warning} /></AppSurface></DarkSurface>);
  const icons = view.getAllByText("?");
  expect(StyleSheet.flatten(icons[0].props.style).color).toBe(darkColors.textPrimary);
  expect(StyleSheet.flatten(icons[1].props.style).color).toBe(lightColors.warning);
});

it.each(["horizontal", "vertical"] as const)("keeps %s slider labels readable on both surfaces while retaining adjustable input", (orientation) => {
  const onChange = jest.fn();
  const view = render(<View><AppSurface><Slider label="Main sheet" value={0.5} onChange={onChange} orientation={orientation} /></AppSurface></View>);
  expect(StyleSheet.flatten(view.getByText("Main sheet").props.style).color).toBe(lightColors.textSecondary);
  expect(view.getByRole("adjustable").props.accessibilityValue.now).toBe(50);
  view.rerender(<View><DarkSurface><Slider label="Main sheet" value={0.5} onChange={onChange} orientation={orientation} /></DarkSurface></View>);
  expect(StyleSheet.flatten(view.getByText("Main sheet").props.style).color).toBe(darkColors.textSecondary);
  expect(onChange).not.toHaveBeenCalled();
});
