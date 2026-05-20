import {
  useGetJob,
  useSwipeJob,
  useUnsaveJob,
  useTrackJobClick,
  useCreateApplication,
  getGetJobQueryKey,
  getGetSavedJobsQueryKey,
} from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";

import { EasyApplySheet } from "@/components/EasyApplySheet";
import { useColors } from "@/hooks/useColors";

const REMOTE_COLORS: Record<string, string> = {
  remote: "#22C55E",
  hybrid: "#F59E0B",
  onsite: "#3B82F6",
};

function formatSalary(min?: number | null, max?: number | null): string | null {
  const fmt = (n: number) =>
    n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  if (max) return `Up to ${fmt(max)}`;
  return null;
}

export default function JobDetailScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [easyApplied, setEasyApplied] = useState(false);
  const [showEasyApplySheet, setShowEasyApplySheet] = useState(false);

  const jobId = Number(id);
  const { data: job, isLoading } = useGetJob(jobId, {
    query: { queryKey: getGetJobQueryKey(jobId), enabled: !!id },
  });

  const { mutate: swipeJob, isPending: isSaving } = useSwipeJob({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSavedJobsQueryKey() });
        router.back();
      },
    },
  });

  const { mutate: unsave, isPending: isUnsaving } = useUnsaveJob({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSavedJobsQueryKey() });
      },
    },
  });

  const { mutate: trackClick } = useTrackJobClick();

  const { mutate: createApplication, isPending: isApplying } = useCreateApplication({
    mutation: {
      onSuccess: () => {
        setEasyApplied(true);
        setShowEasyApplySheet(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        Linking.openURL(job!.applyUrl).catch(() => {});
      },
      onError: () => {
        setShowEasyApplySheet(false);
        Alert.alert("Error", "Could not save your application. Opening apply link anyway.");
        Linking.openURL(job!.applyUrl).catch(() => {});
      },
    },
  });

  if (isLoading || !job) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  const salary = formatSalary(job.salaryMin, job.salaryMax);
  const remoteColor = REMOTE_COLORS[job.remoteType] ?? "#6B7280";
  const initials = job.company.name.substring(0, 2).toUpperCase();

  const handleApply = () => {
    trackClick({ jobId: job.id, data: { source: "apply_button" } });
    Linking.openURL(job.applyUrl).catch(() => {});
  };

  const handleOpenEasyApply = () => {
    if (easyApplied) {
      Linking.openURL(job.applyUrl).catch(() => {});
      return;
    }
    setShowEasyApplySheet(true);
  };

  const handleConfirmEasyApply = () => {
    trackClick({ jobId: job.id, data: { source: "apply_button" } });
    createApplication({ data: { jobId: job.id } });
  };

  const handleSave = () => {
    swipeJob({ jobId: job.id, data: { direction: "right" } });
  };

  const handleUnsave = () => {
    unsave({ jobId: job.id });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.handle, { backgroundColor: colors.border }]} />

      <View style={[styles.topBar]}>
        <Pressable style={[styles.closeBtn, { backgroundColor: colors.card }]} onPress={() => router.back()}>
          <Feather name="x" size={18} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.topBarTitle, { color: colors.foreground }]}>Job Details</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <View style={[styles.companyLogo, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.companyInitials, { color: colors.primary }]}>{initials}</Text>
          </View>
          <Text style={[styles.jobTitle, { color: colors.foreground }]}>{job.title}</Text>
          <Text style={[styles.companyName, { color: colors.mutedForeground }]}>
            {job.company.name}
          </Text>

          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: remoteColor + "22" }]}>
              <Text style={[styles.badgeText, { color: remoteColor }]}>
                {job.remoteType.toUpperCase()}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>
                {job.jobType.toUpperCase()}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>
                {job.experienceLevel.toUpperCase()}
              </Text>
            </View>
            {job.matchScore != null && (
              <View style={[styles.badge, { backgroundColor: "#22C55E20" }]}>
                <Text style={[styles.badgeText, { color: "#22C55E" }]}>
                  {job.matchScore}% MATCH
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={[styles.infoSection, { borderTopColor: colors.border, borderBottomColor: colors.border }]}>
          {job.location && (
            <View style={styles.infoRow}>
              <Feather name="map-pin" size={16} color={colors.mutedForeground} />
              <Text style={[styles.infoText, { color: colors.foreground }]}>{job.location}</Text>
            </View>
          )}
          {salary && (
            <View style={styles.infoRow}>
              <Feather name="dollar-sign" size={16} color={colors.mutedForeground} />
              <Text style={[styles.infoText, { color: colors.foreground }]}>{salary}</Text>
            </View>
          )}
          {job.company.website && (
            <Pressable
              style={styles.infoRow}
              onPress={() => Linking.openURL(job.company.website!).catch(() => {})}
            >
              <Feather name="globe" size={16} color={colors.mutedForeground} />
              <Text style={[styles.infoText, styles.link, { color: colors.primary }]}>
                {job.company.website.replace(/^https?:\/\//, "")}
              </Text>
            </Pressable>
          )}
        </View>

        {job.tags.length > 0 && (
          <View style={styles.tagsSection}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Skills & Tags</Text>
            <View style={styles.tagRow}>
              {job.tags.map((tag) => (
                <View key={tag} style={[styles.tag, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.tagText, { color: colors.mutedForeground }]}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.descSection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About the Role</Text>
          <Text style={[styles.descText, { color: colors.foreground }]}>
            {job.fullDescription}
          </Text>
        </View>

        {job.company.description && (
          <View style={styles.descSection}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About {job.company.name}</Text>
            <Text style={[styles.descText, { color: colors.mutedForeground }]}>
              {job.company.description}
            </Text>
          </View>
        )}

        <View style={{ height: 160 }} />
      </ScrollView>

      <View style={[styles.bottomBar, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        {job.isSaved ? (
          <Pressable
            style={[styles.iconBtn, { borderColor: colors.primary }]}
            onPress={handleUnsave}
            disabled={isUnsaving}
          >
            {isUnsaving ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <Feather name="bookmark" size={20} color={colors.primary} />
            )}
          </Pressable>
        ) : (
          <Pressable
            style={[styles.iconBtn, { borderColor: colors.border }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={colors.mutedForeground} size="small" />
            ) : (
              <Feather name="heart" size={20} color={colors.mutedForeground} />
            )}
          </Pressable>
        )}

        <Pressable
          style={[styles.easyApplyBtn, {
            backgroundColor: easyApplied ? "#22C55E" : colors.card,
            borderColor: easyApplied ? "#22C55E" : colors.primary,
          }]}
          onPress={handleOpenEasyApply}
          disabled={isApplying}
        >
          {isApplying ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <Text style={[styles.easyApplyText, { color: easyApplied ? "#FFFFFF" : colors.primary }]}>
                {easyApplied ? "✓ Applied" : "Easy Apply"}
              </Text>
              {!easyApplied && <Text style={{ fontSize: 14 }}>⚡</Text>}
            </>
          )}
        </Pressable>

        <Pressable
          style={[styles.applyBtn, { backgroundColor: colors.primary }]}
          onPress={handleApply}
        >
          <Text style={styles.applyBtnText}>Apply</Text>
          <Feather name="arrow-right" size={16} color="#FFFFFF" />
        </Pressable>
      </View>
      <EasyApplySheet
        visible={showEasyApplySheet}
        jobId={jobId}
        jobTitle={job.title}
        companyName={job.company.name}
        onConfirm={handleConfirmEasyApply}
        onDismiss={() => setShowEasyApplySheet(false)}
        isLoading={isApplying}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 4 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  topBarTitle: { fontSize: 16, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  scroll: { flex: 1 },
  heroSection: { alignItems: "center", paddingVertical: 24, paddingHorizontal: 20, gap: 8 },
  companyLogo: { width: 72, height: 72, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, marginBottom: 4 },
  companyInitials: { fontSize: 26, fontWeight: "700", fontFamily: "Inter_700Bold" },
  jobTitle: { fontSize: 24, fontWeight: "800", fontFamily: "Inter_700Bold", textAlign: "center", letterSpacing: -0.3, lineHeight: 30 },
  companyName: { fontSize: 16, fontFamily: "Inter_400Regular" },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100 },
  badgeText: { fontSize: 11, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  infoSection: { borderTopWidth: 1, borderBottomWidth: 1, marginHorizontal: 20, paddingVertical: 12, gap: 12 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  link: { textDecorationLine: "underline" },
  tagsSection: { padding: 20, gap: 12 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, borderWidth: 1 },
  tagText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  descSection: { paddingHorizontal: 20, paddingBottom: 20, gap: 10 },
  sectionTitle: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
  descText: { fontSize: 15, lineHeight: 24, fontFamily: "Inter_400Regular" },
  bottomBar: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  iconBtn: { width: 48, height: 48, borderRadius: 14, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  easyApplyBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  easyApplyText: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  applyBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 13, paddingHorizontal: 18, borderRadius: 14 },
  applyBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
});
