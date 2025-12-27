import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { DiscoverScreen, SearchScreen, LibraryScreen, HistoryScreen, SettingsScreen } from '../screens';
import { BottomTabParamList } from '../types';
import { t } from '../services/i18nService';

const Tab = createBottomTabNavigator<BottomTabParamList>();

export const BottomTabNavigator: React.FC = () => {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingTop: 8,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginTop: -4,
        },
      }}
    >
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{
          tabBarLabel: t('tabs.discover'),
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? "book" : "book-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarLabel: t('tabs.search'),
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? "search" : "search-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Library"
        component={LibraryScreen}
        options={{
          tabBarLabel: t('tabs.library'),
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? "bookmark" : "bookmark-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: t('tabs.history'),
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? "time" : "time-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('tabs.settings'),
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? "settings" : "settings-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  // Styles removed as they are no longer needed
});
