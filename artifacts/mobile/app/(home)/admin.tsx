import {
  useAdminGetAnalytics,
  useAdminImportJobs,
  useAdminGetCareerUrls,
  useAdminAddCareerUrl,
  useAdminImportFromAts,
  useAdminDeleteCareerUrl,
  getAdminGetAnalyticsQueryKey,
  getAdminGetCareerUrlsQueryKey,
} from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";

const ATS_TYPES = ["greenhouse", "lever", "workable"] as const;

export default function AdminScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();

  const { data: analytics, isLoading, refetch, isRefetching } = useAdminGetAnalytics({
    query: { queryKey: getAdminGetAnalyticsQueryKey() },
  });

  const { data: careerUrlsData, isLoading: urlsLoading } = useAdminGetCareerUrls({
    query: { queryKey: getAdminGetCareerUrlsQueryKey() },
  });

  const { mutate: importJobs, isPending: isImporting } = useAdminImportJobs({
    mutation: {
      onSuccess: (data) => {
        Alert.alert("Import Complete", data.message);
        queryClient.invalidateQueries({ queryKey: getAdminGetAnalyticsQueryKey() });
      },
      onError: () => Alert.alert("Import Failed", "Could not import jobs. Are you an admin?"),
    },
  });

  const { mutate: addCareerUrl, isPending: isAddingUrl } = useAdminAddCareerUrl({
    mutation: {
      onSuccess: () => {
        setShowAddUrl(false);
        setNewCompanyName("");
        setNewCareerUrl("");
        setNewAtsType("greenhouse");
        queryClient.invalidateQueries({ queryKey: getAdminGetCareerUrlsQueryKey() });
      },
      onError: () => Alert.alert("Error", "Failed to add career URL."),
    },
  });

  const { mutate: importFromAts } = useAdminImportFromAts({
    mutation: {
      onSuccess: (data) => {
        Alert.alert("ATS Import Done", data.message ?? `Imported ${data.imported} jobs.`);
        queryClient.invalidateQueries({ queryKey: getAdminGetAnalyticsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getAdminGetCareerUrlsQueryKey() });
      },
      onError: () => Alert.alert("ATS Import Failed", "Could not import from that source."),
    },
  });

  const { mutate: deleteCareerUrl } = useAdminDeleteCareerUrl({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getAdminGetCareerUrlsQueryKey() });
      },
    },
  });

  const [showAddUrl, setShowAddUrl] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCareerUrl, setNewCareerUrl] = useState("");
  const [newAtsType, setNewAtsType] = useState<"greenhouse" | "lever" | "workable">("greenhouse");

  const stats = analytics
    ? [
        { label: "Total Users", value: analytics.totalUsers, icon: "users" as const, color: colors.primary },
        { label: "Total Jobs", value: analytics.totalJobs, icon: "briefcase" as const, color: "#22C55E" },
        { label: "Total Swipes", value: analytics.totalSwipes, icon: "activity" as const, color: "#F59E0B" },
        { label: "Jobs Saved", value: analytics.totalSaved, icon: "heart" as const, color: "#EF4444" },
        { label: "Total Clicks", value: analytics.totalClicks, icon: "mouse-pointer" as const, color: "#8B5CF6" },
        { label: "Employers", value: analytics.totalEmployers, icon: "layers" as const, color: "#06B6D4" },
        { label: "Swipes (7d)", value: analytics.swipesLast7Days, icon: "trending-up" as const, color: "#F59E0B" },
        { label: "New Users (7d)", value: analytics.newUsersLast7Days, icon: "user-plus" as const, color: colors.primary },
        { label: "Clicks (7d)", value: analytics.clicksLast7Days, icon: "external-link" as const, color: "#8B5CF6" },
        { label: "Imported (7d)", value: analytics.jobsImportedLast7Days, icon: "download-cloud" as const, color: "#22C55E" },
      ]
    : [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Admin Dashboard</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Platform Stats */}
        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Platform Stats</Text>
            <View style={styles.statsGrid}>
              {stats.map((stat) => (
                <View
                  key={stat.label}
                  style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={[styles.statIcon, { backgroundColor: stat.color + "20" }]}>
                    <Feather name={stat.icon} size={18} color={stat.color} />
                  </View>
                  <Text style={[styles.statNum, { color: colors.foreground }]}>
                    {stat.value.toLocaleString()}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Actions */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Actions</Text>
        <Pressable
          style={[styles.actionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => importJobs()}
          disabled={isImporting}
        >
          <View style={[styles.actionIcon, { backgroundColor: colors.accent + "20" }]}>
            <Feather name="download-cloud" size={22} color={colors.accent} />
          </View>
          <View style={styles.actionInfo}>
            <Text style={[styles.actionTitle, { color: colors.foreground }]}>Import Sample Jobs</Text>
            <Text style={[styles.actionDesc, { color: colors.mutedForeground }]}>
              Seed the database with realistic job listings from top tech companies.
            </Text>
          </View>
          {isImporting ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
          )}
        </Pressable>

        {/* ATS Importer */}
        <View style={styles.atsSectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>ATS Importers</Text>
          <Pressable
            style={[styles.addBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" }]}
            onPress={() => setShowAddUrl((v) => !v)}
          >
            <Feather name={showAddUrl ? "x" : "plus"} size={16} color={colors.primary} />
            <Text style={[styles.addBtnText, { color: colors.primary }]}>
              {showAddUrl ? "Cancel" : "Add Source"}
            </Text>
          </Pressable>
        </View>

        {showAddUrl && (
          <View style={[styles.addUrlCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.addUrlTitle, { color: colors.foreground }]}>Add Career URL</Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Company Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
                placeholder="Stripe, Notion, Linear…"
                placeholderTextColor={colors.mutedForeground}
                value={newCompanyName}
                onChangeText={setNewCompanyName}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Career Page URL</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
                placeholder="https://boards.greenhouse.io/stripe"
                placeholderTextColor={colors.mutedForeground}
                value={newCareerUrl}
                onChangeText={setNewCareerUrl}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>ATS Type</Text>
              <View style={styles.atsTypeRow}>
                {ATS_TYPES.map((t) => (
                  <Pressable
                    key={t}
                    style={[
                      styles.atsTypeBtn,
                      {
                        backgroundColor: newAtsType === t ? colors.primary : colors.card,
                        borderColor: newAtsType === t ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => setNewAtsType(t)}
                  >
                    <Text style={[styles.atsTypeBtnText, { color: newAtsType === t ? "#fff" : colors.foreground }]}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Pressable
              style={[
                styles.addUrlBtn,
                { backgroundColor: newCompanyName && newCareerUrl ? colors.primary : colors.muted },
              ]}
              onPress={() =>
                addCareerUrl({
                  data: { companyName: newCompanyName, careerUrl: newCareerUrl, atsType: newAtsType },
                })
              }
              disabled={!newCompanyName || !newCareerUrl || isAddingUrl}
            >
              {isAddingUrl ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.addUrlBtnText}>Add Career URL</Text>
              )}
            </Pressable>
          </View>
        )}

        {urlsLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />
        ) : (
          (careerUrlsData?.careerUrls ?? []).map((url) => (
            <View
              key={url.id}
              style={[styles.urlCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.urlInfo}>
                <Text style={[styles.urlCompany, { color: colors.foreground }]}>{url.companyName}</Text>
                <View style={[styles.urlTypeBadge, { backgroundColor: colors.primary + "18" }]}>
                  <Text style={[styles.urlTypeText, { color: colors.primary }]}>{url.atsType}</Text>
                </View>
              </View>
              <Text style={[styles.urlText, { color: colors.mutedForeground }]} numberOfLines={1}>
                {url.careerUrl}
              </Text>
              {url.lastImportedAt && (
                <Text style={[styles.urlLastImport, { color: colors.mutedForeground }]}>
                  Last import: {new Date(url.lastImportedAt).toLocaleDateString()} · {url.lastImportCount ?? 0} jobs
                </Text>
              )}
              <View style={styles.urlActions}>
                <Pressable
                  style={[styles.urlActionBtn, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "30" }]}
                  onPress={() =>
                    Alert.alert(
                      `Import from ${url.companyName}`,
                      `Import jobs from ${url.atsType} for ${url.companyName}?`,
                      [
                        { text: "Cancel", style: "cancel" },
                        { text: "Import", onPress: () => importFromAts({ urlId: url.id }) },
                      ]
                    )
                  }
                >
                  <Feather name="download" size={14} color={colors.primary} />
                  <Text style={[styles.urlActionText, { color: colors.primary }]}>Import</Text>
                </Pressable>
                <Pressable
                  style={[styles.urlActionBtn, { backgroundColor: "#EF444415", borderColor: "#EF444430" }]}
                  onPress={() =>
                    Alert.alert("Remove", `Remove ${url.companyName}?`, [
                      { text: "Cancel", style: "cancel" },
                      { text: "Remove", style: "destructive", onPress: () => deleteCareerUrl({ urlId: url.id }) },
                    ])
                  }
                >
                  <Feather name="trash-2" size={14} color="#EF4444" />
                  <Text style={[styles.urlActionText, { color: "#EF4444" }]}>Remove</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        {!urlsLoading && (careerUrlsData?.careerUrls ?? []).length === 0 && !showAddUrl && (
          <View style={[styles.emptyUrls, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="link" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyUrlsText, { color: colors.mutedForeground }]}>
              No ATS sources added yet. Press "Add Source" to connect Greenhouse, Lever, or Workable.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold" },
  scroll: { padding: 16, gap: 14, paddingBottom: 48 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  sectionTitle: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold", marginBottom: 4 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
  statCard: { width: "47%", padding: 14, borderRadius: 16, borderWidth: 1, gap: 6 },
  statIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  statNum: { fontSize: 24, fontWeight: "800", fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  actionIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  actionInfo: { flex: 1 },
  actionTitle: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  actionDesc: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 18 },
  atsSectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  addBtnText: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  addUrlCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 14 },
  addUrlTitle: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  atsTypeRow: { flexDirection: "row", gap: 8 },
  atsTypeBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1.5,
  },
  atsTypeBtnText: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  addUrlBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  addUrlBtnText: { color: "#fff", fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  urlCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  urlInfo: { flexDirection: "row", alignItems: "center", gap: 8 },
  urlCompany: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold", flex: 1 },
  urlTypeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  urlTypeText: { fontSize: 11, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  urlText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  urlLastImport: { fontSize: 11, fontFamily: "Inter_400Regular" },
  urlActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  urlActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  urlActionText: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  emptyUrls: {
    alignItems: "center",
    gap: 10,
    padding: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  emptyUrlsText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
});
