import {
  useCreateEmployerProfile,
  useUpdateMyProfile,
} from "@workspace/api-client-react";
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

const STEPS = 4;

const COMPANY_SIZES = [
  { key: "1-10", label: "Startup", desc: "1–10 employees" },
  { key: "11-50", label: "Small", desc: "11–50 employees" },
  { key: "51-200", label: "Mid-size", desc: "51–200 employees" },
  { key: "201-1000", label: "Large", desc: "201–1000 employees" },
  { key: "1000+", label: "Enterprise", desc: "1000+ employees" },
];

const INDUSTRIES = [
  "Technology", "Finance", "Healthcare", "E-commerce", "Education",
  "Media", "Real Estate", "Manufacturing", "Consulting", "Other",
];

export default function EmployerOnboardingScreen() {
  const colors = useColors();
  const [step, setStep] = useState(0);

  // Step 0: company name + website
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");

  // Step 1: company size (stored in description for now)
  const [companySize, setCompanySize] = useState("");

  // Step 2: industry
  const [industry, setIndustry] = useState("");

  // Step 3: description
  const [description, setDescription] = useState("");

  const { mutate: createProfile, isPending: isCreating } = useCreateEmployerProfile({
    mutation: {
      onSuccess: () => {
        router.replace("/(home)/(tabs)");
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.error ?? "Something went wrong. Please try again.";
        Alert.alert("Error", msg);
      },
    },
  });

  const { mutate: updateProfile, isPending: isUpdating } = useUpdateMyProfile();

  const isPending = isCreating || isUpdating;

  const canProceed = () => {
    if (step === 0) return companyName.trim().length > 0;
    if (step === 1) return !!companySize;
    if (step === 2) return !!industry;
    return true;
  };

  const handleNext = () => {
    if (step < STEPS - 1) setStep((s) => s + 1);
    else handleComplete();
  };

  const handleComplete = () => {
    const fullDesc = [
      description.trim(),
      companySize ? `Company size: ${companySize}` : "",
      industry ? `Industry: ${industry}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    createProfile({
      data: {
        companyName: companyName.trim(),
        companyWebsite: companyWebsite.trim() || undefined,
        description: fullDesc || undefined,
      },
    });
  };

  const progress = ((step + 1) / STEPS) * 100;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Progress header */}
      <View style={styles.header}>
        {step > 0 && (
          <Pressable style={styles.backBtn} onPress={() => setStep((s) => s - 1)}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
        )}
        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { backgroundColor: colors.primary, width: `${progress}%` }]} />
        </View>
        <Text style={[styles.stepText, { color: colors.mutedForeground }]}>
          Step {step + 1} of {STEPS}
        </Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Step 0: Company basics */}
          {step === 0 && (
            <View style={styles.stepContent}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primary + "15" }]}>
                <Feather name="briefcase" size={28} color={colors.primary} />
              </View>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>
                Tell us about your company
              </Text>
              <Text style={[styles.stepSubtitle, { color: colors.mutedForeground }]}>
                This is what job seekers will see on your listings.
              </Text>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>Company Name *</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="Acme Corp"
                  placeholderTextColor={colors.mutedForeground}
                  value={companyName}
                  onChangeText={setCompanyName}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>Company Website</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="https://acmecorp.com"
                  placeholderTextColor={colors.mutedForeground}
                  value={companyWebsite}
                  onChangeText={setCompanyWebsite}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>
            </View>
          )}

          {/* Step 1: Company size */}
          {step === 1 && (
            <View style={styles.stepContent}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primary + "15" }]}>
                <Feather name="users" size={28} color={colors.primary} />
              </View>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>
                How big is your team?
              </Text>
              <Text style={[styles.stepSubtitle, { color: colors.mutedForeground }]}>
                This helps match you with the right candidates.
              </Text>
              <View style={styles.optionList}>
                {COMPANY_SIZES.map((size) => (
                  <Pressable
                    key={size.key}
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: companySize === size.key ? colors.primary + "18" : colors.card,
                        borderColor: companySize === size.key ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setCompanySize(size.key)}
                  >
                    <View>
                      <Text style={[styles.optionTitle, { color: companySize === size.key ? colors.primary : colors.foreground }]}>
                        {size.label}
                      </Text>
                      <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>
                        {size.desc}
                      </Text>
                    </View>
                    {companySize === size.key && (
                      <Feather name="check-circle" size={20} color={colors.primary} />
                    )}
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Step 2: Industry */}
          {step === 2 && (
            <View style={styles.stepContent}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primary + "15" }]}>
                <Feather name="tag" size={28} color={colors.primary} />
              </View>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>
                What industry are you in?
              </Text>
              <View style={styles.chipGrid}>
                {INDUSTRIES.map((ind) => (
                  <Pressable
                    key={ind}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: industry === ind ? colors.primary : colors.card,
                        borderColor: industry === ind ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setIndustry(ind)}
                  >
                    <Text style={[styles.chipText, { color: industry === ind ? "#fff" : colors.foreground }]}>
                      {ind}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {/* Step 3: Description */}
          {step === 3 && (
            <View style={styles.stepContent}>
              <View style={[styles.iconCircle, { backgroundColor: colors.primary + "15" }]}>
                <Feather name="file-text" size={28} color={colors.primary} />
              </View>
              <Text style={[styles.stepTitle, { color: colors.foreground }]}>
                Describe your company
              </Text>
              <Text style={[styles.stepSubtitle, { color: colors.mutedForeground }]}>
                Optional — tell candidates what makes your company special.
              </Text>
              <View style={styles.fieldGroup}>
                <Text style={[styles.label, { color: colors.foreground }]}>Company Description</Text>
                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                    { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground },
                  ]}
                  placeholder="We're building the future of remote work..."
                  placeholderTextColor={colors.mutedForeground}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom CTA */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Pressable
          style={[
            styles.nextBtn,
            {
              backgroundColor: canProceed() ? colors.primary : colors.muted,
              opacity: isPending ? 0.7 : 1,
            },
          ]}
          onPress={handleNext}
          disabled={!canProceed() || isPending}
        >
          {isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.nextBtnText}>
                {step === STEPS - 1 ? "Create Profile" : "Continue"}
              </Text>
              <Feather name={step === STEPS - 1 ? "check" : "arrow-right"} size={18} color="#fff" />
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingBottom: 8 },
  backBtn: { width: 36, height: 36, justifyContent: "center", marginBottom: 12 },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: "#E5E7EB", overflow: "hidden" },
  progressBar: { height: "100%", borderRadius: 2 },
  stepText: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 8, textAlign: "right" },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingTop: 8, paddingBottom: 40 },
  stepContent: { gap: 20 },
  iconCircle: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  stepTitle: { fontSize: 26, fontWeight: "800", fontFamily: "Inter_700Bold", lineHeight: 32 },
  stepSubtitle: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22, marginTop: -8 },
  fieldGroup: { gap: 8 },
  label: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  textArea: { height: 140, paddingTop: 13 },
  optionList: { gap: 10 },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  optionTitle: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
  optionDesc: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chipText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  footer: { padding: 20, paddingBottom: 28, borderTopWidth: 1 },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15,
    borderRadius: 14,
  },
  nextBtnText: { color: "#fff", fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
});
