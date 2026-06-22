import {
  fetchDayLog,
  proposeEdit,
  commitEdit,
  DailyLog,
  MealWithId,
  updateMeal,
  analyzeFood,
} from "../../lib/api";
import { Message, CalorieLog } from "../../lib/api";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { isWithinSevenDays } from "../../lib/utils";
import { useTheme, Colors } from "../../lib/ThemeContext";

type Meal = MealWithId;

export default function DayDetailScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const { colors } = useTheme();
  const [log, setLog] = useState<DailyLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [proposed, setProposed] = useState<CalorieLog | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  const canEdit = isWithinSevenDays(date);

  useEffect(() => {
    loadLog();
  }, [date]);

  async function loadLog() {
    setLoading(true);
    setLog(null);
    setNotFound(false);
    setMessages([]);
    setProposed(null);
    try {
      const data = await fetchDayLog(date);
      setLog(data);
      setNotFound(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      if (message === "No log found for this date" || message.includes("404")) {
        setNotFound(true);
      } else {
        Alert.alert("Error", message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handlePropose() {
    if (!input.trim() || chatLoading) return;
    const text = input.trim();
    setInput("");
    setChatLoading(true);

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(newMessages);

    try {
      let result: CalorieLog;
      if (notFound) {
        result = await analyzeFood(newMessages, date);
        setNotFound(false);
        await loadLog();
      } else {
        result = await proposeEdit(date, newMessages);
        setProposed(result);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      if (message === "RATE_LIMIT_EXCEEDED") {
        Alert.alert(
          "Daily limit reached",
          "You've used all 10 of your free analyses for today. Create an account and upgrade to get unlimited logging. 🥩",
        );
      } else if (message === "DATE_OUT_OF_RANGE") {
        Alert.alert("Can't edit this day", "You can only log food for the past 7 days.");
      } else {
        Alert.alert("Error", message);
      }
    } finally {
      setChatLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }

  async function handleConfirm() {
    if (!proposed) return;
    try {
      await commitEdit(date, proposed);
      setProposed(null);
      setMessages([]);
      await loadLog();
      Alert.alert("Saved!", "Your log has been updated.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      Alert.alert("Error", message);
    }
  }

  function handleCancel() {
    setProposed(null);
  }

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return `${days[d.getUTCDay()]} ${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
  }

  const s = makeStyles(colors);

  if (loading) {
    return (
      <View style={[s.centered, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.textMuted} />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: colors.bg }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={s.content}
        >
          <TouchableOpacity
            style={s.backBtn}
            onPress={() => router.replace("/dashboard")}
          >
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>

          <Text style={s.dateTitle}>{formatDate(date)}</Text>

          {!canEdit && (
            <View style={s.readOnlyBanner}>
              <Text style={s.readOnlyText}>
                📅 This log is older than 7 days and can't be edited
              </Text>
            </View>
          )}

          {notFound && canEdit && (
            <View style={s.emptyDay}>
              <Text style={s.emptyDayText}>No log for this day yet.</Text>
              <Text style={s.emptyDaySubtext}>
                Use the chat below to add what you ate.
              </Text>
            </View>
          )}

          {log && (
            <>
              <View style={s.totalsRow}>
                <TotalCell label="Calories" value={`${log.cal_low}–${log.cal_high}`} color={colors.calText} colors={colors} />
                <TotalCell label="Protein" value={`${log.protein_g}g`} color={colors.proteinText} colors={colors} />
                <TotalCell label="Carbs" value={`${log.carbs_g}g`} color={colors.carbsText} colors={colors} />
                <TotalCell label="Fat" value={`${log.fat_g}g`} color={colors.fatText} colors={colors} />
                <TotalCell label="Fiber" value={`${log.fiber_g}g`} color={colors.fiberText} colors={colors} />
              </View>

              <Text style={s.sectionLabel}>CURRENT MEALS</Text>
              {log.meals.map((meal, i) => (
                <MealCard
                  key={i}
                  meal={meal}
                  colors={colors}
                  onSave={async updates => {
                    await updateMeal(date, meal.id, updates);
                    await loadLog();
                  }}
                />
              ))}
            </>
          )}

          {proposed && (
            <>
              <Text style={s.sectionLabel}>PROPOSED CHANGES</Text>
              <View style={s.proposedCard}>
                <Text style={s.proposedIntro}>{proposed.intro}</Text>

                {proposed.meals.map((meal, i) => (
                  <View key={i} style={s.proposedMeal}>
                    <Text style={s.proposedMealName}>{meal.meal}</Text>
                    <Text style={s.proposedMealItems}>{meal.items.join(", ")}</Text>
                    <View style={s.pillRow}>
                      <View style={[s.pill, { backgroundColor: colors.calBg }]}>
                        <Text style={[s.pillText, { color: colors.calText }]}>🔥 {meal.cal_low}–{meal.cal_high} kcal</Text>
                      </View>
                      <View style={[s.pill, { backgroundColor: colors.proteinBg }]}>
                        <Text style={[s.pillText, { color: colors.proteinText }]}>P {meal.protein_g}g</Text>
                      </View>
                      <View style={[s.pill, { backgroundColor: colors.carbsBg }]}>
                        <Text style={[s.pillText, { color: colors.carbsText }]}>C {meal.carbs_g}g</Text>
                      </View>
                      <View style={[s.pill, { backgroundColor: colors.fatBg }]}>
                        <Text style={[s.pillText, { color: colors.fatText }]}>F {meal.fat_g}g</Text>
                      </View>
                      <View style={[s.pill, { backgroundColor: colors.fiberBg }]}>
                        <Text style={[s.pillText, { color: colors.fiberText }]}>Fi {meal.fiber_g}g</Text>
                      </View>
                    </View>
                    {meal.assumption && (
                      <Text style={s.assumption}>Assumed: {meal.assumption}</Text>
                    )}
                  </View>
                ))}

                <View style={s.proposedTotals}>
                  <Text style={s.proposedTotalsLabel}>New day total:</Text>
                  <Text style={s.proposedTotalsValue}>
                    {proposed.totals.cal_low}–{proposed.totals.cal_high} kcal ·
                    P{proposed.totals.protein_g}g · C{proposed.totals.carbs_g}g
                    · F{proposed.totals.fat_g}g · Fi{proposed.totals.fiber_g}g
                  </Text>
                </View>

                {proposed.closing && (
                  <Text style={s.proposedClosing}>{proposed.closing}</Text>
                )}

                <View style={s.confirmRow}>
                  <TouchableOpacity style={s.cancelBtn} onPress={handleCancel}>
                    <Text style={s.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.confirmBtn} onPress={handleConfirm}>
                    <Text style={s.confirmBtnText}>Confirm & Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          )}

          {messages.length > 0 && (
            <>
              <Text style={s.sectionLabel}>EDIT HISTORY</Text>
              {messages.map((m, i) => (
                <View
                  key={i}
                  style={m.role === "user" ? s.userBubble : s.assistantBubble}
                >
                  <Text style={m.role === "user" ? s.userText : s.assistantText}>
                    {m.content}
                  </Text>
                </View>
              ))}
            </>
          )}

          {chatLoading && (
            <View style={s.assistantBubble}>
              <ActivityIndicator size="small" color={colors.textMuted} />
            </View>
          )}
        </ScrollView>

        {canEdit && (
          <View style={s.inputArea}>
            <Text style={s.inputHint}>
              Tell Claude what to change — "add ramen for lunch", "remove the
              croissant", etc.
            </Text>
            <View style={s.inputRow}>
              <TextInput
                style={s.textInput}
                placeholder="Edit this day's log..."
                placeholderTextColor={colors.textMuted}
                multiline
                value={input}
                onChangeText={setInput}
              />
              <TouchableOpacity
                style={[
                  s.sendBtn,
                  (!input.trim() || chatLoading) && s.sendBtnDisabled,
                ]}
                onPress={handlePropose}
                disabled={!input.trim() || chatLoading}
              >
                <Text style={s.sendBtnText}>Go</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MealCard({
  meal,
  colors,
  editable = true,
  onSave,
}: {
  meal: Meal;
  colors: Colors;
  editable?: boolean;
  onSave: (updates: Partial<Meal>) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [calLow, setCalLow] = useState(String(meal.cal_low));
  const [calHigh, setCalHigh] = useState(String(meal.cal_high));
  const [protein, setProtein] = useState(String(meal.protein_g));
  const [carbs, setCarbs] = useState(String(meal.carbs_g));
  const [fat, setFat] = useState(String(meal.fat_g));
  const [fiber, setFiber] = useState(String(meal.fiber_g));
  const [items, setItems] = useState(meal.items.join(", "));
  const [showAssumption, setShowAssumption] = useState(false);
  const s = makeStyles(colors);

  async function handleSave() {
    setSaving(true);
    await onSave({
      items: items.split(",").map(s => s.trim()).filter(Boolean),
      cal_low: parseInt(calLow),
      cal_high: parseInt(calHigh),
      protein_g: parseInt(protein),
      carbs_g: parseInt(carbs),
      fat_g: parseInt(fat),
      fiber_g: parseInt(fiber),
    });
    setSaving(false);
    setEditing(false);
  }

  return (
    <View style={s.mealCard}>
      <View style={s.mealHeader}>
        <Text style={s.mealName}>{meal.meal}</Text>
        {editable && (
          <TouchableOpacity onPress={() => setEditing(!editing)}>
            <Text style={s.editText}>{editing ? "Cancel" : "Edit"}</Text>
          </TouchableOpacity>
        )}
      </View>

      {editing ? (
        <View style={s.editForm}>
          <Text style={s.editLabel}>Items (comma separated)</Text>
          <TextInput
            style={s.editInput}
            value={items}
            onChangeText={setItems}
            multiline
            placeholderTextColor={colors.textMuted}
          />
          <View style={s.editRow}>
            <View style={s.editField}>
              <Text style={s.editLabel}>Cal Low</Text>
              <TextInput style={s.editInputSmall} value={calLow} onChangeText={setCalLow} keyboardType="numeric" placeholderTextColor={colors.textMuted} />
            </View>
            <View style={s.editField}>
              <Text style={s.editLabel}>Cal High</Text>
              <TextInput style={s.editInputSmall} value={calHigh} onChangeText={setCalHigh} keyboardType="numeric" placeholderTextColor={colors.textMuted} />
            </View>
          </View>
          <View style={s.editRow}>
            <View style={s.editField}>
              <Text style={s.editLabel}>Protein (g)</Text>
              <TextInput style={s.editInputSmall} value={protein} onChangeText={setProtein} keyboardType="numeric" placeholderTextColor={colors.textMuted} />
            </View>
            <View style={s.editField}>
              <Text style={s.editLabel}>Carbs (g)</Text>
              <TextInput style={s.editInputSmall} value={carbs} onChangeText={setCarbs} keyboardType="numeric" placeholderTextColor={colors.textMuted} />
            </View>
            <View style={s.editField}>
              <Text style={s.editLabel}>Fat (g)</Text>
              <TextInput style={s.editInputSmall} value={fat} onChangeText={setFat} keyboardType="numeric" placeholderTextColor={colors.textMuted} />
            </View>
            <View style={s.editField}>
              <Text style={s.editLabel}>Fiber (g)</Text>
              <TextInput style={s.editInputSmall} value={fiber} onChangeText={setFiber} keyboardType="numeric" placeholderTextColor={colors.textMuted} />
            </View>
          </View>
          <TouchableOpacity
            style={[s.saveBtn, saving && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={s.saveBtnText}>{saving ? "Saving..." : "Save Changes"}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <Text style={s.mealItems}>{meal.items.join(", ")}</Text>
          <View style={s.pillRow}>
            <View style={[s.pill, { backgroundColor: colors.calBg }]}>
              <Text style={[s.pillText, { color: colors.calText }]}>🔥 {meal.cal_low}–{meal.cal_high} kcal</Text>
            </View>
            <View style={[s.pill, { backgroundColor: colors.proteinBg }]}>
              <Text style={[s.pillText, { color: colors.proteinText }]}>P {meal.protein_g}g</Text>
            </View>
            <View style={[s.pill, { backgroundColor: colors.carbsBg }]}>
              <Text style={[s.pillText, { color: colors.carbsText }]}>C {meal.carbs_g}g</Text>
            </View>
            <View style={[s.pill, { backgroundColor: colors.fatBg }]}>
              <Text style={[s.pillText, { color: colors.fatText }]}>F {meal.fat_g}g</Text>
            </View>
            <View style={[s.pill, { backgroundColor: colors.fiberBg }]}>
              <Text style={[s.pillText, { color: colors.fiberText }]}>Fi {meal.fiber_g}g</Text>
            </View>
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
        </>
      )}
    </View>
  );
}

function TotalCell({
  label, value, color, colors,
}: {
  label: string; value: string; color: string; colors: Colors;
}) {
  const s = makeStyles(colors);
  return (
    <View style={s.totalCell}>
      <Text style={s.totalLabel}>{label}</Text>
      <Text style={[s.totalValue, { color }]}>{value}</Text>
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    content: { padding: 16, gap: 12, paddingBottom: 24 },
    centered: { flex: 1, alignItems: "center", justifyContent: "center" },

    backBtn: { marginBottom: 4 },
    backText: { fontSize: 14, color: colors.carbsText },
    dateTitle: { fontSize: 26, fontWeight: "700", color: colors.textPrimary, letterSpacing: -0.3 },

    totalsRow: { flexDirection: "row", gap: 8 },
    totalCell: {
      flex: 1,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 12,
      padding: 10,
      borderWidth: 0.5,
      borderColor: colors.border,
    },
    totalLabel: { fontSize: 10, color: colors.textMuted, marginBottom: 2 },
    totalValue: { fontSize: 15, fontWeight: "600" },

    sectionLabel: {
      fontSize: 11,
      fontWeight: "600",
      letterSpacing: 0.8,
      color: colors.textMuted,
    },

    mealCard: {
      backgroundColor: colors.surface,
      borderWidth: 0.5,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 14,
      gap: 8,
    },
    mealHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    mealName: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
    editText: { fontSize: 13, color: colors.carbsText, fontWeight: "500" },
    mealItems: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },

    proposedCard: {
      backgroundColor: colors.carbsBg,
      borderWidth: 0.5,
      borderColor: `${colors.carbsText}44`,
      borderRadius: 14,
      padding: 14,
      gap: 10,
    },
    proposedIntro: { fontSize: 14, color: colors.textPrimary, lineHeight: 22 },
    proposedMeal: {
      gap: 6,
      paddingBottom: 10,
      borderBottomWidth: 0.5,
      borderBottomColor: `${colors.carbsText}33`,
    },
    proposedMealName: { fontSize: 14, fontWeight: "600", color: colors.textPrimary },
    proposedMealItems: { fontSize: 13, color: colors.textSecondary },
    proposedTotals: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 10,
      gap: 4,
    },
    proposedTotalsLabel: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
    proposedTotalsValue: { fontSize: 13, color: colors.textPrimary, fontWeight: "500" },
    proposedClosing: { fontSize: 13, color: colors.textSecondary, fontStyle: "italic" },

    confirmRow: { flexDirection: "row", gap: 8, marginTop: 4 },
    cancelBtn: {
      flex: 1,
      padding: 10,
      borderRadius: 10,
      borderWidth: 0.5,
      borderColor: colors.borderStrong,
      alignItems: "center",
      backgroundColor: colors.surface,
    },
    cancelBtnText: { fontSize: 14, color: colors.textSecondary, fontWeight: "500" },
    confirmBtn: {
      flex: 1,
      padding: 10,
      borderRadius: 10,
      backgroundColor: colors.primary,
      alignItems: "center",
    },
    confirmBtnText: { fontSize: 14, color: colors.primaryText, fontWeight: "600" },

    userBubble: {
      backgroundColor: colors.userBubbleBg,
      borderRadius: 14,
      borderBottomRightRadius: 4,
      padding: 10,
      alignSelf: "flex-end",
      maxWidth: "85%",
    },
    userText: { fontSize: 13, color: colors.textPrimary },
    assistantBubble: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 14,
      borderBottomLeftRadius: 4,
      padding: 10,
      alignSelf: "flex-start",
      maxWidth: "85%",
      borderWidth: 0.5,
      borderColor: colors.border,
    },
    assistantText: { fontSize: 13, color: colors.textPrimary },

    pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99 },
    pillText: { fontSize: 12, fontWeight: "500" },
    assumption: { fontSize: 12, color: colors.textMuted, fontStyle: "italic" },
    assumptionToggle: { fontSize: 12, color: colors.carbsText, marginTop: 6 },

    inputArea: {
      borderTopWidth: 0.5,
      borderColor: colors.border,
      padding: 14,
      gap: 8,
      backgroundColor: colors.surface,
    },
    inputHint: { fontSize: 12, color: colors.textMuted },
    inputRow: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
    textInput: {
      flex: 1,
      borderWidth: 0.5,
      borderColor: colors.inputBorder,
      borderRadius: 12,
      padding: 10,
      fontSize: 14,
      minHeight: 44,
      maxHeight: 100,
      color: colors.textPrimary,
      textAlignVertical: "top",
      backgroundColor: colors.inputBg,
    },
    sendBtn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    sendBtnDisabled: { opacity: 0.35 },
    sendBtnText: { color: colors.primaryText, fontWeight: "600", fontSize: 14 },

    editForm: { gap: 10, marginTop: 8 },
    editLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 4, fontWeight: "500" },
    editInput: {
      borderWidth: 0.5,
      borderColor: colors.inputBorder,
      borderRadius: 10,
      padding: 10,
      fontSize: 14,
      color: colors.textPrimary,
      minHeight: 60,
      textAlignVertical: "top",
      backgroundColor: colors.inputBg,
    },
    editInputSmall: {
      borderWidth: 0.5,
      borderColor: colors.inputBorder,
      borderRadius: 10,
      padding: 8,
      fontSize: 14,
      color: colors.textPrimary,
      backgroundColor: colors.inputBg,
    },
    editRow: { flexDirection: "row", gap: 8 },
    editField: { flex: 1 },
    saveBtn: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      padding: 10,
      alignItems: "center",
      marginTop: 4,
    },
    saveBtnText: { color: colors.primaryText, fontSize: 14, fontWeight: "600" },

    readOnlyBanner: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 10,
      padding: 12,
      borderLeftWidth: 3,
      borderLeftColor: colors.textMuted,
      borderWidth: 0.5,
      borderColor: colors.border,
    },
    readOnlyText: { fontSize: 13, color: colors.textSecondary },
    emptyDay: { alignItems: "center", paddingVertical: 32, gap: 8 },
    emptyDayText: { fontSize: 16, fontWeight: "500", color: colors.textPrimary },
    emptyDaySubtext: { fontSize: 13, color: colors.textSecondary },
  });
}
