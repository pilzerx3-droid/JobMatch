import { useAuth } from "@clerk/expo";
import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const BASE_URL = process.env.EXPO_PUBLIC_DOMAIN ?? "";

interface ConversationSummary {
  id: number;
  title: string;
  createdAt: string;
}

interface Message {
  id: number;
  conversationId: number;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface ConversationDetail extends ConversationSummary {
  messages: Message[];
}

const QUICK_ACTIONS = [
  { label: "Improve my resume", prompt: "Help me improve my resume. I'll share my current experience and you can suggest improvements.", icon: "file-text" },
  { label: "Write a cover letter", prompt: "Help me write a compelling cover letter for a job I'm applying to.", icon: "edit-3" },
  { label: "Interview prep", prompt: "Help me prepare for an upcoming job interview. Let's practice common questions.", icon: "mic" },
  { label: "Salary negotiation", prompt: "I've received a job offer. Help me negotiate a better salary.", icon: "dollar-sign" },
];

export default function AssistantScreen() {
  const colors = useColors();
  const { getToken } = useAuth();

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConv, setActiveConv] = useState<ConversationDetail | null>(null);
  const [inputText, setInputText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingConvs, setIsLoadingConvs] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const abortRef = useRef<AbortController | null>(null);

  const authFetch = useCallback(
    async (path: string, options?: RequestInit) => {
      const token = await getToken();
      return fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(options?.headers ?? {}),
        },
      });
    },
    [getToken]
  );

  const loadConversations = useCallback(async () => {
    try {
      setIsLoadingConvs(true);
      const res = await authFetch("/api/anthropic/conversations");
      if (res.ok) {
        const data = (await res.json()) as ConversationSummary[];
        setConversations(data);
      }
    } catch {
      // silent
    } finally {
      setIsLoadingConvs(false);
    }
  }, [authFetch]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const createConversation = useCallback(
    async (title: string, firstPrompt?: string) => {
      const res = await authFetch("/api/anthropic/conversations", {
        method: "POST",
        body: JSON.stringify({ title }),
      });
      if (!res.ok) return;
      const conv = (await res.json()) as ConversationSummary;
      const detail: ConversationDetail = { ...conv, messages: [] };
      setConversations((prev) => [conv, ...prev]);
      setActiveConv(detail);
      if (firstPrompt) {
        sendMessage(detail, firstPrompt);
      }
    },
    [authFetch]
  );

  const openConversation = useCallback(
    async (conv: ConversationSummary) => {
      setIsLoadingMessages(true);
      setActiveConv({ ...conv, messages: [] });
      try {
        const res = await authFetch(`/api/anthropic/conversations/${conv.id}`);
        if (res.ok) {
          const data = (await res.json()) as ConversationDetail;
          setActiveConv(data);
        }
      } finally {
        setIsLoadingMessages(false);
      }
    },
    [authFetch]
  );

  const deleteConversation = useCallback(
    (conv: ConversationSummary) => {
      Alert.alert("Delete conversation?", `"${conv.title}" will be permanently deleted.`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await authFetch(`/api/anthropic/conversations/${conv.id}`, { method: "DELETE" });
            setConversations((prev) => prev.filter((c) => c.id !== conv.id));
            if (activeConv?.id === conv.id) setActiveConv(null);
          },
        },
      ]);
    },
    [authFetch, activeConv]
  );

  const sendMessage = useCallback(
    async (conv: ConversationDetail, text: string) => {
      if (!text.trim() || isStreaming) return;

      const userMsg: Message = {
        id: Date.now(),
        conversationId: conv.id,
        role: "user",
        content: text.trim(),
        createdAt: new Date().toISOString(),
      };
      const assistantMsg: Message = {
        id: Date.now() + 1,
        conversationId: conv.id,
        role: "assistant",
        content: "",
        createdAt: new Date().toISOString(),
      };

      setActiveConv((prev) =>
        prev ? { ...prev, messages: [...prev.messages, userMsg, assistantMsg] } : prev
      );
      setInputText("");
      setIsStreaming(true);

      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const token = await getToken();
        const response = await fetch(
          `${BASE_URL}/api/anthropic/conversations/${conv.id}/messages`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
              Accept: "text/event-stream",
            },
            body: JSON.stringify({ content: text.trim() }),
            signal: controller.signal,
          }
        );

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader");

        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6)) as { content?: string; done?: boolean; error?: string };
              if (data.done) break;
              if (data.content) {
                fullText += data.content;
                setActiveConv((prev) => {
                  if (!prev) return prev;
                  const msgs = [...prev.messages];
                  msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content: fullText };
                  return { ...prev, messages: msgs };
                });
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          setActiveConv((prev) => {
            if (!prev) return prev;
            const msgs = [...prev.messages];
            msgs[msgs.length - 1] = {
              ...msgs[msgs.length - 1],
              content: "Something went wrong. Please try again.",
            };
            return { ...prev, messages: msgs };
          });
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [isStreaming, getToken]
  );

  const handleSend = () => {
    if (!inputText.trim() || !activeConv) return;
    sendMessage(activeConv, inputText);
  };

  const handleQuickAction = (action: (typeof QUICK_ACTIONS)[0]) => {
    createConversation(action.label, action.prompt);
  };

  // ─── Conversation List ─────────────────────────────────────────────────────
  if (!activeConv) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.foreground }]}>AI Career Coach</Text>
            <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
              Powered by Claude
            </Text>
          </View>
          <Pressable
            style={[styles.newChatBtn, { backgroundColor: colors.primary }]}
            onPress={() => createConversation("New Conversation")}
          >
            <Feather name="plus" size={18} color="#FFFFFF" />
            <Text style={styles.newChatText}>New Chat</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>QUICK START</Text>
          <View style={styles.quickGrid}>
            {QUICK_ACTIONS.map((action) => (
              <Pressable
                key={action.label}
                style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => handleQuickAction(action)}
              >
                <View style={[styles.quickIcon, { backgroundColor: colors.primary + "20" }]}>
                  <Feather name={action.icon as any} size={18} color={colors.primary} />
                </View>
                <Text style={[styles.quickLabel, { color: colors.foreground }]}>{action.label}</Text>
              </Pressable>
            ))}
          </View>

          {isLoadingConvs ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
          ) : conversations.length > 0 ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground, marginTop: 24 }]}>
                RECENT CHATS
              </Text>
              {conversations.map((conv) => (
                <Pressable
                  key={conv.id}
                  style={[styles.convRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => openConversation(conv)}
                >
                  <View style={[styles.convIcon, { backgroundColor: colors.secondary }]}>
                    <Feather name="message-circle" size={16} color={colors.mutedForeground} />
                  </View>
                  <Text style={[styles.convTitle, { color: colors.foreground }]} numberOfLines={1}>
                    {conv.title}
                  </Text>
                  <Pressable onPress={() => deleteConversation(conv)} hitSlop={8}>
                    <Feather name="trash-2" size={16} color={colors.mutedForeground} />
                  </Pressable>
                </Pressable>
              ))}
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─── Active Conversation ───────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.chatHeader, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => setActiveConv(null)} style={styles.backBtn} hitSlop={8}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.chatTitle, { color: colors.foreground }]} numberOfLines={1}>
          {activeConv.title}
        </Text>
        <Pressable onPress={() => deleteConversation(activeConv)} hitSlop={8}>
          <Feather name="trash-2" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>

      {isLoadingMessages ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={90}
        >
          <FlatList
            ref={flatListRef}
            data={activeConv.messages}
            keyExtractor={(m) => String(m.id)}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.primary + "18" }]}>
                  <Feather name="message-circle" size={32} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  Start the conversation
                </Text>
                <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                  Ask me anything about your career, resume, or interview prep.
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View
                style={[
                  styles.bubble,
                  item.role === "user"
                    ? [styles.userBubble, { backgroundColor: colors.primary }]
                    : [styles.aiBubble, { backgroundColor: colors.card, borderColor: colors.border }],
                ]}
              >
                {item.role === "assistant" && item.content === "" ? (
                  <View style={styles.typingDots}>
                    <ActivityIndicator size="small" color={colors.mutedForeground} />
                  </View>
                ) : (
                  <Text
                    style={[
                      styles.bubbleText,
                      {
                        color: item.role === "user" ? "#FFFFFF" : colors.foreground,
                      },
                    ]}
                  >
                    {item.content}
                  </Text>
                )}
              </View>
            )}
          />

          <View
            style={[
              styles.inputBar,
              { borderTopColor: colors.border, backgroundColor: colors.background },
            ]}
          >
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                  color: colors.foreground,
                },
              ]}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Message your career coach..."
              placeholderTextColor={colors.mutedForeground}
              multiline
              maxLength={2000}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
              editable={!isStreaming}
            />
            <Pressable
              style={[
                styles.sendBtn,
                {
                  backgroundColor:
                    inputText.trim() && !isStreaming ? colors.primary : colors.secondary,
                },
              ]}
              onPress={handleSend}
              disabled={!inputText.trim() || isStreaming}
            >
              {isStreaming ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Feather name="send" size={18} color="#FFFFFF" />
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: { fontSize: 26, fontWeight: "800", fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  newChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
  },
  newChatText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  listContent: { paddingHorizontal: 20, paddingBottom: 120 },
  sectionTitle: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold", letterSpacing: 1, marginBottom: 12 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  quickCard: {
    width: "47%",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  quickIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  quickLabel: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  convRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  convIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  convTitle: { flex: 1, fontSize: 15, fontFamily: "Inter_400Regular" },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  chatTitle: { flex: 1, fontSize: 16, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  messagesList: { padding: 16, paddingBottom: 24, gap: 10 },
  bubble: { maxWidth: "85%", padding: 14, borderRadius: 18 },
  userBubble: { alignSelf: "flex-end", borderBottomRightRadius: 4 },
  aiBubble: { alignSelf: "flex-start", borderWidth: 1, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 22, fontFamily: "Inter_400Regular" },
  typingDots: { paddingVertical: 4, paddingHorizontal: 4 },
  emptyChat: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyIcon: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 18, fontWeight: "700", fontFamily: "Inter_700Bold" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 260, lineHeight: 20 },
  inputBar: {
    flexDirection: "row",
    gap: 10,
    padding: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    maxHeight: 120,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
