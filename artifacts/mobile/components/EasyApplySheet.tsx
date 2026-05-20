import {
  useGetMyProfile,
  getGetMyProfileQueryKey,
  useGetMyDocuments,
  getGetMyDocumentsQueryKey,
  usePrepareApplication,
} from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Alert,
  Clipboard,
} from "react-native";

import { useColors } from "@/hooks/useColors";

interface EasyApplySheetProps {
  visible: boolean;
  jobId: number;
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

function CoverLetterModal({
  visible,
  coverLetter,
  summary,
  keyPoints,
  colors,
  onClose,
}: {
  visible: boolean;
  coverLetter: string;
  summary: string;
  keyPoints: string[];
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  onClose: () => void;
}) {
  const handleCopy = () => {
    Clipboard.setString(coverLetter);
    Alert.alert("Copied!", "Cover letter copied to clipboard.");
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.overlayBg} onPress={onClose} />
        <View style={[styles.coverSheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={styles.coverHeader}>
            <View style={styles.coverHeaderLeft}>
              <View style={[styles.aiBadge, { backgroundColor: colors.primary + "18" }]}>
                <Feather name="zap" size={12} color={colors.primary} />
                <Text style={[styles.aiBadgeText, { color: colors.primary }]}>AI Prepared</Text>
              </View>
              <Text style={[styles.coverTitle, { color: colors.foreground }]}>
                Your Cover Letter
              </Text>
            </View>
            <Pressable
              style={[styles.closeBtn, { backgroundColor: colors.secondary }]}
              onPress={onClose}
            >
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.coverScroll}
            contentContainerStyle={styles.coverContent}
            showsVerticalScrollIndicator={false}
          >
            {summary ? (
              <View style={[styles.summaryCard, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
                <Feather name="star" size={13} color={colors.primary} />
                <Text style={[styles.summaryText, { color: colors.foreground }]}>{summary}</Text>
              </View>
            ) : null}

            {keyPoints.length > 0 && (
              <>
                <Text style={[styles.coverSectionLabel, { color: colors.mutedForeground }]}>
                  KEY SELLING POINTS
                </Text>
                {keyPoints.map((point, i) => (
                  <View key={i} style={styles.keyPoint}>
                    <View style={[styles.keyDot, { backgroundColor: colors.primary }]} />
                    <Text style={[styles.keyPointText, { color: colors.foreground }]}>{point}</Text>
                  </View>
                ))}
              </>
            )}

            <Text style={[styles.coverSectionLabel, { color: colors.mutedForeground }]}>
              COVER LETTER
            </Text>
            <Text style={[styles.coverBody, { color: colors.foreground }]}>{coverLetter}</Text>
          </ScrollView>

          <View style={[styles.coverFooter, { borderTopColor: colors.border }]}>
            <Pressable
              style={[styles.copyBtn, { borderColor: colors.border, backgroundColor: colors.secondary }]}
              onPress={handleCopy}
            >
              <Feather name="copy" size={16} color={colors.foreground} />
              <Text style={[styles.copyText, { color: colors.foreground }]}>Copy Letter</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function EasyApplySheet({
  visible,
  jobId,
  jobTitle,
  companyName,
  onConfirm,
  onDismiss,
  isLoading,
}: EasyApplySheetProps) {
  const colors = useColors();
  const [showCoverLetter, setShowCoverLetter] = useState(false);
  const [coverLetterData, setCoverLetterData] = useState<{
    coverLetter: string;
    summary: string;
    keyPoints: string[];
  } | null>(null);

  const { data: profile, isLoading: profileLoading } = useGetMyProfile({
    query: { queryKey: getGetMyProfileQueryKey(), enabled: visible },
  });

  const { data: docsData, isLoading: docsLoading } = useGetMyDocuments({
    query: { queryKey: getGetMyDocumentsQueryKey(), enabled: visible },
  });
  const documents = docsData?.documents ?? [];
  const hasDocuments = documents.length > 0;
  const hasExtractedDocs = documents.some((d) => d.extractedText);

  const { mutate: prepareApplication, isPending: isPreparing } = usePrepareApplication({
    mutation: {
      onSuccess: (data) => {
        setCoverLetterData(data);
        setShowCoverLetter(true);
      },
      onError: () => {
        Alert.alert("Could not prepare", "Try adding a resume in your profile first.");
      },
    },
  });

  const skills = profile?.skills ?? [];
  const missingFields = [
    !profile?.headline,
    !profile?.yearsExperience,
    !profile?.preferredLocation,
    !profile?.linkedinUrl,
    !hasDocuments,
  ].filter(Boolean).length;

  const completeness = profile
    ? Math.round(((5 - missingFields) / 5) * 100)
    : 0;

  const handlePrepareWithAI = () => {
    if (!hasExtractedDocs) {
      Alert.alert(
        "No documents found",
        "Upload your resume in Profile → Edit Profile first, then the AI can tailor a cover letter for you.",
        [
          {
            text: "Go to Profile",
            onPress: () => {
              onDismiss();
              router.push("/(home)/profile-edit");
            },
          },
          { text: "Cancel", style: "cancel" },
        ]
      );
      return;
    }
    prepareApplication({ data: { jobId } });
  };

  return (
    <>
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
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

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

                {/* Prepare with AI card */}
                <View style={[styles.aiCard, { backgroundColor: colors.primary + "0D", borderColor: colors.primary + "30" }]}>
                  <View style={styles.aiCardLeft}>
                    <View style={[styles.aiIcon, { backgroundColor: colors.primary + "20" }]}>
                      <Feather name="zap" size={16} color={colors.primary} />
                    </View>
                    <View style={styles.aiCardText}>
                      <Text style={[styles.aiCardTitle, { color: colors.foreground }]}>
                        Prepare with AI
                      </Text>
                      <Text style={[styles.aiCardSub, { color: colors.mutedForeground }]}>
                        {hasExtractedDocs
                          ? "Generate a tailored cover letter"
                          : "Upload your resume to unlock"}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    style={[
                      styles.aiBtn,
                      {
                        backgroundColor: hasExtractedDocs ? colors.primary : colors.secondary,
                        opacity: isPreparing ? 0.7 : 1,
                      },
                    ]}
                    onPress={handlePrepareWithAI}
                    disabled={isPreparing}
                  >
                    {isPreparing ? (
                      <ActivityIndicator size="small" color={hasExtractedDocs ? "#FFF" : colors.mutedForeground} />
                    ) : (
                      <Text style={[styles.aiBtnText, { color: hasExtractedDocs ? "#FFF" : colors.mutedForeground }]}>
                        {coverLetterData ? "View →" : "Generate"}
                      </Text>
                    )}
                  </Pressable>
                </View>

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
                <SectionHeader title="LINKS" colors={colors} />
                <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <LinkRow icon="linkedin" label="LinkedIn" url={profile?.linkedinUrl} colors={colors} />
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <LinkRow icon="github" label="GitHub" url={profile?.githubUrl} colors={colors} />
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                  <LinkRow icon="globe" label="Portfolio" url={profile?.portfolioUrl} colors={colors} />
                </View>

                {/* Documents */}
                <SectionHeader title="DOCUMENTS" colors={colors} />
                {docsLoading ? (
                  <ActivityIndicator color={colors.primary} style={{ marginVertical: 8 }} />
                ) : hasDocuments ? (
                  <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    {documents.map((doc, idx) => (
                      <React.Fragment key={doc.id}>
                        {idx > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                        <View style={styles.docRow}>
                          <View style={[styles.docIcon, { backgroundColor: colors.primary + "15" }]}>
                            <Feather name="file-text" size={14} color={colors.primary} />
                          </View>
                          <View style={styles.docContent}>
                            <Text style={[styles.docName, { color: colors.foreground }]} numberOfLines={1}>
                              {doc.name}
                            </Text>
                            <View style={styles.docMeta}>
                              <Text style={[styles.docType, { color: colors.mutedForeground }]}>
                                {doc.type.replace(/_/g, " ")}
                              </Text>
                              {doc.extractedText ? (
                                <View style={[styles.aiReadyBadge, { backgroundColor: "#22C55E15" }]}>
                                  <Feather name="zap" size={9} color="#22C55E" />
                                  <Text style={[styles.aiReadyText, { color: "#22C55E" }]}>AI-ready</Text>
                                </View>
                              ) : null}
                            </View>
                          </View>
                        </View>
                      </React.Fragment>
                    ))}
                  </View>
                ) : (
                  <Pressable
                    style={[styles.uploadPrompt, { backgroundColor: colors.secondary, borderColor: colors.border }]}
                    onPress={() => {
                      onDismiss();
                      router.push("/(home)/profile-edit");
                    }}
                  >
                    <Feather name="upload" size={15} color={colors.mutedForeground} />
                    <Text style={[styles.uploadPromptText, { color: colors.mutedForeground }]}>
                      Upload resume or CV for AI-powered applications
                    </Text>
                    <Feather name="chevron-right" size={15} color={colors.mutedForeground} />
                  </Pressable>
                )}

                <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
                  You'll be taken to {companyName}'s application page.
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

      {coverLetterData && (
        <CoverLetterModal
          visible={showCoverLetter}
          coverLetter={coverLetterData.coverLetter}
          summary={coverLetterData.summary}
          keyPoints={coverLetterData.keyPoints}
          colors={colors}
          onClose={() => setShowCoverLetter(false)}
        />
      )}
    </>
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
  coverSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: "92%",
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
  aiCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  aiCardLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  aiIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  aiCardText: { flex: 1, gap: 2 },
  aiCardTitle: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  aiCardSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  aiBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  aiBtnText: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
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
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  docIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  docContent: { flex: 1 },
  docName: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  docMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  docType: { fontSize: 11, fontFamily: "Inter_400Regular", textTransform: "capitalize" },
  aiReadyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 100,
  },
  aiReadyText: { fontSize: 10, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  uploadPrompt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  uploadPromptText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
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
  // Cover letter modal styles
  coverHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  coverHeaderLeft: { flex: 1, gap: 6 },
  aiPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    alignSelf: "flex-start",
  },
  aiPillText: { fontSize: 10, fontWeight: "700", fontFamily: "Inter_700Bold" },
  coverTitle: { fontSize: 18, fontWeight: "800", fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
  coverScroll: { flex: 1 },
  coverContent: { paddingHorizontal: 20, paddingBottom: 16, gap: 14 },
  summaryCard: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "flex-start",
  },
  summaryText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  coverSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },
  keyPoint: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  keyDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  keyPointText: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  coverBody: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  coverFooter: {
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  copyText: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    alignSelf: "flex-start",
  },
  aiBadgeText: { fontSize: 10, fontWeight: "700", fontFamily: "Inter_700Bold" },
});
