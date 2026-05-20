import {
  useGetJobs,
  useSwipeJob,
  getGetJobsQueryKey,
  getGetSavedJobsQueryKey,
  GetJobsJobType,
  GetJobsExperienceLevel,
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
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

const JOB_TYPE_CHIPS = [
  { label: "Full-time", value: "fulltime" },
  { label: "Contract", value: "contract" },
  { label: "Part-time", value: "parttime" },
  { label: "Intern", value: "internship" },
];

const EXP_CHIPS = [
  { label: "Junior", value: "junior" },
  { label: "Mid", value: "mid" },
  { label: "Senior", value: "senior" },
  { label: "Lead", value: "lead" },
];

function FilterChip({
  label,
  active,
  onPress,
  colors,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? colors.primary : colors.card,
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
    >
      <Text style={[styles.chipText, { color: active ? "#FFFFFF" : colors.mutedForeground }]}>
        {label}
      </Text>
    </Pressable>
  );
}

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
        <View
          style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          {/* Handle bar */}
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
              style={({ pressed }) => [
                styles.googleBtn,
                { opacity: pressed ? 0.9 : 1 },
              ]}
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
        style={[
          styles.actionBtn,
          { shadowColor: isSkip ? "#EF4444" : "#22C55E" },
        ]}
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.82, { damping: 8, stiffness: 400 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 6, stiffness: 300 });
        }}
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

