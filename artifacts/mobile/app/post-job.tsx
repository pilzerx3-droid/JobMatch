import { useCreateEmployerJob } from "@workspace/api-client-react";
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

const REMOTE_OPTIONS = [
  { key: "remote", label: "Remote" },
  { key: "hybrid", label: "Hybrid" },
  { key: "onsite", label: "On-site" },
];
const JOB_TYPES = [
  { key: "fulltime", label: "Full-time" },
  { key: "parttime", label: "Part-time" },
  { key: "contract", label: "Contract" },
  { key: "internship", label: "Internship" },
];
const EXP_LEVELS = [
  { key: "junior", label: "Junior" },
  { key: "mid", label: "Mid-level" },
  { key: "senior", label: "Senior" },
  { key: "lead", label: "Lead" },
  { key: "executive", label: "Executive" },
];

function SegmentedPicker({
  options,
  value,
  onChange,
  colors,
}: {
  options: { key: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[picker.row, { borderColor: colors.border, backgroundColor: colors.card }]}>
      {options.map((opt) => (
        <Pressable
          key={opt.key}
          style={[
            picker.item,
            value === opt.key && { backgroundColor: colors.primary },
          ]}
          onPress={() => onChange(opt.key)}
        >
          <Text
            style={[
              picker.text,
              { color: value === opt.key ? "#fff" : colors.mutedForeground },
            ]}
          >
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const picker = StyleSheet.create({
  row: { flexDirection: "row", borderRadius: 10, borderWidth: 1, overflow: "hidden" },
  item: { flex: 1, paddingVertical: 9, alignItems: "center" },
  text: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});

export default function PostJobScreen() {
  const colors = useColors();

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [remoteType, setRemoteType] = useState("remote");
  const [jobType, setJobType] = useState("fulltime");
  const [experienceLevel, setExperienceLevel] = useState("mid");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [fullDesc, setFullDesc] = useState("");
  const [applyUrl, setApplyUrl] = useState("");
  const [tags, setTags] = useState("");

  const { mutate: createJob, isPending } = useCreateEmployerJob({
    mutation: {
      onSuccess: (data) => {
        Alert.alert(
          "Job Posted",
          data.message ?? "Your job has been created. Activate it by completing payment.",
          [{ text: "Go to Dashboard", onPress: () => router.replace("/(home)/employer-dashboard") }]
        );
      },
      onError: (err: any) => {
        const msg = err?.response?.data?.error ?? "Could not create job posting.";
        Alert.alert("Error", msg);
      },
    },
  });

  const canSubmit = title.trim() && shortDesc.trim() && fullDesc.trim() && applyUrl.trim();

  const handleSubmit = () => {
    if (!canSubmit) return;
    createJob({
      data: {
        title: title.trim(),
        location: location.trim() || undefined,
        remoteType: remoteType as any,
        jobType: jobType as any,
        experienceLevel: experienceLevel as any,
        salaryMin: salaryMin ? parseInt(salaryMin) : undefined,
        salaryMax: salaryMax ? parseInt(salaryMax) : undefined,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        shortDescription: shortDesc.trim(),
        fullDescription: fullDesc.trim(),
        applyUrl: applyUrl.trim(),
      },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>Post a Job</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Pricing banner */}
          <View style={[styles.pricingCard, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "40" }]}>
            <Feather name="zap" size={18} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.pricingTitle, { color: colors.primary }]}>$49 per listing</Text>
              <Text style={[styles.pricingDesc, { color: colors.mutedForeground }]}>
                30-day visibility · Reach thousands of active seekers
              </Text>
            </View>
          </View>

          <View style={styles.form}>
            <FieldGroup label="Job Title *" colors={colors}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
                placeholder="e.g. Senior React Native Engineer"
                placeholderTextColor={colors.mutedForeground}
                value={title}
                onChangeText={setTitle}
              />
            </FieldGroup>

            <FieldGroup label="Work Type" colors={colors}>
              <SegmentedPicker options={REMOTE_OPTIONS} value={remoteType} onChange={setRemoteType} colors={colors} />
            </FieldGroup>

            {remoteType !== "remote" && (
              <FieldGroup label="Location" colors={colors}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="New York, NY"
                  placeholderTextColor={colors.mutedForeground}
                  value={location}
                  onChangeText={setLocation}
                />
              </FieldGroup>
            )}

            <FieldGroup label="Job Type" colors={colors}>
              <SegmentedPicker options={JOB_TYPES} value={jobType} onChange={setJobType} colors={colors} />
            </FieldGroup>

            <FieldGroup label="Experience Level" colors={colors}>
              <SegmentedPicker options={EXP_LEVELS} value={experienceLevel} onChange={setExperienceLevel} colors={colors} />
            </FieldGroup>

            <View style={styles.salaryRow}>
              <FieldGroup label="Salary Min ($/yr)" colors={colors} style={{ flex: 1 }}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="80000"
                  placeholderTextColor={colors.mutedForeground}
                  value={salaryMin}
                  onChangeText={setSalaryMin}
                  keyboardType="number-pad"
                />
              </FieldGroup>
              <FieldGroup label="Salary Max ($/yr)" colors={colors} style={{ flex: 1 }}>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="120000"
                  placeholderTextColor={colors.mutedForeground}
                  value={salaryMax}
                  onChangeText={setSalaryMax}
                  keyboardType="number-pad"
                />
              </FieldGroup>
            </View>

            <FieldGroup label="Tags (comma separated)" colors={colors}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
                placeholder="React, TypeScript, Node.js"
                placeholderTextColor={colors.mutedForeground}
                value={tags}
                onChangeText={setTags}
              />
            </FieldGroup>

            <FieldGroup label="Short Description * (shown on card)" colors={colors}>
              <TextInput
                style={[styles.input, styles.shortArea, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
                placeholder="We're looking for a skilled engineer to join our team…"
                placeholderTextColor={colors.mutedForeground}
                value={shortDesc}
                onChangeText={setShortDesc}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </FieldGroup>

            <FieldGroup label="Full Description *" colors={colors}>
              <TextInput
                style={[styles.input, styles.fullArea, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
                placeholder="Describe the role, responsibilities, requirements, benefits…"
                placeholderTextColor={colors.mutedForeground}
                value={fullDesc}
                onChangeText={setFullDesc}
                multiline
                numberOfLines={10}
                textAlignVertical="top"
              />
            </FieldGroup>

            <FieldGroup label="Apply URL *" colors={colors}>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
                placeholder="https://yourcompany.com/apply"
                placeholderTextColor={colors.mutedForeground}
                value={applyUrl}
                onChangeText={setApplyUrl}
                autoCapitalize="none"
                keyboardType="url"
              />
            </FieldGroup>

            <Pressable
              style={[styles.submitBtn, { backgroundColor: canSubmit ? colors.primary : colors.muted, opacity: isPending ? 0.7 : 1 }]}
              onPress={handleSubmit}
              disabled={!canSubmit || isPending}
            >
              {isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Feather name="send" size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>Post Job — $49</Text>
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FieldGroup({
  label,
  children,
  colors,
  style,
}: {
  label: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useColors>;
  style?: object;
}) {
  return (
    <View style={[{ gap: 8 }, style]}>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  navTitle: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
  content: { padding: 20, gap: 20, paddingBottom: 48 },
  pricingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  pricingTitle: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
  pricingDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  form: { gap: 18 },
  salaryRow: { flexDirection: "row", gap: 12 },
  label: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  shortArea: { height: 90, paddingTop: 12 },
  fullArea: { height: 200, paddingTop: 12 },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15,
    borderRadius: 14,
    marginTop: 8,
  },
  submitBtnText: { color: "#fff", fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
});
