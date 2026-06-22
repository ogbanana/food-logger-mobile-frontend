import { useRef, useState, useEffect, useCallback } from "react";
import {
  Animated,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  PanResponder,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useFocusEffect } from "expo-router";

import Drawer from "../components/Drawer";
import Header from "../components/Header";

import { analyzeFood, CalorieLog, Meal, fetchUsage } from "../lib/api";
import { useDrawer } from "../lib/DrawerContext";
import { useTheme, Colors } from "../lib/ThemeContext";

import type { Message, MessageType } from "../lib/api";

const DRAWER_WIDTH = Dimensions.get("window").width * 0.75;

const EXAMPLES = [
  "in the morning a large coffee with a splash of oat milk and a bagel with two tablespoons of cream cheese, for lunch a turkey sandwich with a small handful of chips, and a handful of almonds as an afternoon snack",
  "for breakfast two scrambled eggs with a slice of toast and a banana, a chicken caesar salad with about a cup of croutons for lunch, and a 16 oz protein shake after the gym",
  "this morning a cup of overnight oats with a handful of berries and a latte, a bowl of leftover pad thai for lunch, and two squares of dark chocolate in the evening",
  "skipped breakfast, a burrito bowl with a scoop of extra guac and a small handful of tortilla chips for lunch, and a fillet of grilled salmon with a cup of rice for dinner",
  "for breakfast a cup of greek yogurt with a quarter cup of granola and an apple, a ham and cheese sandwich for lunch, and a handful of trail mix in the afternoon",
  "morning black coffee with two slices of avocado toast topped with a fried egg, a big bowl of ramen for lunch, and a couple of cookies after dinner",
  "a smoothie with one banana and a tablespoon of peanut butter plus a granola bar in the morning, about eight pieces of sushi for lunch, and a bowl of popcorn at night",
  "two pancakes with a drizzle of syrup and three strips of bacon for breakfast, a chicken wrap for lunch, and a plate of pasta with a cup of marinara for dinner",
  "a bowl of oatmeal with a spoonful of honey and a cappuccino in the morning, a poke bowl with a cup of rice for lunch, and a handful of pretzels in the afternoon",
  "an egg and cheese on a roll with a glass of orange juice for breakfast, two slices of pizza with a side salad for lunch, and a bowl of ice cream for dessert",
];

