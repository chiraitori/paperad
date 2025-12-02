import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { BottomTabNavigator } from './BottomTabNavigator';
import { MangaDetailScreen, ReaderScreen, GeneralSettingsScreen, ThemeSettingsScreen, BackupsScreen, ExtensionsScreen, ExtensionDetailScreen, ExtensionSettingsScreen, AddRepositoryScreen, BrowseRepositoryScreen, BrowseAllRepositoriesScreen, DeveloperScreen, CreditsScreen, CategoryScreen, SearchResultsScreen, GenreListScreen } from '../screens';
import { RootStackParamList } from '../types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const { theme, isDark } = useTheme();

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Main" component={BottomTabNavigator} />
        <Stack.Screen name="MangaDetail" component={MangaDetailScreen} />
        <Stack.Screen name="Reader" component={ReaderScreen} />
        <Stack.Screen name="GeneralSettings" component={GeneralSettingsScreen} />
        <Stack.Screen name="ThemeSettings" component={ThemeSettingsScreen} />
        <Stack.Screen name="Backups" component={BackupsScreen} />
        <Stack.Screen name="Extensions" component={ExtensionsScreen} />
        <Stack.Screen name="ExtensionDetail" component={ExtensionDetailScreen} />
        <Stack.Screen name="ExtensionSettings" component={ExtensionSettingsScreen} />
        <Stack.Screen 
          name="AddRepository" 
          component={AddRepositoryScreen}
          options={{
            presentation: 'transparentModal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen name="BrowseAllRepositories" component={BrowseAllRepositoriesScreen} />
        <Stack.Screen name="BrowseRepository" component={BrowseRepositoryScreen} />
        <Stack.Screen name="Developer" component={DeveloperScreen} />
        <Stack.Screen name="Credits" component={CreditsScreen} />
        <Stack.Screen name="Category" component={CategoryScreen} />
        <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
        <Stack.Screen name="GenreList" component={GenreListScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};
