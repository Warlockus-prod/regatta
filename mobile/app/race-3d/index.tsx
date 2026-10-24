import { Redirect, useLocalSearchParams } from "expo-router";

/** Keep existing bookmarks while there is only one solo race entry. */
export default function LegacyRace3D() {
  const params = useLocalSearchParams<Record<string, string | string[]>>();
  return <Redirect href={{ pathname: "/game", params }} />;
}
