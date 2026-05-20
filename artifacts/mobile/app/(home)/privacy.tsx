import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const SECTIONS = [
  {
    title: "Information We Collect",
    body: `When you create an account, we collect your name, email address, and optional profile details (experience level, location preferences, salary range, and job categories). We also collect anonymized usage data such as swipe activity, job clicks, and screen views to improve the app experience.`,
  },
  {
    title: "How We Use Your Information",
    body: `We use your profile data to personalize your job feed and calculate match scores. Usage data is used for analytics, performance monitoring, and product improvement. We do not sell your personal data to third parties.`,
  },
  {
    title: "Push Notifications",
    body: `If you opt in to push notifications, we store your device push token to send you job digests and relevant alerts. You can opt out at any time in your device settings or through your profile.`,
  },
  {
    title: "Data Sharing",
    body: `We share data with the following service providers: Clerk (authentication), Expo (push notifications), and our cloud hosting provider. All third parties are bound by data processing agreements consistent with this policy.`,
  },
  {
    title: "Employer Data",
    body: `Employers who post jobs provide company information and job details. This information is displayed publicly within the app to job seekers. Payment information is processed securely via Stripe and is not stored on our servers.`,
  },
  {
    title: "Data Retention",
    body: `We retain your account data for as long as your account is active. You may request deletion of your account and associated data by contacting us at privacy@swipejobs.app.`,
  },
  {
    title: "Your Rights",
    body: `You have the right to access, correct, or delete your personal data. You may also request a copy of your data at any time. To exercise these rights, contact us at privacy@swipejobs.app.`,
  },
  {
    title: "Security",
    body: `We implement industry-standard security measures including HTTPS encryption, secure authentication via Clerk, and regular security reviews. No system is 100% secure, and we encourage you to use a strong password.`,
  },
  {
    title: "Children's Privacy",
    body: `SwipeJobs is not intended for users under the age of 16. We do not knowingly collect personal data from children. If you believe a child has created an account, please contact us immediately.`,
  },
  {
    title: "Changes to This Policy",
    body: `We may update this Privacy Policy from time to time. We will notify you of material changes via push notification or email. Continued use of the app after changes constitutes acceptance of the revised policy.`,
  },
  {
    title: "Contact Us",
    body: `If you have questions or concerns about this Privacy Policy, please reach out:\n\nEmail: privacy@swipejobs.app\nLast updated: May 2026`,
  },
];

export default function PrivacyScreen() {
  const colors = useColors();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { borderBottomColor: colors.border }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>Privacy Policy</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.intro, { color: colors.mutedForeground }]}>
          SwipeJobs ("we", "us", or "our") is committed to protecting your privacy. This policy
          explains how we collect, use, and safeguard your information when you use our app.
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
