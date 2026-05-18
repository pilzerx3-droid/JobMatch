import {
  useAdminGetAnalytics,
  useAdminImportJobs,
  getAdminGetAnalyticsQueryKey,
} from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";

export default function AdminScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();

  const { data: analytics, isLoading, refetch, isRefetching } = useAdminGetAnalytics();

  const { mutate: importJobs, isPending: isImporting } = useAdminImportJobs({
    mutation: {
      onSuccess: (data) => {
        Alert.alert("Import Complete", data.message);
        queryClient.invalidateQueries({ queryKey: getAdminGetAnalyticsQueryKey() });
      },
      onError: () => Alert.alert("Import Failed", "Could not import jobs. Are you an admin?"),
    },
  });

  const stats = analytics
    ? [
        { label: "Total Users", value: analytics.totalUsers, icon: "users" as const },
        { label: "Total Jobs", value: analytics.totalJobs, icon: "briefcase" as const },
        { label: "Total Swipes", value: analytics.totalSwipes, icon: "activity" as const },
        { label: "Jobs Saved", value: analytics.totalSaved, icon: "heart" as const },
        { label: "Swipes (7d)", value: analytics.swipesLast7Days, icon: "trending-up" as const },
        { label: "New Users (7d)", value: analytics.newUsersLast7Days, icon: "user-plus" as const },
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
      >
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
                  <View style={[styles.statIcon, { backgroundColor: colors.primary + "20" }]}>
                    <Feather name={stat.icon} size={18} color={colors.primary} />
                  </View>
                  <Text style={[styles.statNum, { color: colors.foreground }]}>
                    {stat.value.toLocaleString()}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{stat.label}</Text>
                </View>
              ))}
            </View>

            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Actions</Text>
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
          </>
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
  scroll: { padding: 16, gap: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  sectionTitle: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold", marginBottom: 4 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    width: "47%",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statNum: { fontSize: 26, fontWeight: "800", fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
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
});
