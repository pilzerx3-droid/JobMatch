import { useSSO } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import * as AuthSession from "expo-auth-session";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

WebBrowser.maybeCompleteAuthSession();

export default function WelcomeScreen() {
  const colors = useColors();
  const [loading, setLoading] = useState(false);
  const { startSSOFlow } = useSSO();

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId) {
        await setActive!({
          session: createdSessionId,
          navigate: ({ decorateUrl }) => {
            router.replace(decorateUrl("/") as any);
          },
        });
      }
    } catch (err) {
      console.error("OAuth error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={["#09090B", "#0F0F12", "#18181B"]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.topSection}>
          <View style={[styles.logoContainer, { backgroundColor: colors.primary }]}>
            <Feather name="briefcase" size={40} color="#FFFFFF" />
          </View>
          <Text style={styles.appName}>SwipeJobs</Text>
          <Text style={styles.tagline}>
            Find your dream job,{"\n"}one swipe at a time.
          </Text>
        </View>

        <View style={styles.previewCards}>
          {["Senior Engineer", "Product Designer", "ML Engineer"].map(
            (title, i) => (
              <View
                key={title}
                style={[
                  styles.previewCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    transform: [
                      { rotate: `${(i - 1) * 5}deg` },
                      { translateY: i * 4 },
                    ],
                    zIndex: 3 - i,
                  },
                ]}
              >
                <Text style={[styles.previewTitle, { color: colors.foreground }]}>
                  {title}
                </Text>
                <Text style={[styles.previewMeta, { color: colors.mutedForeground }]}>
                  $140k – $200k · Remote
                </Text>
              </View>
            )
          )}
        </View>

        <View style={styles.bottomSection}>
          {Platform.OS !== "web" && (
            <Pressable
              style={({ pressed }) => [
                styles.googleButton,
                { backgroundColor: "#FFFFFF", opacity: pressed ? 0.9 : 1 },
              ]}
              onPress={handleGoogleSignIn}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#09090B" />
              ) : (
                <>
                  <Feather name="globe" size={20} color="#09090B" />
                  <Text style={styles.googleButtonText}>
                    Continue with Google
                  </Text>
                </>
              )}
            </Pressable>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.emailButton,
              { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={() => router.push("/(auth)/sign-up")}
          >
            <Feather name="mail" size={20} color="#FFFFFF" />
            <Text style={styles.emailButtonText}>Continue with Email</Text>
          </Pressable>

          <View style={styles.signinRow}>
            <Text style={[styles.signinText, { color: colors.mutedForeground }]}>
              Already have an account?{" "}
            </Text>
            <Pressable onPress={() => router.push("/(auth)/sign-in")}>
              <Text style={[styles.signinLink, { color: colors.primary }]}>
                Sign In
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 28 },
  topSection: { alignItems: "center", marginTop: 60 },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  appName: {
    fontSize: 36,
    fontWeight: "800",
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
  },
  tagline: {
    fontSize: 18,
    color: "#A1A1AA",
    textAlign: "center",
    marginTop: 12,
    lineHeight: 26,
    fontFamily: "Inter_400Regular",
  },
  previewCards: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 40,
  },
  previewCard: {
    position: "absolute",
    width: 280,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    marginBottom: 6,
  },
  previewMeta: { fontSize: 14, fontFamily: "Inter_400Regular" },
  bottomSection: { paddingBottom: 40, gap: 14 },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#09090B",
    fontFamily: "Inter_600SemiBold",
  },
  emailButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  emailButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    fontFamily: "Inter_600SemiBold",
  },
  signinRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  signinText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  signinLink: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
});
