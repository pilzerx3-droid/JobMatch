import type { Job } from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

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

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function formatSalary(min?: number | null, max?: number | null): string | null {
  const fmt = (n: number) =>
    n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  if (max) return `Up to ${fmt(max)}`;
  return null;
}

export function JobCard({ job, onPress, onUnsave }: JobCardProps) {
  const colors = useColors();
  const salary = formatSalary(job.salaryMin, job.salaryMax);
  const remoteColor = REMOTE_COLORS[job.remoteType] ?? "#6B7280";
  const initials = job.company.name.substring(0, 2).toUpperCase();
  const isNew = job.createdAt
    ? Date.now() - new Date(job.createdAt).getTime() < SEVEN_DAYS_MS
    : false;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
      onPress={onPress}
    >
      <View style={styles.row}>
        <View style={[styles.logo, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.initials, { color: colors.primary }]}>{initials}</Text>
        </View>
        <View style={styles.info}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
              {job.title}
            </Text>
            {isNew && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            )}
          </View>
          <Text style={[styles.company, { color: colors.mutedForeground }]} numberOfLines={1}>
            {job.company.name}
          </Text>
          <View style={styles.meta}>
            <View style={[styles.pill, { backgroundColor: remoteColor + "22" }]}>
              <Text style={[styles.pillText, { color: remoteColor }]}>
                {job.remoteType.toUpperCase()}
              </Text>
            </View>
            {salary && (
              <Text style={[styles.salary, { color: colors.foreground }]}>{salary}</Text>
            )}
            {job.matchScore != null && (
              <View style={[styles.pill, { backgroundColor: "#22C55E18" }]}>
                <Text style={[styles.pillText, { color: "#22C55E" }]}>
                  {job.matchScore}%
                </Text>
              </View>
            )}
          </View>
        </View>
        {onUnsave && (
          <Pressable
            onPress={onUnsave}
            style={styles.unsaveBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="bookmark" size={18} color={colors.primary} />
          </Pressable>
        )}
      </View>
      {job.tags.length > 0 && (
        <View style={styles.tags}>
          {job.tags.slice(0, 3).map((tag) => (
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
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  row: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  logo: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  initials: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  info: { flex: 1, gap: 3 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  title: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold", flexShrink: 1 },
  newBadge: {
    backgroundColor: "#F59E0B22",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  newBadgeText: { fontSize: 10, fontWeight: "700", color: "#F59E0B", fontFamily: "Inter_700Bold" },
  company: { fontSize: 13, fontFamily: "Inter_400Regular" },
  meta: { flexDirection: "row", gap: 8, alignItems: "center", marginTop: 4, flexWrap: "wrap" },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  pillText: { fontSize: 11, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  salary: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  unsaveBtn: { padding: 4 },
  tags: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100, borderWidth: 1 },
  tagText: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
