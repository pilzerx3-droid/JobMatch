import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";

export default function Index() {
  const { isLoaded } = useAuth();
  if (!isLoaded) return null;
  return <Redirect href="/(home)/(tabs)" />;
}
