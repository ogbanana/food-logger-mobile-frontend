import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { getDaysRemaining } from "../lib/identity";
import { isAuthenticated, getUserEmail, logout } from "../lib/auth";
import { useTheme, Colors } from "../lib/ThemeContext";
import { useSettings } from "../lib/SettingsContext";
import FoodLoggerLogo from "./icons/FoodLoggerLogo";

const DRAWER_WIDTH = Dimensions.get("window").width * 0.75;

type Props = {
  visible: boolean;
  onClose: () => void;
  onSignUp: () => void;
  onLogin: () => void;
  slideAnim: Animated.Value;
  fadeAnim: Animated.Value;
};

export default function Drawer({
  visible,
  onClose,
  onSignUp,
  onLogin,
  slideAnim,
  fadeAnim,
}: Props) {
  const { colors, isDark, toggleTheme } = useTheme();
  const { calorieTarget, setCalorieTarget } = useSettings();
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState("");
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    async function checkAuth() {
      const authed = await isAuthenticated();
      setAuthenticated(authed);
      if (authed) {
        const email = await getUserEmail();
        setUserEmail(email);
      }
    }
    checkAuth();
  }, []);

  useEffect(() => {
    getDaysRemaining().then(setDaysRemaining);
  }, []);

  useEffect(() => {
    if (editingTarget) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [editingTarget]);

  async function handleSaveTarget() {
    const val = parseInt(targetInput);
    if (!val || val < 100) return;
    await setCalorieTarget(val);
    setEditingTarget(false);
  }

  const s = makeStyles(colors);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[s.backdrop, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[s.drawer, { transform: [{ translateX: slideAnim }] }]}
      >
        {/* Header */}
        <View style={s.drawerHeader}>
          <View style={s.drawerHeaderTitleRow}>
            <FoodLoggerLogo size={26} color="#FFFFFF" accent="#FFFFFF" />
            <Text style={s.appName}>Food Logger</Text>
          </View>
          <Text style={s.appTagline}>Your personal food brain dump</Text>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          {/* Auth section */}
          {authenticated ? (
            <View style={s.guestCard}>
              <Text style={s.guestLabel}>SIGNED IN AS</Text>
              <Text style={s.guestStatus}>✓ {userEmail}</Text>
              <TouchableOpacity
                style={s.logoutBtn}
                onPress={async () => {
                  await logout();
                  setAuthenticated(false);
                  setUserEmail(null);
                  onClose();
                }}
              >
                <Text style={s.logoutBtnText}>Log Out</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={s.guestCard}>
                <Text style={s.guestLabel}>ACCOUNT STATUS</Text>
                <Text style={s.guestStatus}>👤 Guest</Text>
                {daysRemaining !== null && daysRemaining <= 7 && (
                  <Text
                    style={[
                      s.guestExpiry,
                      daysRemaining <= 2 && s.guestExpiryUrgent,
                    ]}
                  >
                    ⏳ Data expires in {daysRemaining} day
                    {daysRemaining === 1 ? "" : "s"}
                  </Text>
                )}
                {daysRemaining !== null && daysRemaining > 7 && (
                  <Text style={s.guestExpiry}>
                    ✓ {daysRemaining} days of free logging remaining
                  </Text>
                )}
              </View>
              <View style={s.authSection}>
                <TouchableOpacity
                  style={s.signUpBtn}
                  onPress={() => {
                    onClose();
                    onSignUp();
                  }}
                >
                  <Text style={s.signUpBtnText}>Create Account</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.loginBtn}
                  onPress={() => {
                    onClose();
                    onLogin();
                  }}
                >
                  <Text style={s.loginBtnText}>Log In</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          <ScrollView
            ref={scrollRef}
            style={s.scrollBody}
            showsVerticalScrollIndicator={false}
          >
            <View style={s.divider} />

            {/* Nutrition key */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>NUTRITION KEY</Text>
              <View style={s.legendGrid}>
                <LegendRow
                  label="Protein (g)"
                  pill="P"
                  pillBg={colors.proteinBg}
                  pillText={colors.proteinText}
                />
                <LegendRow
                  label="Carbohydrates (g)"
                  pill="C"
                  pillBg={colors.carbsBg}
                  pillText={colors.carbsText}
                />
                <LegendRow
                  label="Fat (g)"
                  pill="F"
                  pillBg={colors.fatBg}
                  pillText={colors.fatText}
                />
                <LegendRow
                  label="Fiber (g)"
                  pill="Fi"
                  pillBg={colors.fiberBg}
                  pillText={colors.fiberText}
                />
                <LegendRow
                  label="Calories (kcal)"
                  pill="🔥"
                  pillBg={colors.calBg}
                  pillText={colors.calText}
                />
              </View>
            </View>

            <View style={s.divider} />

            {/* Settings */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>SETTINGS</Text>

              {/* Dark mode */}
              <View style={s.themeRow}>
                <Text style={s.themeLabel}>Dark Mode</Text>
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                  trackColor={{ false: colors.surfaceAlt, true: "#4A4A4A" }}
                  thumbColor={colors.textPrimary}
                  ios_backgroundColor={colors.surfaceAlt}
                />
              </View>

              {/* Daily calorie target */}
              <View style={s.targetBlock}>
                <Text style={s.themeLabel}>Daily Calorie Target</Text>
                {editingTarget ? (
                  <View style={s.targetEditRow}>
                    <TextInput
                      style={s.targetInput}
                      value={targetInput}
                      onChangeText={setTargetInput}
                      keyboardType="numeric"
                      autoFocus
                      placeholder={String(calorieTarget)}
                      placeholderTextColor={colors.textMuted}
                      returnKeyType="done"
                      onSubmitEditing={handleSaveTarget}
                    />
                    <TouchableOpacity
                      style={s.targetSaveBtn}
                      onPress={handleSaveTarget}
                    >
                      <Text style={s.targetSaveBtnText}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setEditingTarget(false)}>
                      <Text style={s.targetCancelText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={s.targetValueRow}
                    onPress={() => {
                      setTargetInput(String(calorieTarget));
                      setEditingTarget(true);
                    }}
                  >
                    <Text style={s.targetValue}>{calorieTarget} kcal</Text>
                    <Text style={s.targetEditHint}>Edit</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={{ height: 32 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

function LegendRow({
  label,
  pill,
  pillBg,
  pillText,
}: {
  label: string;
  pill: string;
  pillBg: string;
  pillText: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View
        style={{
          width: 28,
          height: 28,
          borderRadius: 99,
          backgroundColor: pillBg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: "500", color: pillText }}>
          {pill}
        </Text>
      </View>
      <Text style={{ fontSize: 13, color: colors.textPrimary }}>{label}</Text>
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    drawer: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      width: DRAWER_WIDTH,
      backgroundColor: colors.surface,
      shadowColor: "#000",
      shadowOpacity: 0.25,
      shadowRadius: 16,
      shadowOffset: { width: 6, height: 0 },
      elevation: 10,
    },
    drawerHeader: {
      paddingTop: 64,
      paddingHorizontal: 20,
      paddingBottom: 20,
      backgroundColor: colors.drawerHeaderBg,
    },
    drawerHeaderTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 4,
    },
    appName: {
      fontSize: 22,
      fontWeight: "700",
      color: "#FFFFFF",
      letterSpacing: -0.3,
    },
    appTagline: {
      fontSize: 13,
      color: "rgba(255,255,255,0.55)",
    },
    guestCard: {
      margin: 16,
      padding: 14,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 12,
      borderWidth: 0.5,
      borderColor: colors.border,
      gap: 4,
    },
    guestLabel: {
      fontSize: 10,
      fontWeight: "600",
      letterSpacing: 0.8,
      color: colors.textMuted,
      marginBottom: 4,
    },
    guestStatus: {
      fontSize: 15,
      fontWeight: "500",
      color: colors.textPrimary,
    },
    guestExpiry: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    guestExpiryUrgent: {
      color: colors.error,
    },
    authSection: {
      paddingHorizontal: 16,
      gap: 8,
    },
    signUpBtn: {
      backgroundColor: colors.primary,
      borderRadius: 10,
      padding: 12,
      alignItems: "center",
    },
    signUpBtnText: {
      color: colors.primaryText,
      fontWeight: "600",
      fontSize: 14,
    },
    loginBtn: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 10,
      padding: 12,
      alignItems: "center",
      borderWidth: 0.5,
      borderColor: colors.border,
    },
    loginBtnText: {
      color: colors.textPrimary,
      fontWeight: "500",
      fontSize: 14,
    },
    divider: {
      height: 0.5,
      backgroundColor: colors.border,
      marginVertical: 16,
      marginHorizontal: 16,
    },
    section: {
      paddingHorizontal: 16,
      gap: 10,
    },
    sectionLabel: {
      fontSize: 10,
      fontWeight: "600",
      letterSpacing: 0.8,
      color: colors.textMuted,
    },
    legendGrid: {
      gap: 10,
    },
    themeRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    themeLabel: {
      fontSize: 14,
      color: colors.textPrimary,
      fontWeight: "500",
    },
    scrollBody: {
      flex: 1,
    },
    targetBlock: {
      gap: 8,
      marginTop: 14,
    },
    targetValueRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    targetValue: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.calText,
    },
    targetEditHint: {
      fontSize: 12,
      color: colors.textMuted,
    },
    targetEditRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    targetInput: {
      flex: 1,
      borderWidth: 0.5,
      borderColor: colors.inputBorder,
      borderRadius: 8,
      padding: 8,
      fontSize: 14,
      color: colors.textPrimary,
      backgroundColor: colors.inputBg,
    },
    targetSaveBtn: {
      backgroundColor: colors.primary,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    targetSaveBtnText: {
      color: colors.primaryText,
      fontSize: 13,
      fontWeight: "600",
    },
    targetCancelText: {
      fontSize: 13,
      color: colors.textMuted,
    },
    logoutBtn: {
      marginTop: 10,
      padding: 8,
      borderRadius: 8,
      borderWidth: 0.5,
      borderColor: `${colors.error}44`,
      alignItems: "center",
    },
    logoutBtnText: {
      fontSize: 13,
      color: colors.error,
      fontWeight: "500",
    },
  });
}
