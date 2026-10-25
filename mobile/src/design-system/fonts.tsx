import { createContext, useContext } from "react";
import type { TextStyle } from "react-native";

/** Full fonts include Latin and Cyrillic. No runtime font download is needed. */
export const SOURCE_SANS_FONTS = {
  SourceSans3Regular: require("../../assets/fonts/SourceSans3-Regular.ttf"),
  SourceSans3Semibold: require("../../assets/fonts/SourceSans3-Semibold.ttf"),
  SourceSans3Bold: require("../../assets/fonts/SourceSans3-Bold.ttf"),
};

export const AppFontContext = createContext(false);
export const useAppFontsReady = () => useContext(AppFontContext);

export function sourceSansFamily(weight: TextStyle["fontWeight"]): string {
  const numeric = weight === "bold" ? 700 : Number(weight ?? 400);
  return numeric >= 650 ? "SourceSans3Bold" : numeric >= 500 ? "SourceSans3Semibold" : "SourceSans3Regular";
}
