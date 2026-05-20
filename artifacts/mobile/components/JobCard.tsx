import type { Job } from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

interface JobCardProps {
  job: Job;
  onPress: () => void;
  onUnsave?: () => void;
}

const REMOTE_COLORS: Record<string, string> = {
  remote: "#22C55E",
  hybrid: "#F59E0B",
  onsite: "#3B82F6",
};
const EXP_LABELS: Record<string, string> = {
  junior: "Jr",
  mid: "Mid",
  senior: "Sr",
  lead: "Lead",
  executive: "Exec",
};

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function formatSalary(min?: number | null, max?: number | null): string | null {
  const fmt = (n: number) => (n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`);
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  if (max) return `Up to ${fmt(max)}`;
  return null;
}

export function JobCard({ job, onPress, onUnsave }: JobCardProps) {
  const colors = useColors();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const salary = formatSalary(job.salaryMin, job.salaryMax);
  const remoteColor = REMOTE_COLORS[job.remoteType] ?? "#6B7280";
  const expLabel = EXP_LABELS[job.experienceLevel] ?? job.experienceLevel;
  const initials = job.company.name.substring(0, 2).toUpperCase();
  const isNew = job.createdAt
    ? Date.now() - new Date(job.createdAt).getTime() < SEVEN_DAYS_MS
    : false;

  return (
    <Animated.View style={animStyle}>
      <Pressable
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.96, { damping: 10, stiffness: 400 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 10, stiffness: 400 });
        }}
      >
        {/* Left accent bar */}
        <LinearGradient
          colors={[remoteColor, remoteColor + "40"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.accentBar}
        />

        <View style={styles.row}>
          <View style={[styles.logo, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.initials, { color: colors.primary }]}>{initials}</Text>
          </View>

          <View style={styles.info}>
            <View style={styles.titleRow}>
              <Text
                style={[styles.title, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {job.title}
              </Text>
              {isNew && (
                <View style={styles.newBadge}>
                  <Text style={styles.newBadgeText}>NEW</Text>
                </View>
              )}
            </View>
            <Text
              style={[styles.company, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {job.company.name}
            </Text>

            <View style={styles.meta}>
              <View style={[styles.pill, { backgroundColor: remoteColor + "20" }]}>
                <Text style={[styles.pillText, { color: remoteColor }]}>
                  {job.remoteType.toUpperCase()}
                </Text>
              </View>
              <View style={[styles.pill, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.pillText, { color: colors.mutedForeground }]}>
                  {expLabel}
                </Text>
              </View>
              {salary && (
                <Text style={[styles.salary, { color: colors.foreground }]}>{salary}</Text>
              )}
              {job.matchScore != null && (
                <View style={[styles.matchPill, { shadowColor: "#22C55E" }]}>
                  <LinearGradient
                    colors={["#22C55E", "#16A34A"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.matchGradient}
                  >
                    <Text style={styles.matchText}>⚡ {job.matchScore}%</Text>
                  </LinearGradient>
                </View>
              )}
            </View>
          </View>

          {onUnsave && (
            <Pressable
              onPress={onUnsave}
              style={[styles.unsaveBtn, { backgroundColor: colors.primary + "12" }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="bookmark" size={16} color={colors.primary} />
            </Pressable>
          )}
        </View>

        {job.tags.length > 0 && (
          <View style={styles.tags}>
            {job.tags.slice(0, 4).map((tag) => (
              <View
                key={tag}
                style={[styles.tag, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              >
                <Text style={[styles.tagText, { color: colors.mutedForeground }]}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    paddingLeft: 20,
    marginBottom: 10,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    overflow: "hidden",
  },
  accentBar: {
    position: "absolute",
    left: 0,
    top: 10,
    bottom: 10,
    width: 4,
    borderRadius: 2,
  },
  row: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  logo: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
  info: { flex: 1, gap: 3 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  title: { fontSize: 15, fontWeight: "700", fontFamily: "Inter_700Bold", flexShrink: 1 },
  newBadge: {
    backgroundColor: "#F59E0B22",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#F59E0B",
    fontFamily: "Inter_700Bold",
  },
  company: { fontSize: 13, fontFamily: "Inter_400Regular" },
  meta: { flexDirection: "row", gap: 6, alignItems: "center", marginTop: 5, flexWrap: "wrap" },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  pillText: { fontSize: 11, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  salary: { fontSize: 13, fontWeight: "700", fontFamily: "Inter_700Bold" },
  matchPill: {
    borderRadius: 100,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  matchGradient: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  matchText: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  unsaveBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tags: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  tag: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 100, borderWidth: 1 },
  tagText: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
