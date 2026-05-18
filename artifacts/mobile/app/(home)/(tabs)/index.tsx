import {
  useGetJobs,
  useSwipeJob,
  getGetJobsQueryKey,
  getGetSavedJobsQueryKey,
  type Job,
} from "@workspace/api-client-react";
import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";

import { SwipeCard } from "@/components/SwipeCard";
import { useColors } from "@/hooks/useColors";

const GUEST_SWIPE_LIMIT = 5;

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

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.modalIconWrap, { backgroundColor: colors.primary + "20" }]}>
            <Feather name="lock" size={28} color={colors.primary} />
          </View>

          <Text style={[styles.modalTitle, { color: colors.foreground }]}>
            {trigger === "save" ? "Save this job" : "Keep discovering"}
          </Text>
          <Text style={[styles.modalSubtitle, { color: colors.mutedForeground }]}>
            {trigger === "save"
              ? "Create a free account to save jobs and track your applications."
              : `You've reviewed ${GUEST_SWIPE_LIMIT} jobs as a guest. Sign up to keep discovering personalized matches.`}
          </Text>

          <View style={styles.modalBenefits}>
            {["Save your favourite jobs", "Personalized match scores", "Track applications"].map(
              (b) => (
                <View key={b} style={styles.benefitRow}>
                  <Feather name="check-circle" size={16} color="#22C55E" />
                  <Text style={[styles.benefitText, { color: colors.foreground }]}>{b}</Text>
                </View>
              )
            )}
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.modalPrimaryBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={() => router.push("/(auth)/sign-up")}
          >
            <Text style={styles.modalPrimaryBtnText}>Create Free Account</Text>
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

export default function DiscoverScreen() {
  const colors = useColors();
  const queryClient = useQueryClient();
  const { isSignedIn } = useAuth();

  const [jobQueue, setJobQueue] = useState<Job[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loadedJobIds = useRef(new Set<number>());
  const guestSwipeCount = useRef(0);
  const [showSignupWall, setShowSignupWall] = useState(false);
  const [signupTrigger, setSignupTrigger] = useState<"save" | "limit">("limit");
  const [signupCanDismiss, setSignupCanDismiss] = useState(true);

  const jobsParams = { page, limit: 10 };
  const { data, isLoading, isFetching } = useGetJobs(jobsParams, {
    query: { queryKey: getGetJobsQueryKey(jobsParams), enabled: hasMore && jobQueue.length < 5 },
  });

  useEffect(() => {
    if (!data) return;
    const newJobs = data.jobs.filter((j) => !loadedJobIds.current.has(j.id));
    newJobs.forEach((j) => loadedJobIds.current.add(j.id));
    setJobQueue((prev) => [...prev, ...newJobs]);
    setHasMore(data.hasMore);
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

      if (jobQueue.length <= 4 && hasMore) {
        setPage((p) => p + 1);
      }

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
      if (direction === "right") {
        queryClient.invalidateQueries({ queryKey: getGetSavedJobsQueryKey() });
      }
    },
    [isSignedIn, swipeJob, jobQueue.length, hasMore, queryClient]
  );

  const handleRefresh = () => {
    loadedJobIds.current.clear();
    guestSwipeCount.current = 0;
    setJobQueue([]);
    setPage(1);
    setHasMore(true);
    setShowSignupWall(false);
  };

  const isInitialLoad = isLoading && jobQueue.length === 0;
  const isEmpty = !isLoading && !isFetching && jobQueue.length === 0 && !hasMore;

  if (isInitialLoad) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
          Finding your matches…
        </Text>
      </SafeAreaView>
    );
  }

  if (isEmpty) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: colors.background }]}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
          <Feather name="briefcase" size={40} color={colors.mutedForeground} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.foreground }]}>You're all caught up!</Text>
        <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
          You've reviewed all available jobs. Check back soon for new listings.
        </Text>
        <Pressable
          style={[styles.refreshBtn, { backgroundColor: colors.primary }]}
          onPress={handleRefresh}
        >
          <Text style={styles.refreshBtnText}>Start Over</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const visibleCards = jobQueue.slice(0, 3);

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
              <Feather name="user-plus" size={14} color={colors.primary} />
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

      {!isSignedIn && (
        <View style={[styles.guestBanner, { backgroundColor: colors.card + "CC", borderColor: colors.border }]}>
          <Feather name="info" size={13} color={colors.mutedForeground} />
          <Text style={[styles.guestBannerText, { color: colors.mutedForeground }]}>
            Browsing as guest · {Math.max(0, GUEST_SWIPE_LIMIT - guestSwipeCount.current)} swipes left
          </Text>
        </View>
      )}

      <View style={styles.cardStack}>
        {[...visibleCards].reverse().map((job, reversedIndex) => {
          const stackIndex = visibleCards.length - 1 - reversedIndex;
          const isTop = stackIndex === 0;
          return (
            <SwipeCard
              key={job.id}
              job={job}
              isTop={isTop}
              stackIndex={stackIndex}
              onSwipeLeft={() => handleSwipe("left", job)}
              onSwipeRight={() => handleSwipe("right", job)}
              onPress={() => router.push(`/(home)/job/${job.id}`)}
            />
          );
        })}

        {isFetching && jobQueue.length < 3 && (
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
        <Pressable
          style={[styles.actionBtn, styles.skipBtn]}
          onPress={() => {
            if (jobQueue[0]) handleSwipe("left", jobQueue[0]);
          }}
        >
          <Feather name="x" size={28} color="#EF4444" />
        </Pressable>

        <View style={styles.tipContainer}>
          <Text style={[styles.tipText, { color: colors.mutedForeground }]}>
            ← skip · save →
          </Text>
        </View>

        <Pressable
          style={[styles.actionBtn, styles.saveBtn]}
          onPress={() => {
            if (jobQueue[0]) handleSwipe("right", jobQueue[0]);
          }}
        >
          <Feather name="heart" size={28} color="#22C55E" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
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
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
  },
  guestBadgeText: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  guestBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  guestBannerText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  countBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, borderWidth: 1 },
  countText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  cardStack: {
    flex: 1,
    marginHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingCard: {
    width: "100%",
    height: 420,
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
    paddingVertical: 16,
    borderTopWidth: 1,
    paddingBottom: 24,
  },
  tipContainer: { flex: 1, alignItems: "center" },
  tipText: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  actionBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  skipBtn: { borderColor: "#EF4444", backgroundColor: "#EF444415" },
  saveBtn: { borderColor: "#22C55E", backgroundColor: "#22C55E15" },
  emptyIcon: { width: 90, height: 90, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  emptyTitle: { fontSize: 22, fontWeight: "700", fontFamily: "Inter_700Bold", textAlign: "center" },
  emptySubtitle: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  refreshBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  refreshBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    borderRadius: 24,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    gap: 14,
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  modalTitle: { fontSize: 22, fontWeight: "800", fontFamily: "Inter_700Bold", textAlign: "center" },
  modalSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  modalBenefits: { width: "100%", gap: 8, marginVertical: 4 },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  benefitText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  modalPrimaryBtn: { width: "100%", paddingVertical: 15, borderRadius: 14, alignItems: "center" },
  modalPrimaryBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold" },
  modalSecondaryBtn: { width: "100%", paddingVertical: 13, borderRadius: 14, alignItems: "center", borderWidth: 1 },
  modalSecondaryBtnText: { fontSize: 15, fontWeight: "500", fontFamily: "Inter_500Medium" },
  modalDismiss: { paddingVertical: 6 },
  modalDismissText: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
