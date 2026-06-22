import { Tabs } from "expo-router";
import {
  View,
  Animated,
  Dimensions,
  PanResponder,
  Pressable,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { DrawerProvider, useDrawer } from "../lib/DrawerContext";
import { ThemeProvider, useTheme } from "../lib/ThemeContext";
import { SettingsProvider } from "../lib/SettingsContext";
import Drawer from "../components/Drawer";
import { useRef, useState, useEffect } from "react";
import { useRouter } from "expo-router";
import FoodLoggerLogo from "../components/icons/FoodLoggerLogo";
import DashboardIcon from "../components/icons/DashboardIcon";
import ProfileIcon from "../components/icons/ProfileIcon";

const DRAWER_WIDTH = Dimensions.get("window").width * 0.75;

function TabLayout() {
  const { drawerOpen, setDrawerOpen } = useDrawer();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [drawerMounted, setDrawerMounted] = useState(false);

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
          slideAnim.setValue(-DRAWER_WIDTH + gestureState.dx);
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

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.bg }}
      {...panResponder.panHandlers}
    >
      <StatusBar style={isDark ? "light" : "dark"} />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.tabActive,
          tabBarInactiveTintColor: colors.tabInactive,
          tabBarStyle: {
            backgroundColor: colors.tabBarBg,
            borderTopColor: colors.border,
            borderTopWidth: 0.5,
          },
        }}
      >
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            tabBarIcon: ({ color, size }) => (
              <ProfileIcon color={color} size={size} />
            ),
            tabBarButton: props => (
              <Pressable
                {...(props as any)}
                onPress={() => setDrawerOpen(true)}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            title: "Log",
            tabBarIcon: ({ color, size }) => (
              <FoodLoggerLogo color={color} accent={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="dashboard"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ color, size }) => (
              <DashboardIcon color={color} size={size} />
            ),
          }}
        />

        <Tabs.Screen name="log/[date]" options={{ href: null }} />
        <Tabs.Screen name="signup" options={{ href: null }} />
        <Tabs.Screen name="login" options={{ href: null }} />
      </Tabs>

      {drawerMounted && (
        <Drawer
          visible={drawerMounted}
          onClose={() => setDrawerOpen(false)}
          onSignUp={() => {
            setDrawerOpen(false);
            router.push("/signup");
          }}
          onLogin={() => {
            setDrawerOpen(false);
            router.push("/login");
          }}
          slideAnim={slideAnim}
          fadeAnim={fadeAnim}
        />
      )}
    </View>
  );
}

export default function RootLayout() {
  return (
    <SettingsProvider>
      <ThemeProvider>
        <DrawerProvider>
          <TabLayout />
        </DrawerProvider>
      </ThemeProvider>
    </SettingsProvider>
  );
}