export default function DiscoverScreen() {
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

  const [searchText, setSearchText] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [jobTypeFilter, setJobTypeFilter] = useState("");
  const [expFilter, setExpFilter] = useState("");
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const hasActiveFilters = !!(appliedSearch || jobTypeFilter || expFilter);

  // Auto-dismiss signup wall when user signs in
  useEffect(() => {
    if (isSignedIn && showSignupWall) {
      setShowSignupWall(false);
    }
  }, [isSignedIn, showSignupWall]);

  const resetQueue = useCallback(() => {
    loadedJobIds.current.clear();
    setJobQueue([]);
    setPage(1);
    setHasMore(true);
  }, []);

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchText(text);
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = setTimeout(() => {
        setAppliedSearch(text.trim());
        resetQueue();
      }, 400);
    },
    [resetQueue]
  );

  const toggleJobType = useCallback(
    (value: string) => {
      setJobTypeFilter((prev) => (prev === value ? "" : value));
      resetQueue();
    },
    [resetQueue]
  );

  const toggleExp = useCallback(
    (value: string) => {
      setExpFilter((prev) => (prev === value ? "" : value));
      resetQueue();
    },
    [resetQueue]
  );

  const clearAllFilters = useCallback(() => {
    setSearchText("");
    setAppliedSearch("");
    setJobTypeFilter("");
    setExpFilter("");
    resetQueue();
  }, [resetQueue]);

  const jobsParams = {
    page,
    limit: 10,
    ...(appliedSearch ? { search: appliedSearch } : {}),
    ...(jobTypeFilter ? { jobType: jobTypeFilter as GetJobsJobType } : {}),
    ...(expFilter ? { experienceLevel: expFilter as GetJobsExperienceLevel } : {}),
  };

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
    if (newJobs.length > 0) {
      setJobQueue((prev) => [...prev, ...newJobs]);
    }
    setHasMore(data.hasMore);
    if (data.hasMore && newJobs.length > 0) {
      setPage((p) => p + 1);
    }
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

  const handleRefresh = () => {
    guestSwipeCount.current = 0;
    setShowSignupWall(false);
    clearAllFilters();
  };

  const isInitialLoad = isLoading && jobQueue.length === 0;
  const isEmpty = !isLoading && !isFetching && jobQueue.length === 0 && !hasMore;
  const visibleCards = jobQueue.slice(0, 3);

  if (isInitialLoad) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background, flex: 1 }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
          {appliedSearch ? `Searching "${appliedSearch}"…` : "Finding your matches…"}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <SignupWallModal
        visible={showSignupWall}
        trigger={signupTrigger}
        canDismiss={signupCanDismiss}
        onDismiss={() => setShowSignupWall(false)}
      />

      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Discover</Text>
        <View style={styles.headerRight}>
          {!isSignedIn && (
            <Pressable
              style={[styles.guestBadge, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push("/(auth)/sign-up")}
            >
              <Feather name="user-plus" size={13} color={colors.primary} />
              <Text style={[styles.guestBadgeText, { color: colors.primary }]}>Sign up</Text>
            </Pressable>
          )}
          <View style={[styles.countBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.countText, { color: colors.mutedForeground }]}>
              {jobQueue.length} left
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.filterArea}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search jobs, skills, companies…"
            placeholderTextColor={colors.mutedForeground}
            value={searchText}
            onChangeText={handleSearchChange}
            returnKeyType="search"
          />
          {searchText ? (
            <Pressable onPress={() => handleSearchChange("")} hitSlop={8}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {JOB_TYPE_CHIPS.map((c) => (
            <FilterChip
              key={c.value}
              label={c.label}
              active={jobTypeFilter === c.value}
              onPress={() => toggleJobType(c.value)}
              colors={colors}
            />
          ))}
          <View style={[styles.chipDivider, { backgroundColor: colors.border }]} />
          {EXP_CHIPS.map((c) => (
            <FilterChip
              key={c.value}
              label={c.label}
              active={expFilter === c.value}
              onPress={() => toggleExp(c.value)}
              colors={colors}
            />
          ))}
          {hasActiveFilters && (
            <>
              <View style={[styles.chipDivider, { backgroundColor: colors.border }]} />
              <Pressable
                onPress={clearAllFilters}
                style={[styles.chip, styles.clearChip, { borderColor: "#EF4444" }]}
              >
                <Feather name="x" size={12} color="#EF4444" />
                <Text style={[styles.chipText, { color: "#EF4444" }]}>Clear</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </View>

      {isEmpty ? (
        <View style={[styles.center, { flex: 1 }]}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
            <Feather
              name={hasActiveFilters ? "search" : "briefcase"}
              size={40}
              color={colors.mutedForeground}
            />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
            {hasActiveFilters ? "No matches found" : "You're all caught up!"}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
            {hasActiveFilters
              ? "Try adjusting your filters or search terms."
              : "You've reviewed all available jobs. Check back soon."}
          </Text>
          <Pressable
            style={[styles.refreshBtn, { backgroundColor: colors.primary }]}
            onPress={handleRefresh}
          >
            <Text style={styles.refreshBtnText}>
              {hasActiveFilters ? "Clear Filters" : "Start Over"}
            </Text>
          </Pressable>
        </View>
      ) : (
        <>
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
              <View
                style={[styles.loadingCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
                  Loading more…
                </Text>
              </View>
            )}
          </View>

          <View style={[styles.actionRow, { borderTopColor: colors.border }]}>
            <AnimatedActionButton
              direction="left"
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                topCardRef.current?.swipeLeft();
              }}
            />
            <View style={styles.tipContainer}>
              <Text style={[styles.tipText, { color: colors.mutedForeground }]}>
                ← skip · save →
              </Text>
            </View>
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
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  headerRight: { flexDirection: "row", gap: 8, alignItems: "center" },
  guestBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
  },
  guestBadgeText: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  countBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100, borderWidth: 1 },
  countText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  filterArea: { paddingBottom: 4, gap: 8 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", padding: 0 },
  chipsRow: { paddingHorizontal: 16, gap: 8, flexDirection: "row", alignItems: "center" },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
  },
  clearChip: { backgroundColor: "#EF444415" },
  chipText: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  chipDivider: { width: 1, height: 20, borderRadius: 1 },
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
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderTopWidth: 1,
    paddingBottom: 20,
  },
  tipContainer: { flex: 1, alignItems: "center" },
  tipText: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  actionBtn: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 10,
  },
  emptyIcon: {
    width: 90,
    height: 90,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 22, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "center" },
  emptySubtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
  refreshBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  refreshBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  // Signup wall modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 28,
    paddingBottom: 40,
    alignItems: "center",
    gap: 14,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 4,
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  benefitsCard: {
    width: "100%",
    borderRadius: 16,
    padding: 16,
    gap: 10,
    marginVertical: 4,
  },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  benefitIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitText: { fontSize: 14, fontFamily: "Inter_400Regular", flex: 1 },
  googleBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#FFFFFF",
    paddingVertical: 14,
    borderRadius: 14,
  },
  googleBtnText: {
    color: "#09090B",
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
  modalPrimaryBtn: {
    width: "100%",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
  },
  modalPrimaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
  },
  modalSecondaryBtn: {
    width: "100%",
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  modalSecondaryBtnText: { fontSize: 15, fontWeight: "500", fontFamily: "Inter_500Medium" },
  modalDismiss: { paddingVertical: 6 },
  modalDismissText: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
