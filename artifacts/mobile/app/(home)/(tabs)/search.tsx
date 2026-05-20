import {
  useGetJobs,
  getGetJobsQueryKey,
  GetJobsJobType,
  GetJobsExperienceLevel,
  GetJobsRemoteType,
  type Job,
} from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { JobCard } from "@/components/JobCard";
import { useColors } from "@/hooks/useColors";

// ─── Filter data ─────────────────────────────────────────────────────────────
const JOB_TYPES: { label: string; value: GetJobsJobType }[] = [
  { label: "Full-time", value: "fulltime" },
  { label: "Contract", value: "contract" },
  { label: "Part-time", value: "parttime" },
  { label: "Internship", value: "internship" },
];

const EXP_LEVELS: { label: string; value: GetJobsExperienceLevel }[] = [
  { label: "Junior", value: "junior" },
  { label: "Mid-level", value: "mid" },
  { label: "Senior", value: "senior" },
  { label: "Lead", value: "lead" },
  { label: "Executive", value: "executive" },
];

const REMOTE_TYPES: { label: string; value: GetJobsRemoteType; color: string }[] = [
  { label: "Remote", value: "remote", color: "#22C55E" },
  { label: "Hybrid", value: "hybrid", color: "#F59E0B" },
  { label: "On-site", value: "onsite", color: "#3B82F6" },
];

const POPULAR_CATEGORIES = [
  "Engineering", "Design", "Marketing", "Sales", "Finance",
  "Data Science", "Product", "DevOps", "Healthcare", "Legal",
];

const POPULAR_LOCATIONS = [
  "London", "New York", "Remote", "Berlin", "Amsterdam",
  "San Francisco", "Toronto", "Sydney", "Paris", "Singapore",
];

// ─── Chip ─────────────────────────────────────────────────────────────────────
function Chip({
  label,
  active,
  onPress,
  activeColor,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  activeColor?: string;
}) {
  const colors = useColors();
  const accent = activeColor ?? colors.primary;
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? accent + "20" : colors.card,
          borderColor: active ? accent : colors.border,
        },
      ]}
    >
      {active && <Feather name="check" size={11} color={accent} />}
      <Text style={[styles.chipText, { color: active ? accent : colors.mutedForeground }]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────
function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={styles.filterSection}>
      <Text style={[styles.filterLabel, { color: colors.mutedForeground }]}>{title}</Text>
      {children}
    </View>
  );
}

// ─── Active filter summary strip ──────────────────────────────────────────────
function ActiveFilterBadge({ label, onRemove }: { label: string; onRemove: () => void }) {
  const colors = useColors();
  return (
    <View style={[styles.activeBadge, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "35" }]}>
      <Text style={[styles.activeBadgeText, { color: colors.primary }]}>{label}</Text>
      <Pressable onPress={onRemove} hitSlop={6}>
        <Feather name="x" size={11} color={colors.primary} />
      </Pressable>
    </View>
  );
}

