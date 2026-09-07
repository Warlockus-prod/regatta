import { Redirect, useLocalSearchParams } from "expo-router";
export default function MultiplayerRoom() {
  const { code } = useLocalSearchParams<{ code: string }>();
  return <Redirect href={{ pathname: "/multiplayer", params: { code } }} />;
}
