import { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CALORIE_TARGET_KEY = "calorie_target";
export const DEFAULT_CALORIE_TARGET = 2000;

type SettingsContextType = {
  calorieTarget: number;
  setCalorieTarget: (val: number) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextType>({
  calorieTarget: DEFAULT_CALORIE_TARGET,
  setCalorieTarget: async () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [calorieTarget, setCalorieTargetState] = useState(DEFAULT_CALORIE_TARGET);

  useEffect(() => {
    AsyncStorage.getItem(CALORIE_TARGET_KEY).then(val => {
      if (val) setCalorieTargetState(parseInt(val));
    });
  }, []);

  async function setCalorieTarget(val: number) {
    setCalorieTargetState(val);
    await AsyncStorage.setItem(CALORIE_TARGET_KEY, String(val));
  }

  return (
    <SettingsContext.Provider value={{ calorieTarget, setCalorieTarget }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
