import { useSignUp } from "@clerk/expo";
import { useUpdateMyProfile } from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

type Role = "job_seeker" | "employer";

export default function SignUpScreen() {
  const colors = useColors();
  const { signUp, errors, fetchStatus } = useSignUp();
  const [step, setStep] = useState<"role" | "credentials" | "verify">("role");
  const [selectedRole, setSelectedRole] = useState<Role>("job_seeker");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");

  const { mutate: updateProfile } = useUpdateMyProfile();

  const isLoading = fetchStatus === "fetching";

  const handleSignUp = async () => {
    if (!email || !password) return;
    const { error } = await signUp.password({ emailAddress: email, password });
    if (error) {
      Alert.alert("Sign Up Failed", error.message || "Something went wrong.");
      return;
    }
    await signUp.verifications.sendEmailCode();
    setStep("verify");
  };

  const handleVerify = async () => {
    if (!code) return;
    await signUp.verifications.verifyEmailCode({ code });
    if (signUp.status === "complete") {
      await signUp.finalize({
        navigate: ({ decorateUrl }) => {
          if (selectedRole === "employer") {
            router.replace(decorateUrl("/employer-onboarding") as any);
          } else {
            router.replace(decorateUrl("/") as any);
          }
        },
      });
    } else {
      Alert.alert("Verification Failed", "Invalid or expired code.");
    }
  };

  // ── Step: Role selection ──
  if (step === "role") {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.scroll}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>I am a…</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Tell us how you'll be using SwipeJobs.
            </Text>
          </View>

          <View style={styles.roleCards}>
            <Pressable
              style={[
                styles.roleCard,
                {
                  backgroundColor: selectedRole === "job_seeker" ? colors.primary + "15" : colors.card,
                  borderColor: selectedRole === "job_seeker" ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setSelectedRole("job_seeker")}
            >
              <View style={[styles.roleIcon, { backgroundColor: selectedRole === "job_seeker" ? colors.primary + "25" : colors.secondary }]}>
                <Feather name="search" size={28} color={selectedRole === "job_seeker" ? colors.primary : colors.mutedForeground} />
              </View>
              <Text style={[styles.roleTitle, { color: selectedRole === "job_seeker" ? colors.primary : colors.foreground }]}>
                Job Seeker
              </Text>
              <Text style={[styles.roleDesc, { color: colors.mutedForeground }]}>
                Discover and swipe on jobs that match your skills and preferences.
              </Text>
              {selectedRole === "job_seeker" && (
                <View style={[styles.roleCheck, { backgroundColor: colors.primary }]}>
                  <Feather name="check" size={14} color="#fff" />
                </View>
              )}
            </Pressable>

            <Pressable
              style={[
                styles.roleCard,
                {
                  backgroundColor: selectedRole === "employer" ? colors.primary + "15" : colors.card,
                  borderColor: selectedRole === "employer" ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setSelectedRole("employer")}
            >
              <View style={[styles.roleIcon, { backgroundColor: selectedRole === "employer" ? colors.primary + "25" : colors.secondary }]}>
                <Feather name="briefcase" size={28} color={selectedRole === "employer" ? colors.primary : colors.mutedForeground} />
              </View>
              <Text style={[styles.roleTitle, { color: selectedRole === "employer" ? colors.primary : colors.foreground }]}>
                Employer
              </Text>
              <Text style={[styles.roleDesc, { color: colors.mutedForeground }]}>
                Post jobs and reach thousands of active, pre-qualified candidates.
              </Text>
              {selectedRole === "employer" && (
                <View style={[styles.roleCheck, { backgroundColor: colors.primary }]}>
                  <Feather name="check" size={14} color="#fff" />
                </View>
              )}
            </Pressable>
          </View>

          <Pressable
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={() => setStep("credentials")}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
            <Feather name="arrow-right" size={18} color="#fff" />
          </Pressable>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>Already have an account? </Text>
            <Pressable onPress={() => router.replace("/(auth)/sign-in")}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>Sign In</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Step: Verify email ──
  if (step === "verify") {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.scroll}>
          <Pressable style={styles.backButton} onPress={() => setStep("credentials")}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.foreground }]}>Check your email</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              We sent a 6-digit code to {email}
            </Text>
          </View>
          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Verification Code</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
                placeholder="123456"
                placeholderTextColor={colors.mutedForeground}
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                maxLength={6}
              />
              {errors.fields.code && (
                <Text style={[styles.errorText, { color: colors.destructive }]}>
                  {errors.fields.code.message}
                </Text>
              )}
            </View>
            <Pressable
              style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
              onPress={handleVerify}
              disabled={isLoading || code.length < 6}
            >
              {isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Verify & Continue</Text>}
            </Pressable>
            <Pressable onPress={() => signUp.verifications.sendEmailCode()} style={styles.resend}>
              <Text style={[styles.resendText, { color: colors.mutedForeground }]}>Didn't receive a code? </Text>
              <Text style={[styles.resendLink, { color: colors.primary }]}>Resend</Text>
            </Pressable>
          </View>
          <View nativeID="clerk-captcha" />
        </View>
      </SafeAreaView>
    );
  }

  // ── Step: Credentials ──
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable style={styles.backButton} onPress={() => setStep("role")}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>

          <View style={styles.header}>
            <View style={[styles.rolePill, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" }]}>
              <Feather name={selectedRole === "employer" ? "briefcase" : "search"} size={13} color={colors.primary} />
              <Text style={[styles.rolePillText, { color: colors.primary }]}>
                {selectedRole === "employer" ? "Employer" : "Job Seeker"}
              </Text>
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>Create account</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {selectedRole === "employer"
                ? "Start hiring from a pool of pre-qualified candidates."
                : "Start discovering your perfect job match."}
            </Text>
          </View>

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
                placeholder="you@example.com"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              {errors.fields.emailAddress && (
                <Text style={[styles.errorText, { color: colors.destructive }]}>
                  {errors.fields.emailAddress.message}
                </Text>
              )}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Password</Text>
              <View>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground, paddingRight: 48 }]}
                  placeholder="8+ characters"
                  placeholderTextColor={colors.mutedForeground}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <Pressable style={styles.eyeIcon} onPress={() => setShowPassword((v) => !v)}>
                  <Feather name={showPassword ? "eye-off" : "eye"} size={18} color={colors.mutedForeground} />
                </Pressable>
              </View>
              {errors.fields.password && (
                <Text style={[styles.errorText, { color: colors.destructive }]}>
                  {errors.fields.password.message}
                </Text>
              )}
            </View>

            <Pressable
              style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
              onPress={handleSignUp}
              disabled={isLoading || !email || !password}
            >
              {isLoading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Create Account</Text>}
            </Pressable>

            <View nativeID="clerk-captcha" />
          </View>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.mutedForeground }]}>Already have an account? </Text>
            <Pressable onPress={() => router.replace("/(auth)/sign-in")}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>Sign In</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 16 },
  backButton: { width: 40, height: 40, justifyContent: "center", marginBottom: 24 },
  header: { marginBottom: 32, gap: 8 },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  rolePillText: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  title: { fontSize: 30, fontWeight: "800", fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  roleCards: { gap: 14, marginBottom: 28 },
  roleCard: {
    borderRadius: 18,
    borderWidth: 2,
    padding: 20,
    gap: 10,
    position: "relative",
  },
  roleIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  roleTitle: { fontSize: 18, fontWeight: "800", fontFamily: "Inter_700Bold" },
  roleDesc: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  roleCheck: {
    position: "absolute",
    top: 16,
    right: 16,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  form: { gap: 20, marginBottom: 24 },
  fieldGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, fontFamily: "Inter_400Regular" },
  eyeIcon: { position: "absolute", right: 14, top: 0, bottom: 0, justifyContent: "center" },
  errorText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 8,
  },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  resend: { flexDirection: "row", justifyContent: "center", alignItems: "center" },
  resendText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  resendLink: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 12 },
  footerText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  footerLink: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
});
