import React from 'react';
import { NavigationContainer, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme/ThemeContext';
import { ScoreboardScreen } from '../screens/ScoreboardScreen';
import { CommunityScreen } from '../screens/CommunityScreen';
import { StatsScreen } from '../screens/StatsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

export type TabParamList = {
  Punteggio: undefined;
  Community: undefined;
  Statistiche: undefined;
  Impostazioni: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const ICONS: Record<keyof TabParamList, keyof typeof Ionicons.glyphMap> = {
  Punteggio: 'tennisball',
  Community: 'people',
  Statistiche: 'stats-chart',
  Impostazioni: 'settings',
};

export function RootNavigator() {
  const { palette } = useAppTheme();

  const navTheme = {
    ...(palette.mode === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(palette.mode === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      primary: palette.accent,
      background: palette.background,
      card: palette.surface,
      text: palette.textPrimary,
      border: palette.border,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerStyle: { backgroundColor: palette.surface },
          headerTitleStyle: { color: palette.textPrimary },
          tabBarStyle: { backgroundColor: palette.surface, borderTopColor: palette.border },
          tabBarActiveTintColor: palette.accent,
          tabBarInactiveTintColor: palette.textSecondary,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={ICONS[route.name as keyof TabParamList]} size={size} color={color} />
          ),
        })}
      >
        <Tab.Screen name="Punteggio" component={ScoreboardScreen} />
        <Tab.Screen name="Community" component={CommunityScreen} />
        <Tab.Screen name="Statistiche" component={StatsScreen} />
        <Tab.Screen name="Impostazioni" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
