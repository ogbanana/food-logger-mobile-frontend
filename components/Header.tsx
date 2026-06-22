import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "../lib/ThemeContext";
import FoodLoggerLogo from "./icons/FoodLoggerLogo";

export default function Header() {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surface, borderBottomColor: colors.border },
      ]}
    >
      <FoodLoggerLogo
        size={26}
        color={colors.textPrimary}
        accent={colors.calText}
      />
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        Food Logger
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
});
