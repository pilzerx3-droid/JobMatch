import type { Job } from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { forwardRef, useImperativeHandle, useRef, useState } from "react";
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { useColors } from "@/hooks/useColors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.28;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const LOGO_SIZE = 56;

// Stable module-level function for runOnJS compatibility
function triggerHapticMedium() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

export interface SwipeCardHandle {
  swipeLeft: () => void;
  swipeRight: () => void;
}

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

const JOB_TYPE_COLORS: Record<string, string> = {
  fulltime: "#6366F1",
  contract: "#F59E0B",
  parttime: "#8B5CF6",
  internship: "#10B981",
};

const JOB_TYPE_LABELS: Record<string, string> = {
  fulltime: "Full-time",
  contract: "Contract",
  parttime: "Part-time",
  internship: "Internship",
};

function formatSalary(min?: number | null, max?: number | null): string | null {
  const fmt = (n: number) => (n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${n}`);
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  if (max) return `Up to ${fmt(max)}`;
  return null;
}

function CompanyLogo({
  logoUrl,
  name,
  bgColor,
  fgColor,
}: {
  logoUrl?: string | null;
  name: string;
  bgColor: string;
  fgColor: string;
}) {
  const [error, setError] = useState(false);
  const initials = name.substring(0, 2).toUpperCase();

  if (logoUrl && !error) {
    return (
      <Image
        source={{ uri: logoUrl }}
        style={styles.logoImage}
        onError={() => setError(true)}
        resizeMode="contain"
      />
    );
  }

  return (
    <View style={[styles.logoFallback, { backgroundColor: bgColor }]}>
      <Text style={[styles.logoInitials, { color: fgColor }]}>{initials}</Text>
    </View>
  );
}

export const SwipeCard = forwardRef<SwipeCardHandle, SwipeCardProps>(
  ({ job, onSwipeLeft, onSwipeRight, onPress, isTop, stackIndex = 0 }, ref) => {
    const colors = useColors();
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);

    const onSwipeLeftRef = useRef(onSwipeLeft);
    const onSwipeRightRef = useRef(onSwipeRight);
    onSwipeLeftRef.current = onSwipeLeft;
    onSwipeRightRef.current = onSwipeRight;

    const isNew = job.createdAt
      ? Date.now() - new Date(job.createdAt).getTime() < SEVEN_DAYS_MS
      : false;

    useImperativeHandle(ref, () => ({
      swipeLeft: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        translateX.value = withTiming(
          -(SCREEN_WIDTH + 150),
          { duration: 300 },
          (done) => {
            if (done) {
              translateX.value = 0;
              translateY.value = 0;
              runOnJS(onSwipeLeftRef.current)();
            }
          }
        );
      },
      swipeRight: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        translateX.value = withTiming(
          SCREEN_WIDTH + 150,
          { duration: 300 },
          (done) => {
            if (done) {
              translateX.value = 0;
              translateY.value = 0;
              runOnJS(onSwipeRightRef.current)();
            }
          }
        );
      },
    }));

    const panGesture = Gesture.Pan()
      .enabled(isTop)
      .minDistance(5)
      .onUpdate((e) => {
        translateX.value = e.translationX;
        translateY.value = e.translationY;
      })
      .onEnd((e) => {
        if (e.translationX > SWIPE_THRESHOLD) {
          runOnJS(triggerHapticMedium)();
          translateX.value = withTiming(
            SCREEN_WIDTH + 150,
            { duration: 280 },
            (done) => {
              if (done) {
                translateX.value = 0;
                translateY.value = 0;
                runOnJS(onSwipeRightRef.current)();
              }
            }
          );
        } else if (e.translationX < -SWIPE_THRESHOLD) {
          runOnJS(triggerHapticMedium)();
          translateX.value = withTiming(
            -(SCREEN_WIDTH + 150),
            { duration: 280 },
            (done) => {
              if (done) {
                translateX.value = 0;
                translateY.value = 0;
                runOnJS(onSwipeLeftRef.current)();
              }
            }
          );
        } else {
          translateX.value = withSpring(0, { damping: 15 });
          translateY.value = withSpring(0, { damping: 15 });
        }
      });

    const cardStyle = useAnimatedStyle(() => {
      if (!isTop) {
        return {
          transform: [
            { scale: 1 - stackIndex * 0.04 },
            { translateY: stackIndex * 10 },
          ],
        };
      }
      const rotate = interpolate(
        translateX.value,
        [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
        [-15, 0, 15],
        Extrapolation.CLAMP
      );
      return {
        transform: [
          { translateX: translateX.value },
          { translateY: translateY.value },
          { rotate: `${rotate}deg` },
        ],
      };
    });

    const saveOverlayStyle = useAnimatedStyle(() => ({
      opacity: interpolate(
        translateX.value,
        [0, SWIPE_THRESHOLD * 0.6],
        [0, 1],
        Extrapolation.CLAMP
      ),
    }));

    const skipOverlayStyle = useAnimatedStyle(() => ({
      opacity: interpolate(
        translateX.value,
        [-SWIPE_THRESHOLD * 0.6, 0],
        [1, 0],
        Extrapolation.CLAMP
      ),
    }));

    const salary = formatSalary(job.salaryMin, job.salaryMax);
    const remoteColor = REMOTE_COLORS[job.remoteType] ?? "#6B7280";
    const expColor = EXP_COLORS[job.experienceLevel] ?? "#6B7280";
    const jtColor = JOB_TYPE_COLORS[job.jobType] ?? "#6B7280";
    const jtLabel = JOB_TYPE_LABELS[job.jobType] ?? job.jobType;

    return (
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              zIndex: 10 - stackIndex,
            },
            cardStyle,
          ]}
        >
          {isTop && (
            <>
              <Animated.View style={[styles.overlay, styles.saveOverlay, saveOverlayStyle]}>
                <Text style={[styles.overlayText, { color: "#22C55E" }]}>SAVE ♥</Text>
              </Animated.View>
              <Animated.View style={[styles.overlay, styles.skipOverlay, skipOverlayStyle]}>
                <Text style={[styles.overlayText, { color: "#EF4444" }]}>SKIP ✕</Text>
              </Animated.View>
            </>
          )}

          <Pressable style={styles.pressable} onPress={isTop ? onPress : undefined}>
            <View style={styles.topRow}>
              {/* Company logo with glow ring */}
              <View
                style={[
                  styles.logoGlowOuter,
                  {
                    borderColor: colors.primary + "50",
                    shadowColor: colors.primary,
                  },
                ]}
              >
                <View style={[styles.logoWrapper, { backgroundColor: colors.secondary }]}>
                  <CompanyLogo
                    logoUrl={job.company.logoUrl}
                    name={job.company.name}
                    bgColor={colors.secondary}
                    fgColor={colors.primary}
                  />
                </View>
              </View>

              <View style={styles.topRight}>
                {job.matchScore != null && (
                  <View style={[styles.pill, { backgroundColor: "#22C55E20" }]}>
                    <Text style={[styles.pillText, { color: "#22C55E" }]}>
                      {job.matchScore}% match
                    </Text>
                  </View>
                )}
                {isNew && (
                  <View style={[styles.pill, { backgroundColor: "#F59E0B22" }]}>
                    <Text style={[styles.pillText, { color: "#F59E0B" }]}>✦ NEW</Text>
                  </View>
                )}
                <View style={[styles.pill, { backgroundColor: jtColor + "22" }]}>
                  <Text style={[styles.pillText, { color: jtColor }]}>{jtLabel}</Text>
                </View>
              </View>
            </View>

            <Text style={[styles.jobTitle, { color: colors.foreground }]} numberOfLines={2}>
              {job.title}
            </Text>
            <Text style={[styles.companyName, { color: colors.mutedForeground }]}>
              {job.company.name}
            </Text>

            <View style={styles.metaRow}>
              {job.location ? (
                <View style={styles.metaItem}>
                  <Feather name="map-pin" size={12} color={colors.mutedForeground} />
                  <Text
                    style={[styles.metaText, { color: colors.mutedForeground }]}
                    numberOfLines={1}
                  >
                    {job.location}
                  </Text>
                </View>
              ) : null}
              <View style={[styles.pill, { backgroundColor: remoteColor + "22" }]}>
                <Text style={[styles.pillText, { color: remoteColor }]}>
                  {job.remoteType.toUpperCase()}
                </Text>
              </View>
              <View style={[styles.pill, { backgroundColor: expColor + "22" }]}>
                <Text style={[styles.pillText, { color: expColor }]}>
                  {job.experienceLevel.toUpperCase()}
                </Text>
              </View>
            </View>

            {salary ? (
              <View
                style={[
                  styles.salaryHighlight,
                  { backgroundColor: colors.secondary, borderColor: colors.border },
                ]}
              >
                <Feather name="dollar-sign" size={14} color={colors.primary} />
                <Text style={[styles.salary, { color: colors.foreground }]}>
                  {salary}
                  <Text style={[styles.salaryPeriod, { color: colors.mutedForeground }]}>
                    {" "}
                    / yr
                  </Text>
                </Text>
              </View>
            ) : null}

            <Text
              style={[styles.description, { color: colors.mutedForeground }]}
              numberOfLines={3}
            >
              {job.shortDescription}
            </Text>

            {job.tags.length > 0 && (
              <View style={styles.tags}>
                {job.tags.slice(0, 5).map((tag) => (
                  <View
                    key={tag}
                    style={[
                      styles.tag,
                      { backgroundColor: colors.secondary, borderColor: colors.border },
                    ]}
                  >
                    <Text style={[styles.tagText, { color: colors.mutedForeground }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={[styles.swipeHint, { borderTopColor: colors.border }]}>
              <View style={[styles.hintBtn, { borderColor: "#EF4444", backgroundColor: "#EF444415" }]}>
                <Feather name="x" size={20} color="#EF4444" />
              </View>
              <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
                {isTop ? "swipe or tap buttons" : ""}
              </Text>
              <View style={[styles.hintBtn, { borderColor: "#22C55E", backgroundColor: "#22C55E15" }]}>
                <Feather name="heart" size={20} color="#22C55E" />
              </View>
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    );
  }
);

SwipeCard.displayName = "SwipeCard";

const styles = StyleSheet.create({
  card: {
    position: "absolute",
    width: "100%",
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 10,
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
  pressable: { padding: 18, gap: 10 },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  logoGlowOuter: {
    width: LOGO_SIZE + 8,
    height: LOGO_SIZE + 8,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  logoWrapper: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: { width: LOGO_SIZE, height: LOGO_SIZE, borderRadius: 14 },
  logoFallback: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  logoInitials: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold" },
  topRight: { gap: 6, alignItems: "flex-end" },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  pillText: { fontSize: 11, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  jobTitle: {
    fontSize: 21,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
    lineHeight: 27,
  },
  companyName: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: -4 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  metaItem: { flexDirection: "row", gap: 4, alignItems: "center", flexShrink: 1 },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular", flexShrink: 1 },
  salaryHighlight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  salary: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
  salaryPeriod: { fontSize: 13, fontWeight: "400", fontFamily: "Inter_400Regular" },
  description: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular" },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100, borderWidth: 1 },
  tagText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  swipeHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  hintBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  hintText: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