// ─── Search screen ────────────────────────────────────────────────────────────
export default function SearchScreen() {
  const colors = useColors();
  const searchRef = useRef<TextInput>(null);

  // Filter state
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [appliedLocation, setAppliedLocation] = useState("");
  const [category, setCategory] = useState("");
  const [appliedCategory, setAppliedCategory] = useState("");
  const [jobType, setJobType] = useState<GetJobsJobType | "">("");
  const [expLevel, setExpLevel] = useState<GetJobsExperienceLevel | "">("");
  const [remoteType, setRemoteType] = useState<GetJobsRemoteType | "">("");
  const [showFilters, setShowFilters] = useState(true);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Results state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const loadedIds = useRef(new Set<number>());

  const hasActiveFilters = !!(appliedKeyword || appliedLocation || appliedCategory || jobType || expLevel || remoteType);

  const queryParams = {
    page,
    limit: 15,
    ...(appliedKeyword ? { search: appliedKeyword } : {}),
    ...(appliedLocation ? { location: appliedLocation } : {}),
    ...(appliedCategory ? { category: appliedCategory } : {}),
    ...(jobType ? { jobType } : {}),
    ...(expLevel ? { experienceLevel: expLevel } : {}),
    ...(remoteType ? { remoteType } : {}),
  };

  const { data, isLoading, isFetching } = useGetJobs(queryParams as any, {
    query: {
      queryKey: getGetJobsQueryKey(queryParams as any),
      enabled: hasSearched && hasActiveFilters,
      staleTime: 0,
    },
  });

  useEffect(() => {
    if (!data) return;
    const newJobs = data.jobs.filter((j) => !loadedIds.current.has(j.id));
    newJobs.forEach((j) => loadedIds.current.add(j.id));
    setJobs((prev) => (page === 1 ? newJobs : [...prev, ...newJobs]));
    setHasMore(data.hasMore);
  }, [data]);

  const runSearch = useCallback((resetPage = true) => {
    if (resetPage) {
      loadedIds.current.clear();
      setJobs([]);
      setPage(1);
      setHasMore(false);
    }
    setHasSearched(true);
    setShowFilters(false);
  }, []);

  const handleKeywordChange = (text: string) => {
    setKeyword(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setAppliedKeyword(text.trim());
    }, 400);
  };

  const handleLocationChange = (text: string) => {
    setLocation(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setAppliedLocation(text.trim());
    }, 400);
  };

  const handleSearch = () => {
    setAppliedKeyword(keyword.trim());
    setAppliedLocation(location.trim());
    setAppliedCategory(category.trim());
    runSearch(true);
  };

  const clearAll = useCallback(() => {
    setKeyword("");
    setAppliedKeyword("");
    setLocation("");
    setAppliedLocation("");
    setCategory("");
    setAppliedCategory("");
    setJobType("");
    setExpLevel("");
    setRemoteType("");
    setJobs([]);
    setHasSearched(false);
    setShowFilters(true);
    loadedIds.current.clear();
  }, []);

  const loadMore = () => {
    if (hasMore && !isFetching) setPage((p) => p + 1);
  };

  const activeFilterCount = [appliedKeyword, appliedLocation, appliedCategory, jobType, expLevel, remoteType].filter(Boolean).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.headerBar, { borderBottomColor: colors.border }]}>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Search Jobs</Text>
        {activeFilterCount > 0 && (
          <Pressable onPress={clearAll} hitSlop={8}>
            <Text style={[styles.clearAllText, { color: colors.primary }]}>Clear all</Text>
          </Pressable>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
      >
        {/* Search inputs */}
        <View style={styles.inputGroup}>
          {/* Keyword */}
          <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="search" size={17} color={colors.mutedForeground} />
            <TextInput
              ref={searchRef}
              style={[styles.input, { color: colors.foreground }]}
              placeholder="Job title, skill, or company…"
              placeholderTextColor={colors.mutedForeground}
              value={keyword}
              onChangeText={handleKeywordChange}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
              clearButtonMode="while-editing"
            />
            {keyword ? (
              <Pressable onPress={() => handleKeywordChange("")} hitSlop={8}>
                <Feather name="x" size={15} color={colors.mutedForeground} />
              </Pressable>
            ) : null}
          </View>

          {/* Location */}
          <View style={[styles.inputWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="map-pin" size={17} color={colors.mutedForeground} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="City, region, or country…"
              placeholderTextColor={colors.mutedForeground}
              value={location}
              onChangeText={handleLocationChange}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
              clearButtonMode="while-editing"
            />
            {location ? (
              <Pressable onPress={() => handleLocationChange("")} hitSlop={8}>
                <Feather name="x" size={15} color={colors.mutedForeground} />
              </Pressable>
            ) : null}
          </View>

          {/* Search button */}
          <Pressable
            style={[styles.searchBtn, { backgroundColor: colors.primary }]}
            onPress={handleSearch}
          >
            <Feather name="search" size={16} color="#FFF" />
            <Text style={styles.searchBtnText}>Search Jobs</Text>
          </Pressable>
        </View>

        {/* Filter toggle */}
        <Pressable
          style={[styles.filterToggle, { borderColor: colors.border }]}
          onPress={() => setShowFilters((v) => !v)}
        >
          <View style={styles.filterToggleLeft}>
            <Feather name="sliders" size={15} color={colors.foreground} />
            <Text style={[styles.filterToggleText, { color: colors.foreground }]}>Filters</Text>
            {activeFilterCount > 0 && (
              <View style={[styles.filterCountBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.filterCountText}>{activeFilterCount}</Text>
              </View>
            )}
          </View>
          <Feather
            name={showFilters ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.mutedForeground}
          />
        </Pressable>

        {/* Filter panel */}
        {showFilters && (
          <View style={[styles.filterPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Popular locations */}
            <FilterSection title="POPULAR LOCATIONS">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {POPULAR_LOCATIONS.map((loc) => (
                  <Chip
                    key={loc}
                    label={loc}
                    active={location.toLowerCase() === loc.toLowerCase()}
                    onPress={() => {
                      const next = location.toLowerCase() === loc.toLowerCase() ? "" : loc;
                      setLocation(next);
                      setAppliedLocation(next);
                    }}
                  />
                ))}
              </ScrollView>
            </FilterSection>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Job type */}
            <FilterSection title="JOB TYPE">
              <View style={styles.chipWrap}>
                {JOB_TYPES.map((t) => (
                  <Chip
                    key={t.value}
                    label={t.label}
                    active={jobType === t.value}
                    onPress={() => setJobType((prev) => (prev === t.value ? "" : t.value))}
                  />
                ))}
              </View>
            </FilterSection>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Experience level */}
            <FilterSection title="EXPERIENCE LEVEL">
              <View style={styles.chipWrap}>
                {EXP_LEVELS.map((e) => (
                  <Chip
                    key={e.value}
                    label={e.label}
                    active={expLevel === e.value}
                    onPress={() => setExpLevel((prev) => (prev === e.value ? "" : e.value))}
                  />
                ))}
              </View>
            </FilterSection>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Remote type */}
            <FilterSection title="WORK ARRANGEMENT">
              <View style={styles.chipWrap}>
                {REMOTE_TYPES.map((r) => (
                  <Chip
                    key={r.value}
                    label={r.label}
                    active={remoteType === r.value}
                    onPress={() => setRemoteType((prev) => (prev === r.value ? "" : r.value))}
                    activeColor={r.color}
                  />
                ))}
              </View>
            </FilterSection>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            {/* Categories */}
            <FilterSection title="CATEGORY">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {POPULAR_CATEGORIES.map((cat) => (
                  <Chip
                    key={cat}
                    label={cat}
                    active={category.toLowerCase() === cat.toLowerCase()}
                    onPress={() => {
                      const next = category.toLowerCase() === cat.toLowerCase() ? "" : cat;
                      setCategory(next);
                      setAppliedCategory(next);
                    }}
                  />
                ))}
              </ScrollView>
            </FilterSection>
          </View>
        )}

        {/* Active filter summary */}
        {hasActiveFilters && !showFilters && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activeBadgesRow}
          >
            {appliedKeyword ? (
              <ActiveFilterBadge label={`"${appliedKeyword}"`} onRemove={() => { setKeyword(""); setAppliedKeyword(""); }} />
            ) : null}
            {appliedLocation ? (
              <ActiveFilterBadge label={`📍 ${appliedLocation}`} onRemove={() => { setLocation(""); setAppliedLocation(""); }} />
            ) : null}
            {appliedCategory ? (
              <ActiveFilterBadge label={appliedCategory} onRemove={() => { setCategory(""); setAppliedCategory(""); }} />
            ) : null}
            {jobType ? (
              <ActiveFilterBadge
                label={JOB_TYPES.find((t) => t.value === jobType)?.label ?? jobType}
                onRemove={() => setJobType("")}
              />
            ) : null}
            {expLevel ? (
              <ActiveFilterBadge
                label={EXP_LEVELS.find((e) => e.value === expLevel)?.label ?? expLevel}
                onRemove={() => setExpLevel("")}
              />
            ) : null}
            {remoteType ? (
              <ActiveFilterBadge
                label={REMOTE_TYPES.find((r) => r.value === remoteType)?.label ?? remoteType}
                onRemove={() => setRemoteType("")}
              />
            ) : null}
          </ScrollView>
        )}

        {/* Results */}
        {hasSearched && (
          <View style={styles.resultsSection}>
            {isLoading && jobs.length === 0 ? (
              <View style={styles.loadingCenter}>
                <ActivityIndicator color={colors.primary} size="large" />
                <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
                  Searching…
                </Text>
              </View>
            ) : jobs.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Feather name="search" size={34} color={colors.mutedForeground} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No results found</Text>
                <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                  Try different keywords, a broader location, or fewer filters.
                </Text>
              </View>
            ) : (
              <>
                {/* Results count */}
                <View style={styles.resultsHeader}>
                  <Text style={[styles.resultsCount, { color: colors.foreground }]}>
                    {data?.total != null ? `${data.total} job${data.total !== 1 ? "s" : ""}` : `${jobs.length} results`}
                  </Text>
                  <Text style={[styles.resultsSub, { color: colors.mutedForeground }]}>
                    {hasActiveFilters ? "matching your filters" : "available"}
                  </Text>
                </View>

                {jobs.map((job, index) => (
                  <Animated.View key={job.id} entering={FadeInDown.duration(300).delay(index < 5 ? index * 50 : 0)}>
                    <JobCard
                      job={job}
                      onPress={() => router.push(`/(home)/job/${job.id}`)}
                    />
                  </Animated.View>
                ))}

                {hasMore && (
                  <Pressable
                    style={[styles.loadMoreBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
                    onPress={loadMore}
                    disabled={isFetching}
                  >
                    {isFetching ? (
                      <ActivityIndicator color={colors.primary} size="small" />
                    ) : (
                      <>
                        <Text style={[styles.loadMoreText, { color: colors.foreground }]}>Load more</Text>
                        <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
                      </>
                    )}
                  </Pressable>
                )}
              </>
            )}
          </View>
        )}

        {/* Landing state — no search yet */}
        {!hasSearched && (
          <View style={styles.landingState}>
            <View style={[styles.landingIcon, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="compass" size={36} color={colors.primary} />
            </View>
            <Text style={[styles.landingTitle, { color: colors.foreground }]}>
              Find the right job
            </Text>
            <Text style={[styles.landingSubtitle, { color: colors.mutedForeground }]}>
              Search by title, skill, location, or industry.{"\n"}Use filters to narrow down to your perfect match.
            </Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: "800",
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  clearAllText: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  inputGroup: { padding: 16, gap: 10 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular", padding: 0 },
  searchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
  },
  searchBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
    fontFamily: "Inter_700Bold",
  },
  filterToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  filterToggleLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  filterToggleText: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  filterCountBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  filterCountText: { fontSize: 10, fontWeight: "700", color: "#FFF", fontFamily: "Inter_700Bold" },
  filterPanel: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 12,
  },
  filterSection: { padding: 16, gap: 10 },
  filterLabel: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.8,
  },
  chipRow: { flexDirection: "row", gap: 8 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 100,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  divider: { height: 1, marginHorizontal: 0 },
  activeBadgesRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 12,
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
  },
  activeBadgeText: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  resultsSection: { paddingHorizontal: 16, gap: 10 },
  resultsHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    paddingBottom: 4,
  },
  resultsCount: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  resultsSub: { fontSize: 14, fontFamily: "Inter_400Regular" },
  loadingCenter: { alignItems: "center", paddingVertical: 40, gap: 12 },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 12 },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  emptyTitle: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold" },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 21,
  },
  loadMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  loadMoreText: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  landingState: { alignItems: "center", paddingVertical: 48, paddingHorizontal: 32, gap: 14 },
  landingIcon: {
    width: 84,
    height: 84,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginBottom: 4,
  },
  landingTitle: { fontSize: 22, fontWeight: "700", fontFamily: "Inter_700Bold" },
  landingSubtitle: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },
});
