import {
  useGetEmployerProfile,
  useGetEmployerJobs,
  getGetEmployerJobsQueryKey,
  getGetEmployerProfileQueryKey,
} from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

function StatCard({
  label,
  value,
  icon,
  colors,
}: {
  label: string;
  value: number;
  icon: keyof typeof Feather.glyphMap;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: colors.primary + "15" }]}>
        <Feather name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

export default function EmployerDashboardScreen() {
  const colors = useColors();

  const { data: profile, isLoading: profileLoading } = useGetEmployerProfile({
    query: { queryKey: getGetEmployerProfileQueryKey() },
  });

  const {
    data: jobsData,
    isLoading: jobsLoading,
    refetch,
    isRefetching,
  } = useGetEmployerJobs({
    query: { queryKey: getGetEmployerJobsQueryKey() },
  });

  const isLoading = profileLoading || jobsLoading;

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="briefcase" size={48} color={colors.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No employer profile</Text>
        <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
          Complete employer onboarding first.
        </Text>
        <Pressable
          style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/employer-onboarding")}
        >
          <Text style={styles.primaryBtnText}>Set Up Employer Profile</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const jobs = jobsData?.jobs ?? [];
  const totalViews = jobs.reduce((s, j) => s + j.viewCount, 0);
  const totalSaves = jobs.reduce((s, j) => s + j.saveCount, 0);
  const totalClicks = jobs.reduce((s, j) => s + j.clickCount, 0);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>Employer Dashboard</Text>
            <Text style={[styles.companyName, { color: colors.foreground }]}>{profile.companyName}</Text>
          </View>
          {profile.isVerified && (
            <View style={[styles.verifiedBadge, { backgroundColor: "#22C55E20" }]}>
              <Feather name="check-circle" size={14} color="#22C55E" />
              <Text style={[styles.verifiedText, { color: "#22C55E" }]}>Verified</Text>
            </View>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard label="Views" value={totalViews} icon="eye" colors={colors} />
          <StatCard label="Saves" value={totalSaves} icon="heart" colors={colors} />
          <StatCard label="Clicks" value={totalClicks} icon="external-link" colors={colors} />
        </View>

        {/* Post a job CTA */}
        <Pressable
          style={[styles.postJobCard, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/post-job")}
        >
          <Feather name="plus-circle" size={22} color="#fff" />
          <View style={styles.postJobText}>
            <Text style={styles.postJobTitle}>Post a New Job</Text>
            <Text style={styles.postJobSubtitle}>$49 / listing · 30-day visibility</Text>
          </View>
          <Feather name="arrow-right" size={20} color="#fff" />
        </Pressable>

        {/* Job Listings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Your Listings ({jobs.length})
          </Text>

          {jobs.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="briefcase" size={32} color={colors.mutedForeground} />
              <Text style={[styles.emptyCardText, { color: colors.mutedForeground }]}>
                No job listings yet. Post your first job above.
              </Text>
            </View>
          ) : (
            jobs.map((job) => (
              <View
                key={job.id}
                style={[styles.jobCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.jobCardHeader}>
                  <View style={styles.jobCardTitle}>
                    <Text style={[styles.jobTitle, { color: colors.foreground }]} numberOfLines={1}>
                      {job.title}
                    </Text>
                    <View style={styles.jobMeta}>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: job.isActive ? "#22C55E20" : "#EF444420" },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            { color: job.isActive ? "#22C55E" : "#EF4444" },
                          ]}
                        >
                          {job.isActive ? "Active" : "Inactive"}
                        </Text>
                      </View>
                      {job.isPaidListing && (
                        <View style={[styles.paidBadge, { backgroundColor: colors.primary + "20" }]}>
                          <Feather name="zap" size={10} color={colors.primary} />
                          <Text style={[styles.paidText, { color: colors.primary }]}>Paid</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                <View style={styles.jobStats}>
                  <View style={styles.jobStat}>
                    <Feather name="eye" size={13} color={colors.mutedForeground} />
                    <Text style={[styles.jobStatText, { color: colors.mutedForeground }]}>
                      {job.viewCount} views
                    </Text>
                  </View>
                  <View style={styles.jobStat}>
                    <Feather name="heart" size={13} color={colors.mutedForeground} />
                    <Text style={[styles.jobStatText, { color: colors.mutedForeground }]}>
                      {job.saveCount} saves
                    </Text>
                  </View>
                  <View style={styles.jobStat}>
                    <Feather name="mouse-pointer" size={13} color={colors.mutedForeground} />
                    <Text style={[styles.jobStatText, { color: colors.mutedForeground }]}>
                      {job.clickCount} clicks
                    </Text>
                  </View>
                </View>

                {job.expiresAt && (
                  <Text style={[styles.expires, { color: colors.mutedForeground }]}>
                    Expires: {new Date(job.expiresAt).toLocaleDateString()}
                  </Text>
                )}
              </View>
            ))
          )}
        </View>

        {/* Edit profile link */}
        <Pressable
          style={[styles.editProfileRow, { borderTopColor: colors.border }]}
          onPress={() => router.push("/employer-onboarding")}
        >
          <Feather name="edit-2" size={16} color={colors.mutedForeground} />
          <Text style={[styles.editProfileText, { color: colors.mutedForeground }]}>
            Edit company profile
          </Text>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    paddingBottom: 8,
  },
  greeting: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 2 },
  companyName: { fontSize: 22, fontWeight: "800", fontFamily: "Inter_700Bold" },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  verifiedText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingVertical: 12 },
  statCard: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  statIcon: { padding: 8, borderRadius: 10 },
  statValue: { fontSize: 22, fontWeight: "800", fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  postJobCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    marginBottom: 8,
  },
  postJobText: { flex: 1 },
  postJobTitle: { color: "#fff", fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
  postJobSubtitle: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Inter_400Regular" },
  section: { padding: 20, paddingTop: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold", marginBottom: 12 },
  emptyCard: {
    alignItems: "center",
    gap: 10,
    padding: 32,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  emptyCardText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  jobCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10, gap: 10 },
  jobCardHeader: {},
  jobCardTitle: { gap: 6 },
  jobTitle: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
  jobMeta: { flexDirection: "row", gap: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  paidBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  paidText: { fontSize: 11, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  jobStats: { flexDirection: "row", gap: 16 },
  jobStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  jobStatText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  expires: { fontSize: 11, fontFamily: "Inter_400Regular" },
  emptyTitle: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold" },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  primaryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
  editProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 20,
    borderTopWidth: 1,
  },
  editProfileText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
});
