jest.mock("../assets/sailing-offline.html", () => 123);
jest.mock("../src/i18n/context", () => ({ useI18n: () => ({ lang: "en" }) }));
jest.mock("../src/simulator/SimWebView", () => {
  const React = require("react"); const { View } = require("react-native");
  return { SimWebView: (props: object) => React.createElement(View, { ...props, testID: "local-ads" }) };
});
import { render } from "@testing-library/react-native";
import Ads from "../app/ads";
import { showsMainNavigation } from "../src/navigation/visibility";
import { sailingNativeDestination } from "../src/navigation/sailing-entry";

it("opens a bundled Ads lab with a Settings recovery path and reserved controls", () => {
  const host = render(<Ads />).getByTestId("local-ads");
  expect(host.props).toMatchObject({ path: "/ads", title: "Ads", offlineSource: 123, fallbackRoute: "/settings", fallbackLabel: "Return to Settings" });
  expect(host.props.tier).toBeUndefined();
  expect(showsMainNavigation("/ads")).toBe(false);
  expect(showsMainNavigation("/settings")).toBe(true);
  expect(sailingNativeDestination("/ads")).toBe("/ads");
});