export default function LogScreen() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const scrollRef = useRef<ScrollView>(null);
  const [history, setHistory] = useState<Message[]>([]);
  const router = useRouter();
  const { drawerOpen, setDrawerOpen } = useDrawer();
  const { colors } = useTheme();
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const exampleIndexRef = useRef(Math.floor(Math.random() * EXAMPLES.length));
  const [example, setExample] = useState(EXAMPLES[exampleIndexRef.current]);

  useEffect(() => {
    fetchUsage()
      .then(u => setRemaining(u.remaining))
      .catch(() => {});
  }, []);

  // Show a different example each time the screen comes into focus.
  useFocusEffect(
    useCallback(() => {
      setExample(EXAMPLES[exampleIndexRef.current]);
      exampleIndexRef.current = (exampleIndexRef.current + 1) % EXAMPLES.length;
    }, []),
  );

  function openDrawer() {
    setDrawerMounted(true);
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function closeDrawer() {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 280,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setDrawerMounted(false);
      setDrawerOpen(false);
    });
  }

  useEffect(() => {
    if (drawerOpen) openDrawer();
    else if (drawerMounted) closeDrawer();
  }, [drawerOpen]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.moveX < 30 && gestureState.dx > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dx >= 0 && gestureState.dx <= DRAWER_WIDTH) {
          if (!drawerMounted) setDrawerMounted(true);
          const x = -DRAWER_WIDTH + gestureState.dx;
          slideAnim.setValue(x);
          fadeAnim.setValue(gestureState.dx / DRAWER_WIDTH);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > DRAWER_WIDTH * 0.4) {
          setDrawerOpen(true);
          Animated.parallel([
            Animated.timing(slideAnim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
        } else {
          Animated.parallel([
            Animated.timing(slideAnim, {
              toValue: -DRAWER_WIDTH,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => setDrawerMounted(false));
        }
      },
    }),
  ).current;

  async function analyze() {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput("");
    setLoading(true);
    setMessages(prev => [...prev, { type: "user", text }]);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    const newHistory: Message[] = [...history, { role: "user", content: text }];

    try {
      const data = await analyzeFood(newHistory);

      if (typeof data.remaining === "number") setRemaining(data.remaining);

      setHistory([
        ...newHistory,
        {
          role: "assistant",
          content: `I've logged the following meals: ${data.meals
            .map(
              m =>
                `${m.meal}: ${m.items.join(", ")} (${m.cal_low}-${m.cal_high} kcal)`,
            )
            .join(
              ". ",
            )}. Day total so far: ${data.totals.cal_low}-${data.totals.cal_high} kcal, ${data.totals.protein_g}g protein, ${data.totals.carbs_g}g carbs, ${data.totals.fat_g}g fat, ${data.totals.fiber_g}g fiber.`,
        },
      ]);

      setMessages(prev => [...prev, { type: "result", data }]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";

      if (message === "RATE_LIMIT_EXCEEDED") {
        setMessages(prev => [
          ...prev,
          {
            type: "error",
            text: "You've used all 10 of your free analyses for today. Create an account and upgrade to get unlimited logging. 🥩",
          },
        ]);
      } else {
        setMessages(prev => [...prev, { type: "error", text: message }]);
      }
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  const s = makeStyles(colors);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.surface }}
      edges={["top"]}
    >
      <Header />
      <View style={{ flex: 1 }} {...panResponder.panHandlers}>
        <KeyboardAvoidingView
          style={[s.root, { backgroundColor: colors.bg }]}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={90}
        >
          <ScrollView
            ref={scrollRef}
            style={s.messages}
            contentContainerStyle={s.messagesContent}
          >
            <View style={s.assistantBubble}>
              <Text style={s.assistantText}>
                Hey! Welcome to Food Logger — just dump everything you ate today
                in one go, no format needed.{"\n\n"}
                Something like <Text style={s.italic}>"{example}"</Text> works
                perfectly.
              </Text>
            </View>

            {messages.map((msg, i) => {
              if (msg.type === "user") {
                return (
                  <View key={i} style={s.userBubble}>
                    <Text selectable style={s.userText}>
                      {msg.text}
                    </Text>
                  </View>
                );
              }
              if (msg.type === "error") {
                return (
                  <View key={i} style={s.errorBubble}>
                    <Text selectable style={s.errorText}>
                      {msg.text}
                    </Text>
                  </View>
                );
              }
              if (msg.type === "result" && msg.data) {
                return <ResultCard key={i} data={msg.data} colors={colors} />;
              }
              return null;
            })}

            {loading && (
              <View style={s.assistantBubble}>
                <ActivityIndicator size="small" color={colors.textMuted} />
              </View>
            )}
          </ScrollView>

          {remaining !== null && (
            <Text
              style={{
                fontSize: 12,
                color:
                  remaining === 0
                    ? colors.error
                    : remaining <= 3
                      ? colors.warning
                      : colors.textMuted,
                textAlign: "center",
                paddingVertical: 6,
                backgroundColor: colors.bg,
              }}
            >
              {remaining} / 10 analyses remaining today
            </Text>
          )}

          <View style={s.inputArea}>
            <TextInput
              style={s.textInput}
              placeholder="Tell me everything you ate today..."
              placeholderTextColor={colors.textMuted}
              multiline
              value={input}
              onChangeText={setInput}
            />
            <TouchableOpacity
              style={[
                s.sendBtn,
                (!input.trim() || loading) && s.sendBtnDisabled,
              ]}
              onPress={analyze}
              disabled={!input.trim() || loading}
            >
              <Text style={s.sendBtnText}>Analyze</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>

      {drawerMounted && (
        <Drawer
          visible={drawerMounted}
          onClose={() => setDrawerOpen(false)}
          onSignUp={() => router.push("/signup")}
          onLogin={() => router.push("/login")}
          slideAnim={slideAnim}
          fadeAnim={fadeAnim}
        />
      )}
    </SafeAreaView>
  );
}

function ResultCard({ data, colors }: { data: CalorieLog; colors: Colors }) {
  const s = makeStyles(colors);
  return (
    <View>
      <View style={s.assistantBubble}>
        <Text style={s.assistantText}>{data.intro}</Text>
      </View>

      {data.meals.map((meal, i) => (
        <MealCard key={i} meal={meal} colors={colors} />
      ))}

      <View style={s.card}>
        <Text style={s.cardLabel}>DAY TOTAL</Text>

        <View style={[s.totalHero, { backgroundColor: colors.calBg }]}>
          <Text style={s.totalHeroLabel}>Calories</Text>
          <Text style={[s.totalHeroValue, { color: colors.calText }]}>
            {data.totals.cal_low}–{data.totals.cal_high}
          </Text>
          <Text style={s.totalUnit}>kcal</Text>
        </View>

        <View style={s.macroGrid}>
          <TotalCell
            label="Protein"
            value={`${data.totals.protein_g}g`}
            unit="est."
            bg={colors.proteinBg}
            color={colors.proteinText}
            colors={colors}
          />
          <TotalCell
            label="Carbs"
            value={`${data.totals.carbs_g}g`}
            unit="est."
            bg={colors.carbsBg}
            color={colors.carbsText}
            colors={colors}
          />
          <TotalCell
            label="Fat"
            value={`${data.totals.fat_g}g`}
            unit="est."
            bg={colors.fatBg}
            color={colors.fatText}
            colors={colors}
          />
          <TotalCell
            label="Fiber"
            value={`${data.totals.fiber_g}g`}
            unit="est."
            bg={colors.fiberBg}
            color={colors.fiberText}
            colors={colors}
          />
        </View>
      </View>

      {data.closing && (
        <View style={s.assistantBubble}>
          <Text style={s.assistantText}>{data.closing}</Text>
        </View>
      )}
    </View>
  );
}

function MealCard({ meal, colors }: { meal: Meal; colors: Colors }) {
  const [showAssumption, setShowAssumption] = useState(false);
  const s = makeStyles(colors);
  return (
    <View style={s.card}>
      <Text style={s.cardLabel}>{meal.meal.toUpperCase()}</Text>
      <Text style={s.mealItems}>{meal.items.join(", ")}</Text>
      <View style={s.pillRow}>
        <Pill
          bg={colors.calBg}
          text={colors.calText}
          label={`🔥 ${meal.cal_low}–${meal.cal_high} kcal`}
        />
        <Pill
          bg={colors.proteinBg}
          text={colors.proteinText}
          label={`P ${meal.protein_g}g`}
        />
        <Pill
          bg={colors.carbsBg}
          text={colors.carbsText}
          label={`C ${meal.carbs_g}g`}
        />
        <Pill
          bg={colors.fatBg}
          text={colors.fatText}
          label={`F ${meal.fat_g}g`}
        />
        <Pill
          bg={colors.fiberBg}
          text={colors.fiberText}
          label={`Fi ${meal.fiber_g}g`}
        />
      </View>
      {meal.assumption && (
        <TouchableOpacity onPress={() => setShowAssumption(!showAssumption)}>
          <Text style={s.assumptionToggle}>
            {showAssumption ? "▲ Hide assumptions" : "▼ View assumptions"}
          </Text>
          {showAssumption && (
            <Text style={s.assumption}>{meal.assumption}</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

function TotalCell({
  label,
  value,
  unit,
  bg,
  color,
  colors,
}: {
  label: string;
  value: string;
  unit: string;
  bg: string;
  color: string;
  colors: Colors;
}) {
  const s = makeStyles(colors);
  return (
    <View style={[s.totalCell, { backgroundColor: bg }]}>
      <Text style={s.totalLabel}>{label}</Text>
      <Text style={[s.totalValue, { color }]}>{value}</Text>
      <Text style={s.totalUnit}>{unit}</Text>
    </View>
  );
}

function Pill({
  bg,
  text,
  label,
}: {
  bg: string;
  text: string;
  label: string;
}) {
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 99,
        backgroundColor: bg,
      }}
    >
      <Text style={{ fontSize: 12, fontWeight: "500", color: text }}>
        {label}
      </Text>
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    root: { flex: 1 },
    messages: { flex: 1 },
    messagesContent: { padding: 16, gap: 10 },

    assistantBubble: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 14,
      borderBottomLeftRadius: 4,
      padding: 13,
      alignSelf: "flex-start",
      maxWidth: "92%",
      borderWidth: 0.5,
      borderColor: colors.border,
    },
    assistantText: { fontSize: 14, lineHeight: 22, color: colors.textPrimary },
    italic: { fontStyle: "italic" },

    userBubble: {
      backgroundColor: colors.userBubbleBg,
      borderRadius: 14,
      borderBottomRightRadius: 4,
      padding: 13,
      alignSelf: "flex-end",
      maxWidth: "92%",
    },
    userText: { fontSize: 14, lineHeight: 22, color: colors.textPrimary },

    errorBubble: {
      backgroundColor: colors.errorBg,
      borderRadius: 12,
      padding: 12,
      borderWidth: 0.5,
      borderColor: `${colors.error}44`,
    },
    errorText: { fontSize: 13, color: colors.error, fontFamily: "Courier" },

    card: {
      backgroundColor: colors.surface,
      borderWidth: 0.5,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 14,
      marginTop: 8,
    },
    cardLabel: {
      fontSize: 11,
      fontWeight: "600",
      letterSpacing: 0.8,
      color: colors.textMuted,
      marginBottom: 8,
    },
    mealItems: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 10,
      lineHeight: 20,
    },

    pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },

    assumption: {
      fontSize: 12,
      color: colors.textMuted,
      fontStyle: "italic",
      marginTop: 8,
    },
    assumptionToggle: { fontSize: 12, color: colors.carbsText, marginTop: 6 },

    totalHero: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
    },
    totalHeroLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      marginBottom: 4,
    },
    totalHeroValue: {
      fontSize: 24,
      fontWeight: "600",
      color: colors.textPrimary,
      letterSpacing: -0.5,
    },
    macroGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    totalCell: {
      flexGrow: 1,
      flexBasis: "45%",
      backgroundColor: colors.surfaceAlt,
      borderRadius: 10,
      padding: 10,
    },
    totalLabel: { fontSize: 11, color: colors.textSecondary, marginBottom: 4 },
    totalValue: { fontSize: 16, fontWeight: "500", color: colors.textPrimary },
    totalUnit: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

    inputArea: {
      borderTopWidth: 0.5,
      borderColor: colors.border,
      padding: 14,
      gap: 8,
      backgroundColor: colors.surface,
    },
    textInput: {
      borderWidth: 0.5,
      borderColor: colors.inputBorder,
      borderRadius: 12,
      padding: 12,
      fontSize: 14,
      minHeight: 80,
      color: colors.textPrimary,
      textAlignVertical: "top",
      backgroundColor: colors.inputBg,
    },
    sendBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 13,
      alignItems: "center",
    },
    sendBtnDisabled: { opacity: 0.35 },
    sendBtnText: { color: colors.primaryText, fontWeight: "600", fontSize: 14 },
  });
}
