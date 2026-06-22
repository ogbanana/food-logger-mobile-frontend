import { fetchWeekLogs, DailyLog } from "../lib/api";
import { isWithinSevenDays } from "../lib/utils";
import { useTheme, Colors } from "../lib/ThemeContext";
import { useSettings } from "../lib/SettingsContext";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Header from "../components/Header";

type TimeRange = "today" | "week" | "month";

export default function DashboardScreen() {
  const { colors } = useTheme();
  const { calorieTarget: target } = useSettings();
  const [weekLogs, setWeekLogs] = useState<DailyLog[]>([]);
  const [monthLogs, setMonthLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<TimeRange>("today");
  const [monthOffset, setMonthOffset] = useState(0);
  const [calLoading, setCalLoading] = useState(false);
  const router = useRouter();

  const calDisplayDate = new Date(
    new Date().getFullYear(),
    new Date().getMonth() + monthOffset,
    1,
  );
  const calYear = calDisplayDate.getFullYear();
  const calMonth = calDisplayDate.getMonth();

  function navigateToDay(dateStr: string) {
    const date = dateStr.split("T")[0];
    router.push(`/log/${date}`);
  }

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  async function loadData() {
    setLoading(true);
    try {
      const [week, month] = await Promise.all([
        fetchWeekLogs(7),
        fetchWeekLogs(31),
      ]);
      setWeekLogs(week);
      setMonthLogs(month);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchLogsForMonth(offset: number): Promise<DailyLog[]> {
    if (offset === 0) return fetchWeekLogs(31);
    const today = new Date();
    const target = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const daysBack =
      Math.ceil((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24)) +
      1;
    const all = await fetchWeekLogs(daysBack);
    const y = target.getFullYear();
    const m = target.getMonth();
    return all.filter(l => {
      const d = new Date(l.date);
      return d.getFullYear() === y && d.getMonth() === m;
    });
  }

  async function navigateMonth(delta: number) {
    const next = monthOffset + delta;
    if (next > 0) return;
    setMonthOffset(next);
    setCalLoading(true);
    try {
      setMonthLogs(await fetchLogsForMonth(next));
    } catch (err) {
      console.error(err);
    } finally {
      setCalLoading(false);
    }
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const todayLog = weekLogs.find(l => l.date.startsWith(todayStr));

  const visibleLogs =
    range === "today"
      ? todayLog
        ? [todayLog]
        : []
      : range === "week"
        ? weekLogs
        : monthLogs;

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return `${days[date.getUTCDay()]} ${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
  }

  const avgCals = visibleLogs.length
    ? Math.round(
        visibleLogs.reduce((a, l) => a + (l.cal_low + l.cal_high) / 2, 0) /
          visibleLogs.length,
      )
    : 0;

  const totalProtein = visibleLogs.reduce((a, l) => a + l.protein_g, 0);
  const totalCarbs = visibleLogs.reduce((a, l) => a + l.carbs_g, 0);
  const totalFat = visibleLogs.reduce((a, l) => a + l.fat_g, 0);
  const totalFiber = visibleLogs.reduce((a, l) => a + l.fiber_g, 0);

  const n = visibleLogs.length || 1;
  const avgProtein = Math.round(totalProtein / n);
  const avgCarbs = Math.round(totalCarbs / n);
  const avgFat = Math.round(totalFat / n);
  const avgFiber = Math.round(totalFiber / n);

  const s = makeStyles(colors);

  if (loading) {
    return (
      <View style={[s.centered, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color={colors.textMuted} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.surface }}
      edges={["top"]}
    >
      <Header />
      <ScrollView
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={s.content}
      >
        {/* Range toggle */}
        <View style={s.toggleRow}>
          {(["today", "week", "month"] as TimeRange[]).map(r => (
            <TouchableOpacity
              key={r}
              style={[s.toggleBtn, range === r && s.toggleBtnActive]}
              onPress={() => setRange(r)}
            >
              <Text style={[s.toggleText, range === r && s.toggleTextActive]}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Daily Calorie Target (read-only — edit in drawer) */}
        <View style={s.targetRow}>
          <Text style={s.targetLabel}>Daily Calorie Target</Text>
          <Text style={s.targetValue}>{target} kcal</Text>
        </View>

        {visibleLogs.length === 0 && range !== "month" ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🥗</Text>
            <Text style={s.emptyTitle}>No logs yet</Text>
            <Text style={s.emptySubtitle}>
              Head to the Log tab and dump what you ate.
            </Text>
          </View>
        ) : (
          <>
            {/* Summary cards */}
            {range === "today" ? (
              <>
                <SummaryCard
                  label="Calories"
                  value={
                    todayLog ? `${todayLog.cal_low}–${todayLog.cal_high}` : "0"
                  }
                  unit="kcal today"
                  color={colors.calText}
                  colors={colors}
                  hero
                />
                <View style={s.summaryGrid}>
                  <SummaryCard
                    label="Protein"
                    value={`${totalProtein}g`}
                    unit="today"
                    color={colors.proteinText}
                    colors={colors}
                  />
                  <SummaryCard
                    label="Carbs"
                    value={`${totalCarbs}g`}
                    unit="today"
                    color={colors.carbsText}
                    colors={colors}
                  />
                  <SummaryCard
                    label="Fat"
                    value={`${totalFat}g`}
                    unit="today"
                    color={colors.fatText}
                    colors={colors}
                  />
                  <SummaryCard
                    label="Fiber"
                    value={`${totalFiber}g`}
                    unit="today"
                    color={colors.fiberText}
                    colors={colors}
                  />
                </View>
              </>
            ) : (
              <View style={s.summaryGrid}>
                <SummaryCard
                  label="Avg Calories"
                  value={String(avgCals)}
                  unit="kcal"
                  color={colors.calText}
                  colors={colors}
                />
                <SummaryCard
                  label="Avg Protein"
                  value={`${avgProtein}g`}
                  unit="avg."
                  color={colors.proteinText}
                  colors={colors}
                />
                <SummaryCard
                  label="Avg Carbs"
                  value={`${avgCarbs}g`}
                  unit="avg."
                  color={colors.carbsText}
                  colors={colors}
                />
                <SummaryCard
                  label="Avg Fat"
                  value={`${avgFat}g`}
                  unit="avg."
                  color={colors.fatText}
                  colors={colors}
                />
                <SummaryCard
                  label="Avg Fiber"
                  value={`${avgFiber}g`}
                  unit="avg."
                  color={colors.fiberText}
                  colors={colors}
                />
              </View>
            )}

            {/* Today: progress + macros */}
            {range === "today" && todayLog && (
              <View style={s.card}>
                <Text style={s.cardLabel}>PROGRESS TO GOAL</Text>
                <View style={s.progressTrack}>
                  <View
                    style={[
                      s.progressFill,
                      {
                        width: `${Math.min((todayLog.cal_high / target) * 100, 100)}%`,
                        backgroundColor:
                          todayLog.cal_high > target
                            ? colors.error
                            : colors.calText,
                      },
                    ]}
                  />
                </View>
                <View style={s.progressLabels}>
                  <Text style={s.progressLow}>{todayLog.cal_low} kcal low</Text>
                  <Text style={s.progressTarget}>{target} kcal goal</Text>
                  <Text style={s.progressHigh}>
                    {todayLog.cal_high} kcal high
                  </Text>
                </View>

                <Text style={[s.cardLabel, { marginTop: 16 }]}>MACROS</Text>
                <MacroBar
                  label="Protein"
                  value={todayLog.protein_g}
                  max={200}
                  color={colors.proteinText}
                  bg={colors.proteinBg}
                />
                <MacroBar
                  label="Carbs"
                  value={todayLog.carbs_g}
                  max={300}
                  color={colors.carbsText}
                  bg={colors.carbsBg}
                />
                <MacroBar
                  label="Fat"
                  value={todayLog.fat_g}
                  max={100}
                  color={colors.fatText}
                  bg={colors.fatBg}
                />
                <MacroBar
                  label="Fiber"
                  value={todayLog.fiber_g}
                  max={50}
                  color={colors.fiberText}
                  bg={colors.fiberBg}
                />
              </View>
            )}

            {range === "today" && todayLog && (
              <TouchableOpacity
                style={s.viewDayBtn}
                onPress={() => navigateToDay(todayLog.date)}
              >
                <Text style={s.viewDayBtnText}>
                  View & Edit Today's Meals →
                </Text>
              </TouchableOpacity>
            )}

            {/* Week bar chart */}
            {range === "week" && (
              <View style={s.card}>
                <Text style={s.cardLabel}>DAILY CALORIES</Text>
                <View style={s.chart}>
                  {Array.from({ length: 7 }).map((_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() - (6 - i));
                    const dateStr = date.toISOString().split("T")[0];
                    const entry = weekLogs.find(l =>
                      l.date.startsWith(dateStr),
                    );
                    const heightPct = entry
                      ? entry.cal_high /
                        Math.max(...weekLogs.map(l => l.cal_high), target)
                      : 0;
                    const overTarget = entry ? entry.cal_high > target : false;
                    const dayLabel = `${days[date.getUTCDay()]} ${date.getUTCMonth() + 1}/${date.getUTCDate()}`;

                    return (
                      <View key={i} style={s.barCol}>
                        <Text style={s.barValue}>
                          {entry ? entry.cal_high : ""}
                        </Text>
                        <View style={s.barTrack}>
                          <View style={{ flex: 1 - heightPct }} />
                          <View
                            style={[
                              s.barFill,
                              {
                                flex: heightPct || 0.02,
                                backgroundColor: !entry
                                  ? colors.barEmpty
                                  : overTarget
                                    ? colors.barOver
                                    : colors.barNormal,
                              },
                            ]}
                          />
                        </View>
                        <Text style={s.barLabel}>{dayLabel}</Text>
                      </View>
                    );
                  })}
                </View>
                <Text style={s.chartTargetNote}>
                  Red bars exceed your {target} kcal goal
                </Text>
              </View>
            )}

            {/* Month calendar */}
            {range === "month" && (
              <View style={s.card}>
                <View style={s.calNavRow}>
                  <TouchableOpacity
                    style={s.calNavBtn}
                    onPress={() => navigateMonth(-1)}
                  >
                    <Text style={s.calNavArrow}>‹</Text>
                  </TouchableOpacity>
                  <Text style={s.calNavTitle}>
                    {calDisplayDate.toLocaleString("default", {
                      month: "long",
                      year: "numeric",
                    })}
                  </Text>
                  {monthOffset < 0 ? (
                    <TouchableOpacity
                      style={s.calNavBtn}
                      onPress={() => navigateMonth(1)}
                    >
                      <Text style={s.calNavArrow}>›</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={s.calNavBtn} />
                  )}
                </View>
                {calLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.textMuted}
                    style={{ paddingVertical: 40 }}
                  />
                ) : (
                  <CalendarGrid
                    logs={monthLogs}
                    target={target}
                    colors={colors}
                    year={calYear}
                    month={calMonth}
                    onDayPress={navigateToDay}
                  />
                )}
              </View>
            )}

            {/* Day by day list */}
            {range !== "today" && (
              <>
                <Text style={s.sectionLabel}>DAY BY DAY</Text>
                {visibleLogs
                  // Logs arrive most-recent-first from the API; keep that order
                  // so the latest date shows on top.
                  .map((entry, i) => (
                    <TouchableOpacity
                      key={i}
                      style={s.dayCard}
                      onPress={() => navigateToDay(entry.date)}
                    >
                      <View style={s.dayHeader}>
                        <Text style={s.dayDate}>{formatDate(entry.date)}</Text>
                        <Text
                          style={[
                            s.dayCals,
                            entry.cal_high > target && s.dayCalsOver,
                          ]}
                        >
                          {entry.cal_low}–{entry.cal_high} kcal
                        </Text>
                      </View>
                      <View style={s.macroRow}>
                        <View
                          style={[
                            s.pill,
                            { backgroundColor: colors.proteinBg },
                          ]}
                        >
                          <Text
                            style={[s.pillText, { color: colors.proteinText }]}
                          >
                            P {entry.protein_g}g
                          </Text>
                        </View>
                        <View
                          style={[s.pill, { backgroundColor: colors.carbsBg }]}
                        >
                          <Text
                            style={[s.pillText, { color: colors.carbsText }]}
                          >
                            C {entry.carbs_g}g
                          </Text>
                        </View>
                        <View
                          style={[s.pill, { backgroundColor: colors.fatBg }]}
                        >
                          <Text style={[s.pillText, { color: colors.fatText }]}>
                            F {entry.fat_g}g
                          </Text>
                        </View>
                        <View
                          style={[s.pill, { backgroundColor: colors.fiberBg }]}
                        >
                          <Text
                            style={[s.pillText, { color: colors.fiberText }]}
                          >
                            Fi {entry.fiber_g}g
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCard({
  label,
  value,
  unit,
  color,
  colors,
  hero = false,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
  colors: Colors;
  hero?: boolean;
}) {
  const s = makeStyles(colors);
  return (
    <View style={[s.summaryCard, hero && s.summaryCardHero]}>
      <View style={s.summaryCellLeft}>
        <Text style={[s.summaryCellLabel, hero && s.summaryCellLabelHero]}>
          {label}
        </Text>
        <Text style={s.summaryCellUnit}>{unit}</Text>
      </View>
      <Text
        style={[s.summaryCellValue, { color }, hero && s.summaryCellValueHero]}
      >
        {value}
      </Text>
    </View>
  );
}

function MacroBar({
  label,
  value,
  max,
  color,
  bg,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  bg: string;
}) {
  const pct = Math.min((value / max) * 100, 100);
  const { colors } = useTheme();
  const s = makeStyles(colors);
  return (
    <View style={s.macroBarRow}>
      <Text style={s.macroBarLabel}>{label}</Text>
      <View style={[s.macroBarTrack, { backgroundColor: bg }]}>
        <View
          style={[s.macroBarFill, { width: `${pct}%`, backgroundColor: color }]}
        />
      </View>
      <Text style={[s.macroBarValue, { color }]}>{value}g</Text>
    </View>
  );
}

function CalendarGrid({
  logs,
  target,
  colors,
  year,
  month,
  onDayPress,
}: {
  logs: DailyLog[];
  target: number;
  colors: Colors;
  year: number;
  month: number;
  onDayPress: (date: string) => void;
}) {
  const s = makeStyles(colors);
  const todayStr = new Date().toISOString().split("T")[0];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const logMap: Record<string, DailyLog> = {};
  logs.forEach(l => {
    const key = l.date.split("T")[0];
    logMap[key] = l;
  });

  // Pad to a full grid so every row has exactly 7 cells — avoids rounding overflow
  const raw: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const remainder = raw.length % 7;
  const cells = remainder === 0 ? raw : [...raw, ...Array(7 - remainder).fill(null)];

  // Split into week rows
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const dayHeaders = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  function renderCell(day: number | null, weekIdx: number, dayIdx: number) {
    if (!day) return <View key={`e-${weekIdx}-${dayIdx}`} style={s.calCell} />;

    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const entry = logMap[dateStr];
    const isToday = dateStr === todayStr;
    const overTarget = entry && entry.cal_high > target;
    const avgCal = entry ? Math.round((entry.cal_low + entry.cal_high) / 2) : 0;

    return (
      <TouchableOpacity
        key={dateStr}
        onPress={() => {
          if (entry) onDayPress(entry.date);
          else if (isWithinSevenDays(dateStr)) onDayPress(dateStr);
        }}
        style={[
          s.calCell,
          s.calCellFilled,
          entry && !overTarget && { backgroundColor: colors.calBg },
          overTarget && { backgroundColor: colors.errorBg },
          isToday && s.calCellToday,
          !entry && isWithinSevenDays(dateStr) && s.calCellEditable,
        ]}
      >
        <Text style={[s.calDayNum, isToday && s.calDayNumToday]}>{day}</Text>
        <Text style={[s.calCals, entry && { color: colors.calText, fontWeight: "500" }]}>
          {entry ? avgCal : "—"}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View>
      <View style={s.calHeaderRow}>
        {dayHeaders.map(d => (
          <Text key={d} style={s.calHeaderCell}>{d}</Text>
        ))}
      </View>
      {weeks.map((week, weekIdx) => (
        <View key={weekIdx} style={s.calWeekRow}>
          {week.map((day, dayIdx) => renderCell(day, weekIdx, dayIdx))}
        </View>
      ))}
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    content: { padding: 16, gap: 12, paddingBottom: 32 },
    centered: { flex: 1, alignItems: "center", justifyContent: "center" },

    toggleRow: {
      flexDirection: "row",
      backgroundColor: colors.surfaceAlt,
      borderRadius: 11,
      padding: 3,
      gap: 3,
    },
    toggleBtn: {
      flex: 1,
      paddingVertical: 8,
      alignItems: "center",
      borderRadius: 9,
    },
    toggleBtnActive: {
      backgroundColor: colors.surface,
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
    },
    toggleText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: "500",
    },
    toggleTextActive: { color: colors.textPrimary },

    targetRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    targetLabel: { fontSize: 13, color: colors.textSecondary },
    targetValue: { fontSize: 13, color: colors.calText, fontWeight: "600" },

    empty: {
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingTop: 60,
    },
    emptyIcon: { fontSize: 48 },
    emptyTitle: { fontSize: 18, fontWeight: "500", color: colors.textPrimary },
    emptySubtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
    },

    summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    summaryCard: {
      width: "47.5%",
      backgroundColor: colors.surfaceAlt,
      borderRadius: 14,
      padding: 14,
      borderWidth: 0.5,
      borderColor: colors.border,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    summaryCardHero: {
      width: "98%",
      paddingVertical: 20,
      paddingHorizontal: 18,
    },
    summaryCellLeft: {
      flex: 1,
      gap: 3,
    },
    summaryCellLabel: { fontSize: 11, color: colors.textSecondary },
    summaryCellLabelHero: {
      fontSize: 14,
      fontWeight: "500",
      color: colors.textSecondary,
    },
    summaryCellValue: { fontSize: 22, fontWeight: "500" },
    summaryCellValueHero: {
      fontSize: 34,
      fontWeight: "600",
      letterSpacing: -0.5,
    },
    summaryCellUnit: { fontSize: 11, color: colors.textMuted },

    card: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 14,
      padding: 14,
      borderWidth: 0.5,
      borderColor: colors.border,
    },
    cardLabel: {
      fontSize: 11,
      fontWeight: "600",
      letterSpacing: 0.8,
      color: colors.textMuted,
      marginBottom: 10,
    },

    progressTrack: {
      height: 12,
      backgroundColor: colors.border,
      borderRadius: 99,
      overflow: "hidden",
    },
    progressFill: { height: "100%", borderRadius: 99 },
    progressLabels: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 6,
    },
    progressLow: { fontSize: 11, color: colors.textSecondary },
    progressTarget: { fontSize: 11, color: colors.textMuted },
    progressHigh: { fontSize: 11, color: colors.textSecondary },

    macroBarRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
    },
    macroBarLabel: { fontSize: 12, color: colors.textSecondary, width: 48 },
    macroBarTrack: { flex: 1, height: 8, borderRadius: 99, overflow: "hidden" },
    macroBarFill: { height: "100%", borderRadius: 99 },
    macroBarValue: {
      fontSize: 12,
      fontWeight: "500",
      width: 36,
      textAlign: "right",
    },

    chart: {
      flexDirection: "row",
      height: 160,
      gap: 4,
      alignItems: "flex-end",
    },
    barCol: {
      flex: 1,
      alignItems: "center",
      height: "100%",
      justifyContent: "flex-end",
    },
    barValue: { fontSize: 9, color: colors.textSecondary, marginBottom: 2 },
    barTrack: { width: "80%", flex: 1, flexDirection: "column" },
    barFill: { borderRadius: 4 },
    barLabel: {
      fontSize: 9,
      color: colors.textSecondary,
      marginTop: 4,
      textAlign: "center",
    },
    chartTargetNote: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 8,
      textAlign: "center",
    },

    sectionLabel: {
      fontSize: 11,
      fontWeight: "600",
      letterSpacing: 0.8,
      color: colors.textMuted,
    },
    dayCard: {
      backgroundColor: colors.surface,
      borderWidth: 0.5,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 14,
      gap: 8,
    },
    dayHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    dayDate: { fontSize: 14, fontWeight: "500", color: colors.textPrimary },
    dayCals: { fontSize: 13, color: colors.calText, fontWeight: "500" },
    dayCalsOver: { color: colors.error },
    macroRow: { flexDirection: "row", gap: 6 },

    pill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99 },
    pillText: { fontSize: 12, fontWeight: "500" },

    calHeaderRow: { flexDirection: "row", marginBottom: 4 },
    calHeaderCell: {
      flex: 1,
      textAlign: "center",
      fontSize: 11,
      fontWeight: "500",
      color: colors.textMuted,
    },
    calWeekRow: { flexDirection: "row" },
    calCell: { flex: 1, aspectRatio: 1, padding: 2 },
    calCellFilled: {
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 7,
    },
    calCellToday: { borderWidth: 1.5, borderColor: colors.textPrimary },
    calDayNum: { fontSize: 11, fontWeight: "500", color: colors.textSecondary },
    calDayNumToday: { color: colors.textPrimary },
    calCals: { fontSize: 9, color: colors.textMuted },
    calCellEditable: {
      borderWidth: 0.5,
      borderColor: colors.borderStrong,
      borderStyle: "dashed",
    },

    viewDayBtn: {
      padding: 13,
      borderRadius: 12,
      borderWidth: 0.5,
      borderColor: colors.borderStrong,
      alignItems: "center",
      backgroundColor: colors.surface,
    },
    viewDayBtnText: {
      fontSize: 13,
      color: colors.carbsText,
      fontWeight: "500",
    },

    calNavRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    calNavBtn: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    calNavArrow: {
      fontSize: 24,
      color: colors.textPrimary,
      lineHeight: 28,
    },
    calNavTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.textPrimary,
    },
  });
}
