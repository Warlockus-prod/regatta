import { Redirect } from "expo-router";

/** The app's full catalog lives under the Menu tab; old /library links land there. */
export default function LibraryRedirect() {
  return <Redirect href="/menu" />;
}
