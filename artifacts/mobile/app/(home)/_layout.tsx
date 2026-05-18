import { useAuth } from "@clerk/expo";
import { useGetMyProfile, getGetMyProfileQueryKey } from "@workspace/api-client-react";
import { Redirect, Stack } from "expo-router";
import React from "react";

export default function HomeLayout() {
  const { isSignedIn, isLoaded } = useAuth();

  const { data: profile } = useGetMyProfile({
    query: { queryKey: getGetMyProfileQueryKey(), enabled: !!isSignedIn && isLoaded },
  });

  if (!isLoaded) return null;

  if (isSignedIn && profile && !profile.onboardingCompleted) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="job/[id]"
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
      <Stack.Screen name="admin" />
    </Stack>
  );
}
