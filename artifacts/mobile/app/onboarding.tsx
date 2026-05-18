import { useCompleteOnboarding } from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
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

const EXPERIENCE_LEVELS = [
  { key: "junior", label: "Junior", desc: "0–2 years" },
  { key: "mid", label: "Mid-Level", desc: "2–5 years" },
  { key: "senior", label: "Senior", desc: "5–8 years" },
  { key: "lead", label: "Lead / Staff", desc: "8+ years" },
  { key: "executive", label: "Executive", desc: "VP / C-Suite" },
];

const REMOTE_OPTIONS = [
  { key: "remote", label: "Remote Only", icon: "wifi" as const },
  { key: "hybrid", label: "Hybrid", icon: "git-merge" as const },
  { key: "onsite", label: "On-Site", icon: "map-pin" as const },
  { key: "any", label: "Open to All", icon: "globe" as const },
];

const JOB_CATEGORIES = [
  "Engineering", "Product", "Design", "Marketing",
  "Data & Analytics", "Sales", "DevOps", "Finance",
  "Operations", "Customer Success",
];

export default function OnboardingScreen() {
  const colors = useColors();
  const { mutate: completeOnboarding, isPending } = useCompleteOnboarding();

  const [step, setStep] = useState(0);
  const [experienceLevel, setExperienceLevel] = useState("");
  const [remotePreference, setRemotePreference] = useState("");
  const [jobCategories, setJobCategories] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [salaryMin, setSalaryMin] = useState("");

  const toggleCategory = (cat: string) => {
    setJobCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const canProceed = () => {
    if (step === 0) return !!experienceLevel;
    if (step === 1) return !!remotePreference;
    if (step === 2) return jobCategories.length > 0;
    return true;
  };

  const handleComplete = () => {
    completeOnboarding(
      {
        data: {
          experienceLevel: experienceLevel as any,
          remotePreference: remotePreference as any,
          jobCategories,
          preferredLocation: location || undefined,
          salaryMin: salaryMin ? parseInt(salaryMin) : undefined,
        },
      },
      {
        onSuccess: () => router.replace("/(home)/(tabs)"),
      }
    );
  };

  const progress = ((step + 1) / STEPS) * 100;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressBar,
              { backgroundColor: colors.primary, width: `${progress}%` },
            ]}
          />
        </View>
        <Text style={[styles.stepText, { color: colors.mutedForeground }]}>
          Step {step + 1} of {STEPS}
        </Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {step === 0 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>
              What's your experience level?
            </Text>
            <Text style={[styles.stepSubtitle, { color: colors.mutedForeground }]}>
              We'll use this to show you the most relevant jobs.
            </Text>
            <View style={styles.optionList}>
              {EXPERIENCE_LEVELS.map((level) => (
                <Pressable
                  key={level.key}
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor:
                        experienceLevel === level.key
                          ? colors.primary + "20"
                          : colors.card,
                      borderColor:
                        experienceLevel === level.key
                          ? colors.primary
                          : colors.border,
                    },
                  ]}
                  onPress={() => setExperienceLevel(level.key)}
                >
                  <View>
                    <Text
                      style={[
                        styles.optionTitle,
                        {
                          color:
                            experienceLevel === level.key
                              ? colors.primary
                              : colors.foreground,
                        },
                      ]}
                    >
                      {level.label}
                    </Text>
                    <Text style={[styles.optionDesc, { color: colors.mutedForeground }]}>
                      {level.desc}
                    </Text>
                  </View>
                  {experienceLevel === level.key && (
                    <Feather name="check-circle" size={22} color={colors.primary} />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>
              How do you like to work?
            </Text>
            <Text style={[styles.stepSubtitle, { color: colors.mutedForeground }]}>
              Your preferred work arrangement.
            </Text>
            <View style={styles.optionList}>
              {REMOTE_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.key}
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor:
                        remotePreference === opt.key
                          ? colors.primary + "20"
                          : colors.card,
                      borderColor:
                        remotePreference === opt.key
                          ? colors.primary
                          : colors.border,
                    },
                  ]}
                  onPress={() => setRemotePreference(opt.key)}
                >
                  <View style={styles.optionRow}>
                    <Feather
                      name={opt.icon}
                      size={20}
                      color={
                        remotePreference === opt.key
                          ? colors.primary
                          : colors.mutedForeground
                      }
                    />
                    <Text
                      style={[
                        styles.optionTitle,
                        {
                          color:
                            remotePreference === opt.key
                              ? colors.primary
                              : colors.foreground,
                          marginLeft: 12,
                        },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </View>
                  {remotePreference === opt.key && (
                    <Feather name="check-circle" size={22} color={colors.primary} />
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>
              What type of roles interest you?
            </Text>
            <Text style={[styles.stepSubtitle, { color: colors.mutedForeground }]}>
              Select all that apply.
            </Text>
            <View style={styles.chipGrid}>
              {JOB_CATEGORIES.map((cat) => {
                const selected = jobCategories.includes(cat);
                return (
                  <Pressable
                    key={cat}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: selected
                          ? colors.primary
                          : colors.card,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => toggleCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: selected ? "#FFFFFF" : colors.foreground },
                      ]}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.foreground }]}>
              Last step — almost done!
            </Text>
            <Text style={[styles.stepSubtitle, { color: colors.mutedForeground }]}>
              These are optional but help us find better matches.
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                Preferred Location
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.input,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                placeholder="e.g. San Francisco, New York"
                placeholderTextColor={colors.mutedForeground}
                value={location}
                onChangeText={setLocation}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>
                Minimum Salary (USD/year)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.input,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                placeholder="e.g. 120000"
                placeholderTextColor={colors.mutedForeground}
                value={salaryMin}
                onChangeText={setSalaryMin}
                keyboardType="number-pad"
              />
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        {step > 0 && (
          <Pressable
            style={[styles.backBtn, { borderColor: colors.border }]}
            onPress={() => setStep((s) => s - 1)}
          >
            <Feather name="arrow-left" size={20} color={colors.foreground} />
          </Pressable>
        )}

        <Pressable
          style={[
            styles.nextBtn,
            {
              backgroundColor: canProceed() ? colors.primary : colors.muted,
              flex: 1,
              marginLeft: step > 0 ? 12 : 0,
            },
          ]}
          onPress={step < STEPS - 1 ? () => setStep((s) => s + 1) : handleComplete}
          disabled={!canProceed() || isPending}
        >
          {isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.nextBtnText}>
              {step < STEPS - 1 ? "Continue" : "Find my matches →"}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingTop: 16, gap: 10 },
  progressTrack: {
    height: 4,
    backgroundColor: "#27272A",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBar: { height: 4, borderRadius: 2 },
  stepText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingTop: 32 },
  stepContent: { gap: 24 },
  stepTitle: {
    fontSize: 26,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  stepSubtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    marginTop: -12,
  },
  optionList: { gap: 10 },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  optionRow: { flexDirection: "row", alignItems: "center" },
  optionTitle: { fontSize: 16, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  optionDesc: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  chipGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 1.5,
  },
  chipText: { fontSize: 14, fontWeight: "500", fontFamily: "Inter_500Medium" },
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
  footer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 24,
    borderTopWidth: 1,
  },
  backBtn: {
    width: 50,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  nextBtn: { paddingVertical: 15, borderRadius: 14, alignItems: "center" },
  nextBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
});
