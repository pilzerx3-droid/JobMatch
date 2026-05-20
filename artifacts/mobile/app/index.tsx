import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

const PRIMARY = "#FF4D6D";
const BG_TOP = "#09090B";
const BG_MID = "#0F0F12";
const BG_BOT = "#18181B";
const WHITE = "#FFFFFF";
const MUTED = "#71717A";
const CARD_BG = "#15151C";
const BORDER = "#2A2A35";
const STORAGE_KEY = "hasSeenWelcome";

type SlideId = "hero" | "howItWorks" | "aiCompanion";

const SLIDES: SlideId[] = ["hero", "howItWorks", "aiCompanion"];

// ─── Dot ─────────────────────────────────────────────────────────────────────
function Dot({ active }: { active: boolean }) {
  const width = useSharedValue(active ? 24 : 6);
  const opacity = useSharedValue(active ? 1 : 0.35);

  useEffect(() => {
    width.value = withSpring(active ? 24 : 6, { damping: 18, stiffness: 200 });
    opacity.value = withTiming(active ? 1 : 0.35, { duration: 200 });
  }, [active]);

  const style = useAnimatedStyle(() => ({
    width: width.value,
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[styles.dot, style, { backgroundColor: active ? PRIMARY : "#52525B" }]}
    />
  );
}

// ─── Slide 1: Hero ───────────────────────────────────────────────────────────
function HeroSlide({ onStart, onSignUp }: { onStart: () => void; onSignUp: () => void }) {
  const JOBS = ["Senior iOS Engineer", "Product Designer", "ML Engineer"];

  return (
    <View style={styles.slide}>
      <View style={styles.slideInner}>
        {/* Logo */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.logoWrap}>
          <LinearGradient
            colors={[PRIMARY, "#FF2D55"]}
            style={styles.logoGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Feather name="briefcase" size={34} color={WHITE} />
          </LinearGradient>
          <Text style={styles.appName}>SwipeJobs</Text>
        </Animated.View>

        {/* Stacked preview cards */}
        <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.cardsWrap}>
          {JOBS.map((title, i) => (
            <View
              key={title}
              style={[
                styles.previewCard,
                {
                  zIndex: JOBS.length - i,
                  transform: [
                    { rotate: `${(i - 1) * 5}deg` },
                    { translateY: i * 6 },
                  ],
                },
              ]}
            >
              <View style={styles.previewCardRow}>
                <View style={styles.previewDot} />
                <Text style={styles.previewTitle}>{title}</Text>
              </View>
              <Text style={styles.previewMeta}>$120k – $180k · Remote</Text>
              <View style={styles.previewActions}>
                <View style={[styles.previewTag, { backgroundColor: PRIMARY + "22" }]}>
                  <Text style={[styles.previewTagText, { color: PRIMARY }]}>SAVE ›</Text>
                </View>
              </View>
            </View>
          ))}
        </Animated.View>

        {/* Headline + sub */}
        <Animated.View entering={FadeInUp.duration(500).delay(300)} style={styles.headlineBlock}>
          <Text style={styles.headline}>Find your next job{"\n"}in minutes</Text>
          <Text style={styles.subtext}>Swipe. Match. Apply. Get hired faster.</Text>
        </Animated.View>

        {/* CTA buttons */}
        <Animated.View entering={FadeInUp.duration(500).delay(400)} style={styles.btnGroup}>
          <Pressable style={styles.primaryBtn} onPress={onStart}>
            <LinearGradient
              colors={[PRIMARY, "#FF2D55"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtnGradient}
            >
              <Text style={styles.primaryBtnText}>Start Swiping</Text>
              <Feather name="arrow-right" size={18} color={WHITE} />
            </LinearGradient>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={onSignUp}>
            <Text style={styles.secondaryBtnText}>Create Profile</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

// ─── Slide 2: How it works ───────────────────────────────────────────────────
type FeatureIcon = React.ComponentProps<typeof Feather>["name"];
const FEATURES: { icon: FeatureIcon; title: string; desc: string; color: string }[] = [
  {
    icon: "layers",
    title: "Swipe jobs in seconds",
    desc: "Browse thousands of real jobs tailored to your skills. Right to save, left to skip.",
    color: PRIMARY,
  },
  {
    icon: "user-check",
    title: "Build your professional profile",
    desc: "Upload your resume, showcase your skills, and let employers find you.",
    color: "#8B5CF6",
  },
  {
    icon: "zap",
    title: "Apply instantly with Easy Apply",
    desc: "One-tap applications powered by AI that prepares your cover letter automatically.",
    color: "#10B981",
  },
];

function HowItWorksSlide() {
  return (
    <View style={styles.slide}>
      <View style={styles.slideInner}>
        <Animated.View entering={FadeInDown.duration(500).delay(100)}>
          <Text style={styles.slideLabel}>HOW IT WORKS</Text>
          <Text style={styles.slideTitle}>Three steps to your{"\n"}dream job</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(600).delay(200)} style={styles.featureList}>
          {FEATURES.map((f, i) => (
            <View key={f.title} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: f.color + "1A" }]}>
                <Feather name={f.icon} size={22} color={f.color} />
              </View>
              <View style={styles.featureText}>
                <View style={styles.featureTitleRow}>
                  <View style={[styles.stepBadge, { backgroundColor: f.color + "22" }]}>
                    <Text style={[styles.stepNum, { color: f.color }]}>{i + 1}</Text>
                  </View>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                </View>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </Animated.View>

        {/* Decorative stats */}
        <Animated.View entering={FadeInUp.duration(500).delay(300)} style={styles.statsRow}>
          {[
            { value: "50k+", label: "Live Jobs" },
            { value: "1 min", label: "Avg. Apply Time" },
            { value: "95%", label: "User Satisfaction" },
          ].map((s) => (
            <View key={s.label} style={styles.statItem}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </Animated.View>
      </View>
    </View>
  );
}

// ─── Slide 3: AI Companion ───────────────────────────────────────────────────
const AI_BULLETS = [
  { icon: "file-text" as FeatureIcon, text: "Resume improvement & feedback" },
  { icon: "edit-3" as FeatureIcon, text: "Cover letter generation" },
  { icon: "message-circle" as FeatureIcon, text: "Interview preparation" },
  { icon: "briefcase" as FeatureIcon, text: "Thousands of real jobs, updated daily" },
];

function AICompanionSlide({ onStart }: { onStart: () => void }) {
  return (
    <View style={styles.slide}>
      <View style={styles.slideInner}>
        {/* AI icon */}
        <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.aiIconWrap}>
          <LinearGradient
            colors={["#7C3AED", "#4F46E5"]}
            style={styles.aiIconGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Feather name="cpu" size={38} color={WHITE} />
          </LinearGradient>
          <View style={[styles.aiPulse, { borderColor: "#7C3AED40" }]} />
          <View style={[styles.aiPulse2, { borderColor: "#4F46E530" }]} />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(500).delay(200)}>
          <Text style={styles.slideLabel}>AI-POWERED</Text>
          <Text style={styles.slideTitle}>Your AI career{"\n"}companion</Text>
          <Text style={styles.slideSubtext}>
            SwipeJobs reads your resume and helps you stand out at every step of the job hunt.
          </Text>
        </Animated.View>

        {/* Bullets */}
        <Animated.View entering={FadeInDown.duration(600).delay(300)} style={styles.bulletList}>
          {AI_BULLETS.map((b, i) => (
            <Animated.View
              key={b.text}
              entering={FadeInDown.duration(400).delay(320 + i * 60)}
              style={[styles.bulletRow, { borderColor: BORDER }]}
            >
              <View style={[styles.bulletIcon, { backgroundColor: PRIMARY + "18" }]}>
                <Feather name={b.icon} size={16} color={PRIMARY} />
              </View>
              <Text style={styles.bulletText}>{b.text}</Text>
              <Feather name="check" size={15} color="#22C55E" />
            </Animated.View>
          ))}
        </Animated.View>

        {/* Final CTA */}
        <Animated.View entering={FadeInUp.duration(500).delay(600)} style={styles.finalCta}>
          <Pressable style={styles.primaryBtn} onPress={onStart}>
            <LinearGradient
              colors={[PRIMARY, "#FF2D55"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryBtnGradient}
            >
              <Text style={styles.primaryBtnText}>Start exploring jobs</Text>
              <Feather name="arrow-right" size={18} color={WHITE} />
            </LinearGradient>
          </Pressable>
          <Text style={styles.fineprint}>No account required · Free to browse</Text>
        </Animated.View>
      </View>
    </View>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function IndexScreen() {
  const { isLoaded } = useAuth();
  const [checked, setChecked] = useState(false);
  const [showCarousel, setShowCarousel] = useState(false);
  const [page, setPage] = useState(0);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val === "true") {
        router.replace("/(home)/(tabs)");
      } else {
        setShowCarousel(true);
      }
      setChecked(true);
    });
  }, []);

  const markSeenAndGo = useCallback(async (dest: "/(home)/(tabs)" | "/(auth)/sign-up") => {
    await AsyncStorage.setItem(STORAGE_KEY, "true");
    router.replace(dest);
  }, []);

  const handleStart = useCallback(() => markSeenAndGo("/(home)/(tabs)"), [markSeenAndGo]);
  const handleSignUp = useCallback(() => markSeenAndGo("/(auth)/sign-up"), [markSeenAndGo]);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems[0]?.index != null) {
        setPage(viewableItems[0].index);
      }
    },
    []
  );

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  if (!checked || !isLoaded) return null;
  if (!showCarousel) return null;

  const renderSlide = ({ item }: { item: SlideId }) => {
    if (item === "hero") return <HeroSlide onStart={handleStart} onSignUp={handleSignUp} />;
    if (item === "howItWorks") return <HowItWorksSlide />;
    return <AICompanionSlide onStart={handleStart} />;
  };

  return (
    <LinearGradient colors={[BG_TOP, BG_MID, BG_BOT]} style={styles.root}>
      <SafeAreaView style={styles.safeArea}>
        {/* Carousel */}
        <FlatList
          ref={flatRef}
          data={SLIDES}
          renderItem={renderSlide}
          keyExtractor={(item) => item}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          bounces={false}
          decelerationRate="fast"
          style={styles.flatList}
        />

        {/* Bottom bar: dots + skip */}
        <View style={styles.bottomBar}>
          <View style={styles.dotsRow}>
            {SLIDES.map((_, i) => (
              <Dot key={i} active={i === page} />
            ))}
          </View>

          {page < SLIDES.length - 1 && (
            <Pressable
              style={styles.skipBtn}
              onPress={() => {
                const next = page + 1;
                flatRef.current?.scrollToIndex({ index: next, animated: true });
                setPage(next);
              }}
              hitSlop={12}
            >
              <Text style={styles.skipText}>Next</Text>
              <Feather name="chevron-right" size={16} color={MUTED} />
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  flatList: { flex: 1 },

  // Slide scaffold
  slide: { width: SCREEN_W, flex: 1 },
  slideInner: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 8,
    justifyContent: "space-evenly",
  },

  // ── Slide 1 ──
  logoWrap: { alignItems: "center", gap: 12 },
  logoGradient: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  appName: {
    fontSize: 28,
    fontWeight: "800",
    color: WHITE,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.8,
  },
  cardsWrap: {
    height: SCREEN_H * 0.22,
    alignItems: "center",
    justifyContent: "center",
  },
  previewCard: {
    position: "absolute",
    width: SCREEN_W * 0.72,
    backgroundColor: CARD_BG,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 18,
    gap: 6,
  },
  previewCardRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  previewDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: PRIMARY },
  previewTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: WHITE,
    fontFamily: "Inter_700Bold",
  },
  previewMeta: { fontSize: 13, color: MUTED, fontFamily: "Inter_400Regular" },
  previewActions: { flexDirection: "row", marginTop: 4 },
  previewTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  previewTagText: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold" },
  headlineBlock: { alignItems: "center", gap: 10 },
  headline: {
    fontSize: 32,
    fontWeight: "800",
    color: WHITE,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    letterSpacing: -0.8,
    lineHeight: 40,
  },
  subtext: {
    fontSize: 16,
    color: MUTED,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 23,
  },
  btnGroup: { gap: 12 },
  primaryBtn: { borderRadius: 16, overflow: "hidden" },
  primaryBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 17,
    borderRadius: 16,
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: "800",
    color: WHITE,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
  },
  secondaryBtn: {
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    alignItems: "center",
  },
  secondaryBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: WHITE,
    fontFamily: "Inter_600SemiBold",
  },

  // ── Slide 2 ──
  slideLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: PRIMARY,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  slideTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: WHITE,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.7,
    lineHeight: 38,
  },
  slideSubtext: {
    fontSize: 15,
    color: MUTED,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    marginTop: 10,
  },
  featureList: { gap: 16 },
  featureRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "flex-start",
    padding: 14,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  featureIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  featureText: { flex: 1, gap: 4 },
  featureTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  stepBadge: {
    width: 20,
    height: 20,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNum: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold" },
  featureTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: WHITE,
    fontFamily: "Inter_700Bold",
    flexShrink: 1,
  },
  featureDesc: {
    fontSize: 13,
    color: MUTED,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
    backgroundColor: CARD_BG,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  statItem: { alignItems: "center", gap: 4 },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: PRIMARY,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.4,
  },
  statLabel: { fontSize: 11, color: MUTED, fontFamily: "Inter_400Regular" },

  // ── Slide 3 ──
  aiIconWrap: { alignItems: "center", justifyContent: "center", height: 100 },
  aiIconGradient: {
    width: 78,
    height: 78,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  aiPulse: {
    position: "absolute",
    width: 98,
    height: 98,
    borderRadius: 30,
    borderWidth: 1.5,
  },
  aiPulse2: {
    position: "absolute",
    width: 118,
    height: 118,
    borderRadius: 36,
    borderWidth: 1,
  },
  bulletList: { gap: 10 },
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    borderWidth: 1,
  },
  bulletIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: WHITE,
    fontFamily: "Inter_600SemiBold",
  },
  finalCta: { gap: 12 },
  fineprint: {
    fontSize: 12,
    color: MUTED,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },

  // ── Bottom bar ──
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 28,
    paddingVertical: 16,
  },
  dotsRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { height: 6, borderRadius: 3 },
  skipBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  skipText: { fontSize: 14, color: MUTED, fontFamily: "Inter_400Regular" },
});
