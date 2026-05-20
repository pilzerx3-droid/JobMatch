import { useAuth } from "@clerk/expo";
import {
  useGetMyProfile,
  useGetSavedJobs,
  useUpdateMyProfile,
  getGetMyProfileQueryKey,
} from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";

const REMOTE_LABELS: Record<string, string> = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
  any: "Open to All",
};
const EXP_LABELS: Record<string, string> = {
  junior: "Junior",
  mid: "Mid-Level",
  senior: "Senior",
  lead: "Lead / Staff",
  executive: "Executive",
};

export default function ProfileScreen() {
  const colors = useColors();
  const { signOut } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useGetMyProfile();
  const { data: savedData } = useGetSavedJobs();
  const { mutate: updateProfile, isPending } = useUpdateMyProfile({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
        setEditMode(false);
      },
    },
  });

  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/welcome");
        },
      },
    ]);
  };

  const handleSaveName = () => {
    updateProfile({ data: { name: editName } });
  };

  if (isLoading || !profile) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  const extProfile = profile as typeof profile & {
    swipesLeft?: number;
    swipesRight?: number;
    applicationsClicked?: number;
    headline?: string;
    profileCompleteness?: number;
    skills?: string[];
  };

  const initials = (profile.name || profile.email)
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  const savedCount = savedData?.savedJobs.length ?? 0;
  const swipesLeft = extProfile.swipesLeft ?? 0;
  const swipesRight = extProfile.swipesRight ?? savedCount;
  const applicationsClicked = extProfile.applicationsClicked ?? 0;
  const totalReviewed = swipesLeft + swipesRight;
  const completeness = extProfile.profileCompleteness ?? 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Profile</Text>
          <View style={styles.headerRight}>
            {profile.isAdmin && (
              <Pressable
                style={[styles.adminBadge, { backgroundColor: colors.accent + "20" }]}
                onPress={() => router.push("/(home)/admin")}
              >
                <Feather name="shield" size={14} color={colors.accent} />
                <Text style={[styles.adminText, { color: colors.accent }]}>Admin</Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.editProfileBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push("/(home)/profile-edit")}
            >
              <Feather name="edit-2" size={14} color={colors.foreground} />
              <Text style={[styles.editProfileText, { color: colors.foreground }]}>Edit</Text>
            </Pressable>
          </View>
        </View>

        <View style={[styles.avatarSection, { borderBottomColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          {editMode ? (
            <View style={styles.editNameRow}>
              <TextInput
                style={[
                  styles.nameInput,
                  {
                    backgroundColor: colors.input,
                    borderColor: colors.border,
                    color: colors.foreground,
                  },
                ]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Your name"
                placeholderTextColor={colors.mutedForeground}
                autoFocus
              />
              <Pressable
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveName}
                disabled={isPending}
              >
                {isPending ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </Pressable>
              <Pressable onPress={() => setEditMode(false)}>
                <Feather name="x" size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>
          ) : (
            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.foreground }]}>
                {profile.name || "Anonymous"}
              </Text>
              <Pressable
                onPress={() => {
                  setEditName(profile.name || "");
                  setEditMode(true);
                }}
              >
                <Feather name="edit-2" size={16} color={colors.mutedForeground} />
              </Pressable>
            </View>
          )}
          {extProfile.headline ? (
            <Text style={[styles.headline, { color: colors.mutedForeground }]}>{extProfile.headline}</Text>
          ) : null}
          <Text style={[styles.email, { color: colors.mutedForeground }]}>{profile.email}</Text>
        </View>

        {/* Profile Completeness */}
        <View style={[styles.completenessCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.completenessHeader}>
            <Text style={[styles.completenessTitle, { color: colors.foreground }]}>
              Profile Strength
            </Text>
            <Text style={[styles.completenessPercent, { color: completeness >= 70 ? "#22C55E" : colors.primary }]}>
              {completeness}%
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.secondary }]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${completeness}%` as any,
                  backgroundColor: completeness >= 70 ? "#22C55E" : colors.primary,
                },
              ]}
            />
          </View>
          {completeness < 100 && (
            <Pressable
              style={styles.completeRow}
              onPress={() => router.push("/(home)/profile-edit")}
            >
              <Text style={[styles.completeHint, { color: colors.mutedForeground }]}>
                {completeness < 40
                  ? "Add a headline, bio, and skills to stand out"
                  : completeness < 70
                  ? "Add work experience and education to reach 70%"
                  : "Almost there — add your LinkedIn or portfolio"}
              </Text>
              <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>

        {/* Activity stats */}
        <View style={[styles.statsRow, { borderBottomColor: colors.border }]}>
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.foreground }]}>{savedCount}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Saved</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.foreground }]}>{totalReviewed}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Reviewed</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.stat}>
            <Text style={[styles.statNum, { color: colors.foreground }]}>
              {applicationsClicked}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Applied</Text>
          </View>
        </View>

        {/* Skills */}
        {extProfile.skills && extProfile.skills.length > 0 && (
          <View style={[styles.section, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Skills</Text>
            <View style={styles.chipRow}>
              {extProfile.skills.slice(0, 10).map((skill) => (
                <View key={skill} style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.chipText, { color: colors.foreground }]}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Job Preferences</Text>

          <View style={[styles.prefCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {[
              {
                icon: "award",
                label: "Experience",
                value: profile.experienceLevel
                  ? EXP_LABELS[profile.experienceLevel] ?? profile.experienceLevel
                  : "Not set",
              },
              {
                icon: "wifi",
                label: "Work Style",
                value: profile.remotePreference
                  ? REMOTE_LABELS[profile.remotePreference] ?? profile.remotePreference
                  : "Not set",
              },
              {
                icon: "map-pin",
                label: "Location",
                value: profile.preferredLocation || "Not set",
              },
              {
                icon: "dollar-sign",
                label: "Min Salary",
                value: profile.salaryMin
                  ? `$${Math.round(profile.salaryMin / 1000)}k/yr`
                  : "Not set",
              },
            ].map((item, idx, arr) => (
              <View
                key={item.label}
                style={[
                  styles.prefRow,
                  idx < arr.length - 1 && {
                    borderBottomWidth: 1,
                    borderBottomColor: colors.border,
                  },
                ]}
              >
                <View style={[styles.prefIcon, { backgroundColor: colors.secondary }]}>
                  <Feather name={item.icon as any} size={16} color={colors.mutedForeground} />
                </View>
                <View style={styles.prefInfo}>
                  <Text style={[styles.prefLabel, { color: colors.mutedForeground }]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.prefValue, { color: colors.foreground }]}>
                    {item.value}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {profile.jobCategories && profile.jobCategories.length > 0 && (
            <View style={styles.categoriesSection}>
              <Text style={[styles.catLabel, { color: colors.mutedForeground }]}>Interested in</Text>
              <View style={styles.chipRow}>
                {profile.jobCategories.map((cat) => (
                  <View
                    key={cat}
                    style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <Text style={[styles.chipText, { color: colors.foreground }]}>{cat}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <Pressable
            style={[styles.editPrefBtn, { borderColor: colors.border }]}
            onPress={() => router.push("/onboarding")}
          >
            <Feather name="sliders" size={16} color={colors.foreground} />
            <Text style={[styles.editPrefText, { color: colors.foreground }]}>
              Update Preferences
            </Text>
          </Pressable>
        </View>

        {profile.role === "employer" && (
          <View style={styles.section}>
            <Pressable
              style={[styles.linkRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push("/(home)/employer-dashboard")}
            >
              <View style={[styles.linkIcon, { backgroundColor: colors.primary + "18" }]}>
                <Feather name="briefcase" size={16} color={colors.primary} />
              </View>
              <Text style={[styles.linkText, { color: colors.foreground }]}>
                Employer Dashboard
              </Text>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </Pressable>
          </View>
        )}

        <View style={[styles.section, { gap: 10 }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Legal</Text>
          <View
            style={[styles.legalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Pressable
              style={[styles.legalRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
              onPress={() => router.push("/(home)/privacy")}
            >
              <Feather name="shield" size={16} color={colors.mutedForeground} />
              <Text style={[styles.legalText, { color: colors.foreground }]}>Privacy Policy</Text>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>
            <Pressable style={styles.legalRow} onPress={() => router.push("/(home)/terms")}>
              <Feather name="file-text" size={16} color={colors.mutedForeground} />
              <Text style={[styles.legalText, { color: colors.foreground }]}>Terms of Service</Text>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>
        </View>

        <View style={styles.section}>
          <Pressable
            style={[styles.signOutBtn, { borderColor: colors.destructive + "40" }]}
            onPress={handleSignOut}
          >
            <Feather name="log-out" size={18} color={colors.destructive} />
            <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign Out</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { paddingBottom: 120 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
  },
  adminText: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  editProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
  },
  editProfileText: { fontSize: 13, fontWeight: "500", fontFamily: "Inter_500Medium" },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 28, fontWeight: "700", color: "#FFFFFF", fontFamily: "Inter_700Bold" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  editNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
  },
  name: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold" },
  headline: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 32 },
  nameInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
  },
  saveBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  saveBtnText: { color: "#FFFFFF", fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  email: { fontSize: 14, fontFamily: "Inter_400Regular" },
  completenessCard: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  completenessHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  completenessTitle: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  completenessPercent: { fontSize: 18, fontWeight: "800", fontFamily: "Inter_700Bold" },
  progressTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  completeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  completeHint: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  statsRow: { flexDirection: "row", paddingVertical: 20, borderBottomWidth: 1, marginTop: 16 },
  stat: { flex: 1, alignItems: "center", gap: 4 },
  statNum: { fontSize: 26, fontWeight: "800", fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  statDivider: { width: 1, marginVertical: 4 },
  section: { padding: 20, gap: 14 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, borderWidth: 1 },
  chipText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  prefCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  prefRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  prefIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  prefInfo: { flex: 1 },
  prefLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  prefValue: {
    fontSize: 14,
    fontWeight: "500",
    fontFamily: "Inter_500Medium",
    marginTop: 1,
  },
  categoriesSection: { gap: 8 },
  catLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  editPrefBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  editPrefText: { fontSize: 15, fontWeight: "500", fontFamily: "Inter_500Medium" },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  signOutText: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  linkIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  linkText: { flex: 1, fontSize: 15, fontWeight: "500", fontFamily: "Inter_500Medium" },
  legalCard: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  legalRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  legalText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
});
