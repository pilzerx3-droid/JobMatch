import type { Job } from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import React, { useRef } from "react";
import {
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

interface SwipeCardProps {
  job: Job;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  onPress: () => void;
  isTop: boolean;
  stackIndex?: number;
}

const REMOTE_COLORS: Record<string, string> = {
  remote: "#22C55E",
  hybrid: "#F59E0B",
  onsite: "#3B82F6",
};

const EXP_COLORS: Record<string, string> = {
  junior: "#60A5FA",
  mid: "#A78BFA",
  senior: "#F472B6",
  lead: "#FB923C",
  executive: "#FBBF24",
  any: "#6B7280",
};

function formatSalary(min?: number | null, max?: number | null): string | null {
  const fmt = (n: number) =>
    n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  if (max) return `Up to ${fmt(max)}`;
  return null;
}

export function SwipeCard({
  job,
  onSwipeLeft,
  onSwipeRight,
  onPress,
  isTop,
  stackIndex = 0,
}: SwipeCardProps) {
  const colors = useColors();
  const position = useRef(new Animated.ValueXY()).current;
  const onSwipeRightRef = useRef(onSwipeRight);
  const onSwipeLeftRef = useRef(onSwipeLeft);

  onSwipeRightRef.current = onSwipeRight;
  onSwipeLeftRef.current = onSwipeLeft;

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ["-15deg", "0deg", "15deg"],
    extrapolate: "clamp",
  });

  const saveOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD * 0.5],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const skipOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD * 0.5, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          Animated.timing(position, {
            toValue: { x: SCREEN_WIDTH + 100, y: gesture.dy },
            duration: 280,
            useNativeDriver: true,
          }).start(() => {
            position.setValue({ x: 0, y: 0 });
            onSwipeRightRef.current();
          });
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          Animated.timing(position, {
            toValue: { x: -(SCREEN_WIDTH + 100), y: gesture.dy },
            duration: 280,
            useNativeDriver: true,
          }).start(() => {
            position.setValue({ x: 0, y: 0 });
            onSwipeLeftRef.current();
          });
        } else {
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            friction: 6,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const salary = formatSalary(job.salaryMin, job.salaryMax);
  const remoteColor = REMOTE_COLORS[job.remoteType] ?? "#6B7280";
  const expColor = EXP_COLORS[job.experienceLevel] ?? "#6B7280";
  const initials = job.company.name.substring(0, 2).toUpperCase();

  const cardTransform = isTop
    ? [{ translateX: position.x }, { translateY: position.y }, { rotate }]
    : [{ scale: 1 - stackIndex * 0.04 }, { translateY: stackIndex * 10 }];

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          zIndex: 10 - stackIndex,
          transform: cardTransform,
        },
      ]}
      {...(isTop ? panResponder.panHandlers : {})}
    >
      {isTop && (
        <>
          <Animated.View
            style={[styles.overlay, styles.saveOverlay, { opacity: saveOpacity }]}
          >
            <Text style={[styles.overlayText, { color: "#22C55E" }]}>SAVE ♥</Text>
          </Animated.View>
          <Animated.View
            style={[styles.overlay, styles.skipOverlay, { opacity: skipOpacity }]}
          >
            <Text style={[styles.overlayText, { color: "#EF4444" }]}>SKIP ✕</Text>
          </Animated.View>
        </>
      )}

      <Pressable style={styles.pressable} onPress={isTop ? onPress : undefined}>
        <View style={styles.topRow}>
          <View style={[styles.companyLogo, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.companyInitials, { color: colors.primary }]}>
              {initials}
            </Text>
          </View>
          {job.matchScore != null && (
            <View style={[styles.matchBadge, { backgroundColor: "#22C55E20" }]}>
              <Text style={[styles.matchText, { color: "#22C55E" }]}>
                {job.matchScore}% match
              </Text>
            </View>
          )}
        </View>

        <Text style={[styles.jobTitle, { color: colors.foreground }]} numberOfLines={2}>
          {job.title}
        </Text>
        <Text style={[styles.companyName, { color: colors.mutedForeground }]}>
          {job.company.name}
        </Text>

        <View style={styles.metaRow}>
          {job.location && (
            <View style={styles.metaItem}>
              <Feather name="map-pin" size={12} color={colors.mutedForeground} />
              <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                {job.location}
              </Text>
            </View>
          )}
          <View
            style={[
              styles.remotePill,
              { backgroundColor: remoteColor + "22" },
            ]}
          >
            <Text style={[styles.remotePillText, { color: remoteColor }]}>
              {job.remoteType.toUpperCase()}
            </Text>
          </View>
          <View
            style={[
              styles.remotePill,
              { backgroundColor: expColor + "22" },
            ]}
          >
            <Text style={[styles.remotePillText, { color: expColor }]}>
              {job.experienceLevel.toUpperCase()}
            </Text>
          </View>
        </View>

        {salary && (
          <Text style={[styles.salary, { color: colors.foreground }]}>{salary}</Text>
        )}

        <Text
          style={[styles.description, { color: colors.mutedForeground }]}
          numberOfLines={4}
        >
          {job.shortDescription}
        </Text>

        {job.tags.length > 0 && (
          <View style={styles.tags}>
            {job.tags.slice(0, 5).map((tag) => (
              <View
                key={tag}
                style={[styles.tag, { backgroundColor: colors.secondary, borderColor: colors.border }]}
              >
                <Text style={[styles.tagText, { color: colors.mutedForeground }]}>
                  {tag}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.swipeHint}>
          <View style={[styles.hintBtn, { borderColor: "#EF4444", backgroundColor: "#EF444415" }]}>
            <Feather name="x" size={22} color="#EF4444" />
          </View>
          <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
            Tap to see full details
          </Text>
          <View style={[styles.hintBtn, { borderColor: "#22C55E", backgroundColor: "#22C55E15" }]}>
            <Feather name="heart" size={22} color="#22C55E" />
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    width: "100%",
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  overlay: {
    position: "absolute",
    top: 24,
    zIndex: 100,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 3,
  },
  saveOverlay: { right: 20, borderColor: "#22C55E" },
  skipOverlay: { left: 20, borderColor: "#EF4444" },
  overlayText: { fontSize: 18, fontWeight: "800", fontFamily: "Inter_700Bold" },
  pressable: { padding: 20, gap: 10 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  companyLogo: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  companyInitials: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold" },
  matchBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100 },
  matchText: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  jobTitle: {
    fontSize: 22,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  companyName: { fontSize: 15, fontFamily: "Inter_400Regular", marginTop: -4 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  metaItem: { flexDirection: "row", gap: 4, alignItems: "center" },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  remotePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  remotePillText: { fontSize: 11, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  salary: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  description: { fontSize: 14, lineHeight: 20, fontFamily: "Inter_400Regular" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
  },
  tagText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  swipeHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  hintBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  hintText: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
