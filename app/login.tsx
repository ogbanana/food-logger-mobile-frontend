import { login } from "../lib/api";
import { saveAuth } from "../lib/auth";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme, Colors } from "../lib/ThemeContext";

export default function LoginScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Error", "Please enter your email and password");
      return;
    }
    setLoading(true);
    try {
      const {
        token,
        userId,
        email: userEmail,
      } = await login(email.trim(), password);
      await saveAuth(token, userId, userEmail);
      router.replace("/");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  }

  const s = makeStyles(colors);

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={s.content}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={s.title}>Welcome back</Text>
        <Text style={s.subtitle}>Log in to your Food Logger account.</Text>

        <View style={s.form}>
          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={s.label}>Password</Text>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
          />

          <TouchableOpacity
            style={[s.btn, loading && s.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={s.btnText}>
              {loading ? "Logging in..." : "Log In"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.signupLink}
            onPress={() => router.replace("/signup")}
          >
            <Text style={s.signupLinkText}>Don't have an account? Sign up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.bg },
    content: { flex: 1, padding: 24 },
    backBtn: { marginBottom: 24, marginTop: 16 },
    backText: { fontSize: 14, color: colors.carbsText },
    title: {
      fontSize: 30,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: 8,
      letterSpacing: -0.5,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 22,
      marginBottom: 32,
    },
    form: { gap: 12 },
    label: {
      fontSize: 13,
      fontWeight: "500",
      color: colors.textPrimary,
      marginBottom: -4,
    },
    input: {
      borderWidth: 0.5,
      borderColor: colors.inputBorder,
      borderRadius: 12,
      padding: 13,
      fontSize: 15,
      color: colors.textPrimary,
      backgroundColor: colors.inputBg,
    },
    btn: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 15,
      alignItems: "center",
      marginTop: 8,
    },
    btnDisabled: { opacity: 0.4 },
    btnText: { color: colors.primaryText, fontWeight: "600", fontSize: 15 },
    signupLink: { alignItems: "center", padding: 8 },
    signupLinkText: { fontSize: 13, color: colors.carbsText },
  });
}
