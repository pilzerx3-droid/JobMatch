import type { Job } from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
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
const LOGO_SIZE = 60;

function triggerHapticMedium() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}
function triggerHapticSuccess() {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
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
    const entryProgress = useSharedValue(0);

    const onSwipeLeftRef = useRef(onSwipeLeft);
    const onSwipeRightRef = useRef(onSwipeRight);
    onSwipeLeftRef.current = onSwipeLeft;
    onSwipeRightRef.current = onSwipeRight;

    const isNew = job.createdAt
      ? Date.now() - new Date(job.createdAt).getTime() < SEVEN_DAYS_MS
      : false;

    useEffect(() => {
      entryProgress.value = withSpring(1, { damping: 14, stiffness: 120, mass: 0.9 });
    }, []);

    useImperativeHandle(ref, () => ({
      swipeLeft: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        translateX.value = withTiming(-(SCREEN_WIDTH + 150), { duration: 300 }, (done) => {
          if (done) {
            translateX.value = 0;
            translateY.value = 0;
            runOnJS(onSwipeLeftRef.current)();
          }
        });
      },
      swipeRight: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        translateX.value = withTiming(SCREEN_WIDTH + 150, { duration: 300 }, (done) => {
          if (done) {
            translateX.value = 0;
            translateY.value = 0;
            runOnJS(onSwipeRightRef.current)();
          }
        });
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
          runOnJS(triggerHapticSuccess)();
          translateX.value = withTiming(SCREEN_WIDTH + 150, { duration: 280 }, (done) => {
            if (done) {
              translateX.value = 0;
              translateY.value = 0;
              runOnJS(onSwipeRightRef.current)();
            }
          });
        } else if (e.translationX < -SWIPE_THRESHOLD) {
          runOnJS(triggerHapticMedium)();
          translateX.value = withTiming(-(SCREEN_WIDTH + 150), { duration: 280 }, (done) => {
            if (done) {
              translateX.value = 0;
              translateY.value = 0;
              runOnJS(onSwipeLeftRef.current)();
            }
          });
        } else {
          translateX.value = withSpring(0, { damping: 18, stiffness: 200 });
          translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
        }
      });

    const cardStyle = useAnimatedStyle(() => {
      if (!isTop) {
        const targetScale = 1 - stackIndex * 0.04;
        const scale = interpolate(
          entryProgress.value,
          [0, 1],
          [0.88, targetScale],
          Extrapolation.CLAMP
        );
        return {
          transform: [{ scale }, { translateY: stackIndex * 12 }],
          opacity: interpolate(entryProgress.value, [0, 0.5], [0, 1], Extrapolation.CLAMP),
        };
      }
      const rotate = interpolate(
        translateX.value,
        [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
        [-15, 0, 15],
        Extrapolation.CLAMP
      );
      const entryScale = interpolate(entryProgress.value, [0, 1], [0.88, 1], Extrapolation.CLAMP);
      const entryY = interpolate(entryProgress.value, [0, 1], [32, 0], Extrapolation.CLAMP);
      return {
        opacity: entryProgress.value,
        transform: [
          { translateX: translateX.value },
          { translateY: translateY.value + entryY },
          { rotate: `${rotate}deg` },
          { scale: entryScale },
        ],
      };
    });

    const saveTintStyle = useAnimatedStyle(() => ({
      opacity: interpolate(
        translateX.value,
        [0, SWIPE_THRESHOLD],
        [0, 1],
        Extrapolation.CLAMP
      ),
    }));
    const skipTintStyle = useAnimatedStyle(() => ({
      opacity: interpolate(
        translateX.value,
        [-SWIPE_THRESHOLD, 0],
        [1, 0],
        Extrapolation.CLAMP
      ),
    }));

    const saveStampStyle = useAnimatedStyle(() => {
      const p = interpolate(
        translateX.value,
        [0, SWIPE_THRESHOLD * 0.4],
        [0, 1],
        Extrapolation.CLAMP
      );
      return {
        opacity: p,
        transform: [{ scale: interpolate(p, [0, 1], [0.4, 1], Extrapolation.CLAMP) }],
      };
    });
    const skipStampStyle = useAnimatedStyle(() => {
      const p = interpolate(
        translateX.value,
        [-SWIPE_THRESHOLD * 0.4, 0],
        [1, 0],
        Extrapolation.CLAMP
      );
      return {
        opacity: p,
        transform: [{ scale: interpolate(p, [0, 1], [0.4, 1], Extrapolation.CLAMP) }],
      };
    });

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
              <Animated.View
                style={[StyleSheet.absoluteFillObject, saveTintStyle]}
                pointerEvents="none"
              >
                <LinearGradient
                  colors={["#22C55E55", "#22C55E08"]}
                  start={{ x: 1, y: 0.5 }}
                  end={{ x: 0, y: 0.5 }}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 28 }]}
                />
              </Animated.View>
              <Animated.View
                style={[StyleSheet.absoluteFillObject, skipTintStyle]}
                pointerEvents="none"
              >
                <LinearGradient
                  colors={["#EF444455", "#EF444408"]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={[StyleSheet.absoluteFillObject, { borderRadius: 28 }]}
                />
              </Animated.View>

              <Animated.View style={[styles.saveStamp, saveStampStyle]}>
                <Text style={styles.saveStampText}>SAVE ♥</Text>
              </Animated.View>
              <Animated.View style={[styles.skipStamp, skipStampStyle]}>
                <Text style={styles.skipStampText}>SKIP ✕</Text>
              </Animated.View>
            </>
          )}

          <Pressable style={styles.pressable} onPress={isTop ? onPress : undefined}>
            <LinearGradient
              colors={[colors.primary + "18", "transparent"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.gradientHeader}
            />

            <View style={styles.topRow}>
              <View
                style={[
                  styles.logoContainer,
                  {
                    borderColor: colors.primary + "50",
                    shadowColor: colors.primary,
                  },
                ]}
              >
                <CompanyLogo
                  logoUrl={job.company.logoUrl}
                  name={job.company.name}
                  bgColor={colors.secondary}
                  fgColor={colors.primary}
                />
              </View>

              <View style={styles.topRight}>
                {job.matchScore != null && (
                  <View
                    style={[
                      styles.matchBadge,
                      { shadowColor: "#22C55E" },
                    ]}
                  >
                    <LinearGradient
                      colors={["#22C55E", "#16A34A"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.matchBadgeGradient}
                    >
                      <Text style={styles.matchBadgeText}>⚡ {job.matchScore}%</Text>
                    </LinearGradient>
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
              <LinearGradient
                colors={[colors.primary + "22", colors.primary + "08"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.salaryBadge}
              >
                <Feather name="dollar-sign" size={14} color={colors.primary} />
                <Text style={[styles.salaryText, { color: colors.foreground }]}>
                  {salary}
                  <Text style={[styles.salaryPeriod, { color: colors.mutedForeground }]}>
                    {" / yr"}
                  </Text>
                </Text>
              </LinearGradient>
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
              <View
                style={[styles.hintBtn, { borderColor: "#EF4444", backgroundColor: "#EF444415" }]}
              >
                <Feather name="x" size={20} color="#EF4444" />
              </View>
              <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
                {isTop ? "swipe or tap buttons" : ""}
              </Text>
              <View
                style={[styles.hintBtn, { borderColor: "#22C55E", backgroundColor: "#22C55E15" }]}
              >
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
    borderRadius: 28,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.28,
    shadowRadius: 36,
    elevation: 16,
  },
  gradientHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 170,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  saveStamp: {
    position: "absolute",
    top: 28,
    right: 20,
    zIndex: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: "#22C55E",
    backgroundColor: "#22C55E20",
    transform: [{ rotate: "14deg" }],
  },
  saveStampText: {
    fontSize: 22,
    fontWeight: "900",
    fontFamily: "Inter_700Bold",
    color: "#22C55E",
    letterSpacing: 0.5,
  },
  skipStamp: {
    position: "absolute",
    top: 28,
    left: 20,
    zIndex: 100,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: "#EF4444",
    backgroundColor: "#EF444420",
    transform: [{ rotate: "-14deg" }],
  },
  skipStampText: {
    fontSize: 22,
    fontWeight: "900",
    fontFamily: "Inter_700Bold",
    color: "#EF4444",
    letterSpacing: 0.5,
  },
  pressable: { padding: 20, gap: 11 },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  logoContainer: {
    width: LOGO_SIZE + 8,
    height: LOGO_SIZE + 8,
    borderRadius: 20,
    borderWidth: 2,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 10,
  },
  logoImage: { width: LOGO_SIZE, height: LOGO_SIZE },
  logoFallback: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  logoInitials: { fontSize: 22, fontWeight: "800", fontFamily: "Inter_700Bold" },
  topRight: { gap: 6, alignItems: "flex-end" },
  matchBadge: {
    borderRadius: 100,
    overflow: "hidden",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 5,
  },
  matchBadgeGradient: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100 },
  matchBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  pillText: { fontSize: 11, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  jobTitle: {
    fontSize: 22,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  companyName: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: -4 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  metaItem: { flexDirection: "row", gap: 4, alignItems: "center", flexShrink: 1 },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular", flexShrink: 1 },
  salaryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 14,
    alignSelf: "flex-start",
  },
  salaryText: { fontSize: 17, fontWeight: "700", fontFamily: "Inter_700Bold" },
  salaryPeriod: { fontSize: 13, fontWeight: "400", fontFamily: "Inter_400Regular" },
  description: { fontSize: 13, lineHeight: 20, fontFamily: "Inter_400Regular" },
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
