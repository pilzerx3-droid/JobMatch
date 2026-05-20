import { useGetMyProfile, getGetMyProfileQueryKey } from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

interface EasyApplySheetProps {
  visible: boolean;
  jobTitle: string;
  companyName: string;
  onConfirm: () => void;
  onDismiss: () => void;
  isLoading: boolean;
}

function SectionHeader({ title, colors }: { title: string; colors: ReturnType<typeof import("@/hooks/useColors").useColors> }) {
  return (
    <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>{title}</Text>
  );
}

function ProfileRow({
  icon,
  label,
  value,
  colors,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value?: string | null;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const isEmpty = !value;
  return (
    <View style={styles.profileRow}>
      <View
        style={[
          styles.rowIcon,
          { backgroundColor: isEmpty ? colors.secondary : colors.primary + "18" },
        ]}
      >
        <Feather
          name={icon}
          size={14}
          color={isEmpty ? colors.mutedForeground : colors.primary}
        />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text
          style={[
            styles.rowValue,
            { color: isEmpty ? colors.mutedForeground : colors.foreground },
          ]}
        >
          {isEmpty ? "Not set" : value}
        </Text>
      </View>
      {isEmpty && (
        <View style={[styles.emptyBadge, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.emptyBadgeText, { color: colors.mutedForeground }]}>Missing</Text>
        </View>
      )}
    </View>
  );
}

function LinkRow({
  icon,
  label,
  url,
  colors,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  url?: string | null;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  const isEmpty = !url;
  const display = url
    ? url.replace(/^https?:\/\/(www\.)?/, "").split("/").slice(0, 2).join("/")
    : "Not set";
  return (
    <View style={styles.linkRow}>
      <Feather name={icon} size={15} color={isEmpty ? colors.mutedForeground : colors.primary} />
      <View style={styles.linkContent}>
        <Text style={[styles.linkLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text
          style={[
            styles.linkValue,
            {
              color: isEmpty ? colors.mutedForeground : colors.primary,
              fontStyle: isEmpty ? "italic" : "normal",
            },
          ]}
          numberOfLines={1}
        >
          {display}
        </Text>
      </View>
      {!isEmpty && <Feather name="check" size={14} color="#22C55E" />}
    </View>
  );
}

export function EasyApplySheet({
  visible,
  jobTitle,
  companyName,
  onConfirm,
  onDismiss,
  isLoading,
}: EasyApplySheetProps) {
  const colors = useColors();
  const { data: profile, isLoading: profileLoading } = useGetMyProfile({
    query: { queryKey: getGetMyProfileQueryKey(), enabled: visible },
  });

  const skills = profile?.skills ?? [];
  const missingFields = [
    !profile?.headline,
    !profile?.yearsExperience,
    !profile?.preferredLocation,
    !profile?.linkedinUrl,
    !profile?.resumeUrl,
  ].filter(Boolean).length;

  const completeness = profile
    ? Math.round(((5 - missingFields) / 5) * 100)
    : 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.overlayBg} onPress={onDismiss} />

        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={[styles.headerTitle, { color: colors.foreground }]}>
                Quick Apply
              </Text>
              <Text style={[styles.headerSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                {jobTitle} · {companyName}
              </Text>
            </View>
            <Pressable
              style={[styles.closeBtn, { backgroundColor: colors.secondary }]}
              onPress={onDismiss}
            >
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>

          {profileLoading ? (
            <View style={styles.loadingCenter}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <ScrollView
              style={styles.scroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Profile completeness banner */}
              {missingFields > 0 && (
                <View
                  style={[
                    styles.incompleteBanner,
                    { backgroundColor: "#F59E0B12", borderColor: "#F59E0B40" },
                  ]}
                >
                  <Feather name="alert-triangle" size={14} color="#F59E0B" />
                  <View style={styles.bannerText}>
                    <Text style={[styles.bannerTitle, { color: "#F59E0B" }]}>
                      Profile {completeness}% complete
                    </Text>
                    <Text style={[styles.bannerSub, { color: colors.mutedForeground }]}>
                      Complete your profile to stand out to employers.
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => {
                      onDismiss();
                      router.push("/(home)/profile-edit");
                    }}
                  >
                    <Text style={[styles.bannerLink, { color: colors.primary }]}>Edit →</Text>
                  </Pressable>
                </View>
              )}

              {/* Personal info */}
              <SectionHeader title="YOUR DETAILS" colors={colors} />
              <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <ProfileRow
                  icon="user"
                  label="Full name"
                  value={profile?.name}
                  colors={colors}
                />
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <ProfileRow
                  icon="mail"
                  label="Email"
                  value={profile?.email}
                  colors={colors}
                />
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <ProfileRow
                  icon="award"
                  label="Headline"
                  value={profile?.headline}
                  colors={colors}
                />
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <ProfileRow
                  icon="briefcase"
                  label="Experience"
                  value={
                    profile?.yearsExperience != null
                      ? `${profile.yearsExperience} year${profile.yearsExperience !== 1 ? "s" : ""}`
                      : null
                  }
                  colors={colors}
                />
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <ProfileRow
                  icon="map-pin"
                  label="Location"
                  value={profile?.preferredLocation}
                  colors={colors}
                />
              </View>

              {/* Skills */}
              {skills.length > 0 && (
                <>
                  <SectionHeader title="SKILLS" colors={colors} />
                  <View style={styles.skillsWrap}>
                    {skills.slice(0, 12).map((s) => (
                      <View
                        key={s}
                        style={[styles.skillChip, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}
                      >
                        <Text style={[styles.skillText, { color: colors.primary }]}>{s}</Text>
                      </View>
                    ))}
                    {skills.length > 12 && (
                      <View style={[styles.skillChip, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
                        <Text style={[styles.skillText, { color: colors.mutedForeground }]}>
                          +{skills.length - 12} more
                        </Text>
                      </View>
                    )}
                  </View>
                </>
              )}

              {/* Links */}
              <SectionHeader title="LINKS & DOCUMENTS" colors={colors} />
              <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <LinkRow
                  icon="linkedin"
                  label="LinkedIn"
                  url={profile?.linkedinUrl}
                  colors={colors}
                />
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <LinkRow
                  icon="github"
                  label="GitHub"
                  url={profile?.githubUrl}
                  colors={colors}
                />
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <LinkRow
                  icon="globe"
                  label="Portfolio"
                  url={profile?.portfolioUrl}
                  colors={colors}
                />
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <LinkRow
                  icon="file-text"
                  label="Resume"
                  url={profile?.resumeUrl}
                  colors={colors}
                />
              </View>

              <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
                You'll be taken to {companyName}'s application page. The details above show what's on your SwipeJobs profile.
              </Text>
            </ScrollView>
          )}

          {/* CTA */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <Pressable
              style={styles.confirmBtn}
              onPress={onConfirm}
              disabled={isLoading || profileLoading}
            >
              <LinearGradient
                colors={["#FF4D6D", "#FF2D55"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.confirmGradient}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.confirmText}>Confirm & Apply</Text>
                    <Feather name="arrow-right" size={18} color="#FFFFFF" />
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: "90%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  headerText: { flex: 1 },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingCenter: {
    height: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 10,
  },
  incompleteBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  bannerText: { flex: 1, gap: 2 },
  bannerTitle: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  bannerSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  bannerLink: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
    marginTop: 6,
    marginLeft: 2,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  rowValue: { fontSize: 14, fontWeight: "500", fontFamily: "Inter_600SemiBold", marginTop: 1 },
  emptyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  emptyBadgeText: { fontSize: 10, fontFamily: "Inter_400Regular" },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 58 },
  skillsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  skillChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
  },
  skillText: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  linkContent: { flex: 1 },
  linkLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  linkValue: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 1 },
  disclaimer: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 17,
    marginTop: 4,
    marginBottom: 4,
    paddingHorizontal: 8,
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  confirmBtn: {
    borderRadius: 16,
    overflow: "hidden",
  },
  confirmGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  confirmText: {
    fontSize: 17,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
});
