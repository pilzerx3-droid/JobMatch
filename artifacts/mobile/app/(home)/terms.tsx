import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    body: `By accessing or using SwipeJobs, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, please do not use the app.`,
  },
  {
    title: "2. Eligibility",
    body: `You must be at least 16 years old to use SwipeJobs. By using the app, you represent that you meet this requirement. Job seekers must use the app for lawful personal employment purposes only.`,
  },
  {
    title: "3. User Accounts",
    body: `You are responsible for maintaining the security of your account credentials. You agree to notify us immediately of any unauthorized access. We are not liable for losses resulting from unauthorized account use.`,
  },
  {
    title: "4. Job Seeker Terms",
    body: `Job seekers may use SwipeJobs free of charge to discover, save, and apply to jobs. Swipe data and profile preferences are used to personalize your feed. You agree not to scrape, automate, or abuse the app's swipe or search features.`,
  },
  {
    title: "5. Employer Terms",
    body: `Employers pay a flat fee per job listing. By posting a job, you represent that the posting is for a genuine employment opportunity. SwipeJobs reserves the right to remove listings that are misleading, fraudulent, or violate applicable employment laws.`,
  },
  {
    title: "6. Payments and Refunds",
    body: `Job listing fees are charged at the time of posting via Stripe. Fees are non-refundable once a listing has been published and made visible to job seekers. If a listing is removed by SwipeJobs due to a policy violation, a partial credit may be issued at our discretion.`,
  },
  {
    title: "7. Prohibited Conduct",
    body: `You agree not to:\n• Post false, misleading, or fraudulent content\n• Discriminate in hiring based on protected characteristics\n• Harvest or scrape user data\n• Reverse-engineer or tamper with the app\n• Use the platform for spam or unsolicited communications`,
  },
  {
    title: "8. Intellectual Property",
    body: `All content, branding, and technology in SwipeJobs are owned by or licensed to us. You may not copy, modify, or distribute any part of the app without written permission.`,
  },
  {
    title: "9. Third-Party Services",
    body: `SwipeJobs integrates with third-party services (Clerk for authentication, Stripe for payments, Expo for push notifications). Your use of these services is also subject to their respective terms and policies.`,
  },
  {
    title: "10. Disclaimers",
    body: `SwipeJobs is provided "as is" without warranties of any kind. We do not guarantee job placement, employer quality, or the accuracy of job listings. We are not a recruitment agency.`,
  },
  {
    title: "11. Limitation of Liability",
    body: `To the fullest extent permitted by law, SwipeJobs shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the app, including but not limited to lost income or missed employment opportunities.`,
  },
  {
    title: "12. Termination",
    body: `We reserve the right to suspend or terminate your account at any time for violations of these Terms or for any other reason at our discretion. You may delete your account at any time from your profile settings.`,
  },
  {
    title: "13. Governing Law",
    body: `These Terms shall be governed by the laws of the State of Delaware, United States, without regard to its conflict of law provisions.`,
  },
  {
    title: "14. Changes to Terms",
    body: `We may update these Terms from time to time. Continued use of the app after changes are posted constitutes your acceptance of the revised Terms.\n\nLast updated: May 2026\nContact: legal@swipejobs.app`,
  },
];

export default function TermsScreen() {
  const colors = useColors();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>Terms of Service</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.intro, { color: colors.mutedForeground }]}>
          These Terms of Service ("Terms") govern your use of SwipeJobs, a job discovery platform
          operated by SwipeJobs Inc. Please read them carefully.
        </Text>

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{section.title}</Text>
            <Text style={[styles.sectionBody, { color: colors.mutedForeground }]}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
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
  content: { padding: 20, paddingBottom: 48, gap: 24 },
  intro: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  sectionBody: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
});
