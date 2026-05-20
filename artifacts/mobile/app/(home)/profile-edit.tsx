import {
  useGetMyProfile,
  useUpdateMyProfile,
  getGetMyProfileQueryKey,
  useGetMyDocuments,
  useRegisterDocument,
  useDeleteDocument,
  useRequestUploadUrl,
  getGetMyDocumentsQueryKey,
} from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
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

const DOC_TYPES = [
  { value: "resume", label: "Resume / CV" },
  { value: "cover_letter", label: "Cover Letter" },
  { value: "portfolio", label: "Portfolio" },
  { value: "other", label: "Other" },
] as const;

type DocType = (typeof DOC_TYPES)[number]["value"];

function docTypeLabel(type: string) {
  return DOC_TYPES.find((d) => d.value === type)?.label ?? type;
}

function docTypeColor(type: string, primary: string) {
  const map: Record<string, string> = {
    resume: primary,
    cover_letter: "#8B5CF6",
    portfolio: "#10B981",
    other: "#6B7280",
  };
  return map[type] ?? "#6B7280";
}

export default function ProfileEditScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useGetMyProfile();
  const { mutate: updateProfile, isPending } = useUpdateMyProfile({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
        router.back();
      },
    },
  });

  const { data: docsData, refetch: refetchDocs } = useGetMyDocuments({
    query: { queryKey: getGetMyDocumentsQueryKey() },
  });
  const documents = docsData?.documents ?? [];

  const { mutateAsync: requestUploadUrl } = useRequestUploadUrl();
  const { mutateAsync: registerDocument } = useRegisterDocument();
  const { mutate: deleteDocument } = useDeleteDocument({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetMyDocumentsQueryKey() });
      },
    },
  });

  const [isUploading, setIsUploading] = useState(false);
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [yearsExp, setYearsExp] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");

  useEffect(() => {
    if (profile) {
      const p = profile as typeof profile & {
        headline?: string;
        bio?: string;
        yearsExperience?: number;
        skills?: string[];
        linkedinUrl?: string;
        githubUrl?: string;
        portfolioUrl?: string;
      };
      setHeadline(p.headline ?? "");
      setBio(p.bio ?? "");
      setYearsExp(p.yearsExperience != null ? String(p.yearsExperience) : "");
      setSkillsText((p.skills ?? []).join(", "));
      setLinkedinUrl(p.linkedinUrl ?? "");
      setGithubUrl(p.githubUrl ?? "");
      setPortfolioUrl(p.portfolioUrl ?? "");
    }
  }, [profile]);

  const handleSave = () => {
    const skills = skillsText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    updateProfile({
      data: {
        headline: headline.trim() || undefined,
        bio: bio.trim() || undefined,
        yearsExperience: yearsExp ? Number(yearsExp) : undefined,
        skills,
        linkedinUrl: linkedinUrl.trim() || undefined,
        githubUrl: githubUrl.trim() || undefined,
        portfolioUrl: portfolioUrl.trim() || undefined,
      },
    });
  };

  const handleUploadDocument = async (type: DocType) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/plain"],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const file = result.assets[0];
      if (!file) return;

      setIsUploading(true);

      const mimeType = file.mimeType ?? "application/octet-stream";
      const sizeBytes = file.size ?? 0;

      const { uploadURL, objectPath } = await requestUploadUrl({
        data: { name: file.name, size: sizeBytes, contentType: mimeType },
      });

      const fileResponse = await fetch(file.uri);
      const blob = await fileResponse.blob();
      await fetch(uploadURL, {
        method: "PUT",
        headers: { "Content-Type": mimeType },
        body: blob,
      });

      await registerDocument({
        data: {
          name: file.name,
          type,
          objectPath,
          mimeType,
          sizeBytes,
        },
      });

      await refetchDocs();
    } catch (err) {
      Alert.alert("Upload failed", "Could not upload the document. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleChooseAndUpload = () => {
    Alert.alert("Document Type", "What type of document is this?", [
      ...DOC_TYPES.map((t) => ({
        text: t.label,
        onPress: () => handleUploadDocument(t.value),
      })),
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleDeleteDoc = (id: number, name: string) => {
    Alert.alert("Remove Document", `Remove "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => deleteDocument({ id }),
      },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: colors.foreground }]}>Edit Profile</Text>
        <Pressable
          onPress={handleSave}
          disabled={isPending}
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
        >
          {isPending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Headline</Text>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            A short professional tagline shown on your profile
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            value={headline}
            onChangeText={setHeadline}
            placeholder="e.g. Senior iOS Engineer · React Native"
            placeholderTextColor={colors.mutedForeground}
            maxLength={120}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About Me</Text>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            A brief bio describing your background and goals
          </Text>
          <TextInput
            style={[styles.textarea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell employers about yourself..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={5}
            maxLength={1000}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Years of Experience</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            value={yearsExp}
            onChangeText={(t) => setYearsExp(t.replace(/[^0-9]/g, ""))}
            placeholder="e.g. 5"
            placeholderTextColor={colors.mutedForeground}
            keyboardType="numeric"
            maxLength={2}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Skills</Text>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Separate skills with commas
          </Text>
          <TextInput
            style={[styles.textarea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
            value={skillsText}
            onChangeText={setSkillsText}
            placeholder="React Native, TypeScript, Node.js, AWS..."
            placeholderTextColor={colors.mutedForeground}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          {skillsText.trim().length > 0 && (
            <View style={styles.chipRow}>
              {skillsText
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
                .map((skill) => (
                  <View key={skill} style={[styles.chip, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" }]}>
                    <Text style={[styles.chipText, { color: colors.primary }]}>{skill}</Text>
                  </View>
                ))}
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Links</Text>

          <View style={[styles.linkField, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="linkedin" size={18} color="#0077B5" />
            <TextInput
              style={[styles.linkInput, { color: colors.foreground }]}
              value={linkedinUrl}
              onChangeText={setLinkedinUrl}
              placeholder="linkedin.com/in/yourname"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          <View style={[styles.linkField, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 10 }]}>
            <Feather name="github" size={18} color={colors.foreground} />
            <TextInput
              style={[styles.linkInput, { color: colors.foreground }]}
              value={githubUrl}
              onChangeText={setGithubUrl}
              placeholder="github.com/yourhandle"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>

          <View style={[styles.linkField, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 10 }]}>
            <Feather name="globe" size={18} color={colors.mutedForeground} />
            <TextInput
              style={[styles.linkInput, { color: colors.foreground }]}
              value={portfolioUrl}
              onChangeText={setPortfolioUrl}
              placeholder="yourportfolio.com"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
        </View>

        {/* Documents section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Documents</Text>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Upload your resume, cover letter, or portfolio. The AI assistant reads these to give personalised advice and auto-prepare applications.
          </Text>

          {documents.length > 0 && (
            <View style={styles.docList}>
              {documents.map((doc) => {
                const accent = docTypeColor(doc.type, colors.primary);
                return (
                  <View
                    key={doc.id}
                    style={[styles.docRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <View style={[styles.docIcon, { backgroundColor: accent + "18" }]}>
                      <Feather name="file-text" size={16} color={accent} />
                    </View>
                    <View style={styles.docMeta}>
                      <Text style={[styles.docName, { color: colors.foreground }]} numberOfLines={1}>
                        {doc.name}
                      </Text>
                      <View style={styles.docTagRow}>
                        <View style={[styles.docTag, { backgroundColor: accent + "18" }]}>
                          <Text style={[styles.docTagText, { color: accent }]}>
                            {docTypeLabel(doc.type)}
                          </Text>
                        </View>
                        {doc.extractedText ? (
                          <Text style={[styles.docParsed, { color: "#22C55E" }]}>
                            <Feather name="check" size={10} color="#22C55E" /> AI-ready
                          </Text>
                        ) : (
                          <Text style={[styles.docParsed, { color: colors.mutedForeground }]}>
                            Processing…
                          </Text>
                        )}
                      </View>
                    </View>
                    <Pressable
                      onPress={() => handleDeleteDoc(doc.id, doc.name)}
                      hitSlop={8}
                      style={styles.docDelete}
                    >
                      <Feather name="trash-2" size={16} color={colors.mutedForeground} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}

          <Pressable
            style={[styles.uploadBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={handleChooseAndUpload}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator color={colors.primary} size="small" />
            ) : (
              <>
                <View style={[styles.uploadIcon, { backgroundColor: colors.primary + "15" }]}>
                  <Feather name="upload" size={16} color={colors.primary} />
                </View>
                <Text style={[styles.uploadText, { color: colors.foreground }]}>
                  Upload Document
                </Text>
                <Text style={[styles.uploadSub, { color: colors.mutedForeground }]}>
                  PDF, DOCX, TXT
                </Text>
              </>
            )}
          </Pressable>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 17, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 100 },
  saveBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  form: { paddingHorizontal: 20, paddingTop: 20 },
  section: { marginBottom: 24, gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold" },
  hint: { fontSize: 13, fontFamily: "Inter_400Regular" },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    minHeight: 90,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100, borderWidth: 1 },
  chipText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  linkField: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  linkInput: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  docList: { gap: 8 },
  docRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  docIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  docMeta: { flex: 1, gap: 4 },
  docName: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  docTagRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  docTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100 },
  docTagText: { fontSize: 11, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  docParsed: { fontSize: 11, fontFamily: "Inter_400Regular" },
  docDelete: { padding: 4 },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    marginTop: 4,
  },
  uploadIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadText: { flex: 1, fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  uploadSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
