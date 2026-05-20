import {
  useGetJobs,
  useSwipeJob,
  getGetJobsQueryKey,
  getGetSavedJobsQueryKey,
  type Job,
} from "@workspace/api-client-react";
import { useAuth, useSSO } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import * as AuthSession from "expo-auth-session";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";

import { SwipeCard, type SwipeCardHandle } from "@/components/SwipeCard";
import { useColors } from "@/hooks/useColors";

WebBrowser.maybeCompleteAuthSession();

const GUEST_SWIPE_LIMIT = 5;

const BENEFITS = [
  { icon: "zap" as const, text: "Unlimited job swipes" },
  { icon: "bookmark" as const, text: "Save jobs for later" },
  { icon: "send" as const, text: "Apply with one tap" },
  { icon: "star" as const, text: "Personalized match scores" },
];

function SignupWallModal({
  visible,
  trigger,
  onDismiss,
  canDismiss,
}: {
  visible: boolean;
  trigger: "save" | "limit";
  onDismiss: () => void;
  canDismiss: boolean;
}) {
  const colors = useColors();
  const { startSSOFlow } = useSSO();
  const [ssoLoading, setSsoLoading] = useState(false);

  const handleGoogleSSO = async () => {
    setSsoLoading(true);
    try {
      const { createdSessionId, setActive } = await startSSOFlow({
        strategy: "oauth_google",
        redirectUrl: AuthSession.makeRedirectUri(),
      });
      if (createdSessionId && setActive) {
        await setActive({ session: createdSessionId });
      }
    } catch {
      // ignore
    } finally {
      setSsoLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
          <View style={[styles.modalIconWrap, { backgroundColor: colors.primary + "20" }]}>
            <Feather name="zap" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>
            {"Unlock unlimited\njob matches"}
          </Text>
          <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>
            {trigger === "save"
              ? "Create a free account to save jobs and apply instantly."
              : `You've reviewed ${GUEST_SWIPE_LIMIT} jobs as a guest. Sign up to keep going!`}
          </Text>
          <View style={[styles.benefitsCard, { backgroundColor: colors.secondary }]}>
            {BENEFITS.map((b) => (
              <View key={b.text} style={styles.benefitRow}>
                <View style={[styles.benefitIcon, { backgroundColor: colors.primary + "20" }]}>
                  <Feather name={b.icon} size={13} color={colors.primary} />
                </View>
                <Text style={[styles.benefitText, { color: colors.foreground }]}>{b.text}</Text>
              </View>
            ))}
          </View>
          {Platform.OS !== "web" && (
            <Pressable
              style={({ pressed }) => [styles.googleBtn, { opacity: pressed ? 0.9 : 1 }]}
              onPress={handleGoogleSSO}
              disabled={ssoLoading}
            >
              {ssoLoading ? (
                <ActivityIndicator color="#09090B" size="small" />
              ) : (
                <>
                  <Feather name="globe" size={18} color="#09090B" />
                  <Text style={styles.googleBtnText}>Continue with Google</Text>
                </>
              )}
            </Pressable>
          )}
          <Pressable
            style={({ pressed }) => [
              styles.modalPrimaryBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() => router.push("/(auth)/sign-up")}
          >
            <Text style={styles.modalPrimaryBtnText}>Sign Up Free with Email</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [
              styles.modalSecondaryBtn,
              { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={() => router.push("/(auth)/sign-in")}
          >
            <Text style={[styles.modalSecondaryBtnText, { color: colors.foreground }]}>
              I already have an account
            </Text>
          </Pressable>
          {canDismiss && (
            <Pressable style={styles.modalDismiss} onPress={onDismiss}>
              <Text style={[styles.modalDismissText, { color: colors.mutedForeground }]}>
                Not now
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

function AnimatedActionButton({
  onPress,
  direction,
}: {
  onPress: () => void;
  direction: "left" | "right";
}) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  const isSkip = direction === "left";

  return (
    <Animated.View style={animStyle}>
      <Pressable
        style={[styles.actionBtn, { shadowColor: isSkip ? "#EF4444" : "#22C55E" }]}
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.82, { damping: 8, stiffness: 400 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 6, stiffness: 300 }); }}
      >
        <LinearGradient
          colors={isSkip ? ["#FF5252", "#EF4444"] : ["#4ADE80", "#22C55E"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <Feather name={isSkip ? "x" : "heart"} size={30} color="#FFFFFF" />
      </Pressable>
    </Animated.View>
  );
}

export default function SwipeScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { isSignedIn } = useAuth();

  const [jobQueue, setJobQueue] = useState<Job[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loadedJobIds = useRef(new Set<number>());
  const topCardRef = useRef<SwipeCardHandle>(null);

  const guestSwipeCount = useRef(0);
  const [showSignupWall, setShowSignupWall] = useState(false);
  const [signupTrigger, setSignupTrigger] = useState<"save" | "limit">("limit");
  const [signupCanDismiss, setSignupCanDismiss] = useState(true);

  useEffect(() => {
    if (isSignedIn && showSignupWall) setShowSignupWall(false);
  }, [isSignedIn, showSignupWall]);

  const resetQueue = useCallback(() => {
    loadedJobIds.current.clear();
    setJobQueue([]);
    setPage(1);
    setHasMore(true);
  }, []);

  const jobsParams = { page, limit: 10 };

  const { data, isLoading, isFetching } = useGetJobs(jobsParams, {
    query: {
      queryKey: getGetJobsQueryKey(jobsParams),
      enabled: hasMore && jobQueue.length < 5,
      staleTime: 0,
    },
  });

  useEffect(() => {
    if (!data) return;
    const newJobs = data.jobs.filter((j) => !loadedJobIds.current.has(j.id));
    newJobs.forEach((j) => loadedJobIds.current.add(j.id));
    if (newJobs.length > 0) setJobQueue((prev) => [...prev, ...newJobs]);
    setHasMore(data.hasMore);
    if (data.hasMore && newJobs.length > 0) setPage((p) => p + 1);
  }, [data]);

  const { mutate: swipeJob } = useSwipeJob({
    mutation: {
      onSuccess: (_, { data: body }) => {
        if (body?.direction === "right") {
          queryClient.invalidateQueries({ queryKey: getGetSavedJobsQueryKey() });
        }
      },
    },
  });

  const handleSwipe = useCallback(
    (direction: "left" | "right", job: Job) => {
      setJobQueue((prev) => prev.filter((j) => j.id !== job.id));
      if (!isSignedIn) {
        guestSwipeCount.current += 1;
        if (direction === "right") {
          setSignupTrigger("save");
          setSignupCanDismiss(true);
          setShowSignupWall(true);
        } else if (guestSwipeCount.current >= GUEST_SWIPE_LIMIT) {
          setSignupTrigger("limit");
          setSignupCanDismiss(false);
          setShowSignupWall(true);
        }
        return;
      }
      swipeJob({ jobId: job.id, data: { direction } });
    },
    [isSignedIn, swipeJob]
  );

  const isInitialLoad = isLoading && jobQueue.length === 0;
  const isEmpty = !isLoading && !isFetching && jobQueue.length === 0 && !hasMore;
  const visibleCards = jobQueue.slice(0, 3);

  if (isInitialLoad) {
    return (
      <LinearGradient colors={["#09090B", "#0F0F14", colors.background]} style={{ flex: 1 }}>
        <SafeAreaView style={[styles.center, { flex: 1 }]}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            Finding your matches…
          </Text>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={["#09090B", "#0F0F14", colors.background]} style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <SignupWallModal
          visible={showSignupWall}
          trigger={signupTrigger}
          canDismiss={signupCanDismiss}
          onDismiss={() => setShowSignupWall(false)}
        />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <LinearGradient
              colors={[colors.primary, "#FF2D55"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoMark}
            >
              <Feather name="briefcase" size={14} color="#FFF" />
            </LinearGradient>
            <View>
              <Text style={styles.headerTitle}>Swipe</Text>
              <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
                {jobQueue.length > 0 ? `${jobQueue.length} jobs waiting` : "All caught up!"}
              </Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            {!isSignedIn && (
              <Pressable
                style={[styles.signUpPill, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" }]}
                onPress={() => router.push("/(auth)/sign-up")}
              >
                <Feather name="user-plus" size={13} color={colors.primary} />
                <Text style={[styles.signUpPillText, { color: colors.primary }]}>Sign up</Text>
              </Pressable>
            )}
            <Pressable
              style={[styles.searchPill, { backgroundColor: "#FFFFFF10", borderColor: "#FFFFFF18" }]}
              onPress={() => router.push("/(home)/(tabs)/search")}
            >
              <Feather name="search" size={14} color="#FFFFFF80" />
              <Text style={[styles.searchPillText, { color: "#FFFFFF80" }]}>Search</Text>
            </Pressable>
          </View>
        </View>

        {isEmpty ? (
          <View style={[styles.center, { flex: 1 }]}>
            <View style={[styles.emptyIcon, { backgroundColor: "#FFFFFF0A", borderColor: "#FFFFFF15" }]}>
              <Feather name="briefcase" size={40} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.emptyTitle, { color: "#FFFFFF" }]}>You're all caught up!</Text>
            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
              You've reviewed all available jobs.{"\n"}Check back soon for new listings.
            </Text>
            <Pressable
              style={[styles.refreshBtn, { backgroundColor: colors.primary }]}
              onPress={() => {
                guestSwipeCount.current = 0;
                setShowSignupWall(false);
                resetQueue();
              }}
            >
              <Text style={styles.refreshBtnText}>Start Over</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Card stack */}
            <View style={styles.cardStack}>
              {[...visibleCards].reverse().map((job, reversedIndex) => {
                const stackIndex = visibleCards.length - 1 - reversedIndex;
                const isTop = stackIndex === 0;
                return (
                  <SwipeCard
                    key={job.id}
                    ref={isTop ? topCardRef : undefined}
                    job={job}
                    isTop={isTop}
                    stackIndex={stackIndex}
                    onSwipeLeft={() => handleSwipe("left", job)}
                    onSwipeRight={() => handleSwipe("right", job)}
                    onPress={() => router.push(`/(home)/job/${job.id}`)}
                  />
                );
              })}
              {isFetching && jobQueue.length === 0 && (
                <View style={[styles.loadingCard, { backgroundColor: "#FFFFFF08", borderColor: "#FFFFFF15" }]}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Loading more…</Text>
                </View>
              )}
            </View>

            {/* Hint labels */}
            <View style={styles.hintRow}>
              <View style={[styles.hintPill, { backgroundColor: "#EF444418", borderColor: "#EF444430" }]}>
                <Feather name="x" size={12} color="#EF4444" />
                <Text style={[styles.hintText, { color: "#EF4444" }]}>Skip</Text>
              </View>
              <Text style={[styles.hintCenter, { color: "#FFFFFF30" }]}>swipe to decide</Text>
              <View style={[styles.hintPill, { backgroundColor: "#22C55E18", borderColor: "#22C55E30" }]}>
                <Text style={[styles.hintText, { color: "#22C55E" }]}>Save</Text>
                <Feather name="heart" size={12} color="#22C55E" />
              </View>
            </View>

            {/* Action buttons */}
            <View style={styles.actionRow}>
              <AnimatedActionButton
                direction="left"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                  topCardRef.current?.swipeLeft();
                }}
              />
              <Pressable
                style={[styles.detailBtn, { backgroundColor: "#FFFFFF0C", borderColor: "#FFFFFF18" }]}
                onPress={() => {
                  const top = visibleCards[0];
                  if (top) router.push(`/(home)/job/${top.id}`);
                }}
              >
                <Feather name="info" size={20} color="#FFFFFF60" />
              </Pressable>
              <AnimatedActionButton
                direction="right"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                  topCardRef.current?.swipeRight();
                }}
              />
            </View>
          </>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 8,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoMark: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  headerRight: { flexDirection: "row", gap: 8, alignItems: "center" },
  signUpPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
  },
  signUpPillText: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  searchPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
  },
  searchPillText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  cardStack: {
    flex: 1,
    marginHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingCard: {
    width: "100%",
    height: 380,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 8 },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 28,
    paddingVertical: 8,
  },
  hintPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
  },
  hintText: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  hintCenter: { fontSize: 11, fontFamily: "Inter_400Regular" },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 32,
    paddingVertical: 14,
    paddingBottom: 20,
  },
  actionBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  detailBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  emptyIcon: {
    width: 90,
    height: 90,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    borderWidth: 1,
  },
  emptyTitle: { fontSize: 22, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "center" },
  emptySubtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
    color: "#FFFFFF60",
  },
  refreshBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  refreshBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  // Signup wall modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 24,
    gap: 16,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  modalIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  modalSubtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  benefitsCard: { borderRadius: 16, padding: 16, gap: 12 },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  benefitIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitText: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    borderRadius: 14,
  },
  googleBtnText: { fontSize: 15, fontWeight: "600", color: "#09090B", fontFamily: "Inter_600SemiBold" },
  modalPrimaryBtn: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
  },
  modalPrimaryBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
  },
  modalSecondaryBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  modalSecondaryBtnText: { fontSize: 15, fontFamily: "Inter_400Regular" },
  modalDismiss: { alignItems: "center", paddingVertical: 4 },
  modalDismissText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
