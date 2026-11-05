import { StyleSheet } from "react-native";
import { render } from "@testing-library/react-native";
import { Text } from "../src/design-system/components/Text";

const styleOf = (element: React.ReactElement) => {
  const view = render(element);
  return StyleSheet.flatten(view.getByText("90").props.style);
};

describe("Text line height", () => {
  it("gives enlarged text a line tall enough for its glyphs, so iOS does not cut the top", () => {
    const style = styleOf(<Text style={{ fontSize: 46 }}>90</Text>);
    expect(style.fontSize).toBe(46);
    expect(style.lineHeight).toBeGreaterThanOrEqual(46 * 1.2);
  });

  it("also reads a size from a style array", () => {
    const style = styleOf(<Text style={[{ color: "red" }, { fontSize: 30 }]}>90</Text>);
    expect(style.lineHeight).toBeGreaterThanOrEqual(30 * 1.2);
  });

  it("keeps a line height the caller chose", () => {
    expect(styleOf(<Text style={{ fontSize: 46, lineHeight: 50 }}>90</Text>).lineHeight).toBe(50);
  });

  it("does not touch text that still fits the variant's line", () => {
    expect(styleOf(<Text style={{ fontSize: 20 }}>90</Text>).lineHeight).toBe(24);
    expect(styleOf(<Text>90</Text>).lineHeight).toBe(24);
  });

  it("leaves a variant without a fixed line alone", () => {
    expect(styleOf(<Text variant="accent" style={{ fontSize: 46 }}>90</Text>).lineHeight).toBeUndefined();
  });
});
