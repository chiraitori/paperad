import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { ExtensionSource } from '../services/extensionService';
import { hasExtensionSettings } from '../services/sourceService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../types';

type RouteParams = {
  ExtensionDetail: {
    extension: ExtensionSource & { repoId: string; repoBaseUrl: string };
  };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ExtensionDetail'>;

const INSTALLED_EXTENSIONS_KEY = '@installed_extensions_data';

export const ExtensionDetailScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<RouteParams, 'ExtensionDetail'>>();
  const { extension } = route.params;

  const [parallelChapterDownloads, setParallelChapterDownloads] = useState(1);
  const [parallelPageDownloads, setParallelPageDownloads] = useState(2);
  const [hideFromSearch, setHideFromSearch] = useState(false);
  const [hasSettings, setHasSettings] = useState(false);

  // Build icon URL
  const iconUrl = extension.repoBaseUrl && extension.icon
    ? `${extension.repoBaseUrl}/${extension.id}/includes/${extension.icon}`
    : null;

  // Check if extension has settings
  useEffect(() => {
    const checkSettings = async () => {
      const result = await hasExtensionSettings(extension.id);
      setHasSettings(result);
    };
    checkSettings();
  }, [extension.id]);

  const navigateToSettings = () => {
    navigation.navigate('ExtensionSettings', {
      extensionId: extension.id,
      extensionName: extension.name,
    });
  };

  const handlePurgeFromLibrary = () => {
    Alert.alert(
      'Purge from Library',
      `Are you sure you want to remove all manga from ${extension.name} from your library? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Purge',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement purge logic
            Alert.alert('Purged', `All manga from ${extension.name} have been removed from your library.`);
          },
        },
      ]
    );
  };

  const handleUninstall = async () => {
    Alert.alert(
      'Uninstall Extension',
      `Are you sure you want to uninstall ${extension.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Uninstall',
          style: 'destructive',
          onPress: async () => {
            try {
              const stored = await AsyncStorage.getItem(INSTALLED_EXTENSIONS_KEY);
              if (stored) {
                const extensions = JSON.parse(stored);
                const updated = extensions.filter((ext: any) => ext.id !== extension.id);
                await AsyncStorage.setItem(INSTALLED_EXTENSIONS_KEY, JSON.stringify(updated));
              }
              navigation.goBack();
            } catch (error) {
              console.error('Error uninstalling extension:', error);
            }
          },
        },
      ]
    );
  };

  const incrementValue = (
    value: number,
    setValue: React.Dispatch<React.SetStateAction<number>>,
    max: number = 10
  ) => {
    if (value < max) setValue(value + 1);
  };

  const decrementValue = (
    value: number,
    setValue: React.Dispatch<React.SetStateAction<number>>,
    min: number = 1
  ) => {
    if (value > min) setValue(value - 1);
  };

  const renderInfoRow = (label: string, value: string, isLast: boolean = false) => (
    <View style={[styles.infoRow, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}>
      <Text style={[styles.infoLabel, { color: theme.text }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: theme.textSecondary }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );

  const renderNumberStepper = (
    label: string,
    value: number,
    setValue: React.Dispatch<React.SetStateAction<number>>,
    isLast: boolean = false
  ) => (
    <View style={[styles.stepperRow, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}>
      <Text style={[styles.stepperLabel, { color: theme.text }]}>{label}</Text>
      <View style={styles.stepperControls}>
        <Text style={[styles.stepperValue, { color: theme.text }]}>{value}</Text>
        <View style={[styles.stepperButtons, { backgroundColor: theme.card }]}>
          <TouchableOpacity
            style={styles.stepperButton}
            onPress={() => decrementValue(value, setValue)}
          >
            <Ionicons name="remove" size={20} color={theme.text} />
          </TouchableOpacity>
          <View style={[styles.stepperDivider, { backgroundColor: theme.border }]} />
          <TouchableOpacity
            style={styles.stepperButton}
            onPress={() => incrementValue(value, setValue)}
          >
            <Ionicons name="add" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'} size={28} color={theme.primary} />
          <Text style={[styles.backText, { color: theme.primary }]}>Extensions</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Extension Header */}
        <View style={styles.extensionHeader}>
          <View style={[styles.iconContainer, { backgroundColor: '#2A2A2D' }]}>
            {iconUrl ? (
              <Image
                source={{ uri: iconUrl }}
                style={styles.iconImage}
                defaultSource={require('../../assets/icon.png')}
              />
            ) : (
              <Ionicons name="extension-puzzle" size={48} color="#FFF" />
            )}
          </View>
          <Text style={[styles.extensionName, { color: theme.text }]}>{extension.name}</Text>
          <Text style={[styles.extensionVersion, { color: theme.textSecondary }]}>
            {extension.version}
          </Text>
        </View>

        {/* Information Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>INFORMATION</Text>
          <View style={[styles.sectionContent, { backgroundColor: theme.card }]}>
            {renderInfoRow('Identifier', extension.id)}
            {renderInfoRow('Author', extension.author)}
            <View style={[styles.infoRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}>
              <Text style={[styles.infoLabel, { color: theme.text }]}>Description</Text>
            </View>
            <View style={styles.descriptionRow}>
              <Text style={[styles.descriptionText, { color: theme.textSecondary }]}>
                {extension.desc}
              </Text>
            </View>
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <Text style={[styles.infoLabel, { color: theme.text }]}>Repository URL</Text>
            </View>
            <View style={[styles.descriptionRow, { paddingTop: 0 }]}>
              <Text style={[styles.descriptionText, { color: theme.textSecondary }]}>
                {extension.repoBaseUrl}
              </Text>
            </View>
          </View>
        </View>

        {/* Source Settings - shown only if extension has settings */}
        {hasSettings && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              SOURCE SETTINGS
            </Text>
            <View style={[styles.sectionContent, { backgroundColor: theme.card }]}>
              <TouchableOpacity style={styles.settingsRow} onPress={navigateToSettings}>
                <Text style={[styles.settingsLabel, { color: theme.text }]}>Domain Settings</Text>
                <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.resetButton]}>
                <Text style={[styles.resetText, { color: theme.primary }]}>Reset to Default</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Download Manager Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            DOWNLOAD MANAGER SETTINGS
          </Text>
          <View style={[styles.sectionContent, { backgroundColor: theme.card }]}>
            {renderNumberStepper('Parallel Chapter\nDownloads', parallelChapterDownloads, setParallelChapterDownloads)}
            {renderNumberStepper('Parallel Page Downloads', parallelPageDownloads, setParallelPageDownloads, true)}
          </View>
        </View>

        {/* Other Settings */}
        <View style={styles.section}>
          <View style={[styles.sectionContent, { backgroundColor: theme.card }]}>
            <View style={[styles.switchRow, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}>
              <Text style={[styles.switchLabel, { color: theme.text }]}>Hide Source from Search</Text>
              <Switch
                value={hideFromSearch}
                onValueChange={setHideFromSearch}
                trackColor={{ false: '#3A3A3C', true: theme.primary }}
                thumbColor="#FFF"
              />
            </View>
            <TouchableOpacity style={styles.purgeButton} onPress={handlePurgeFromLibrary}>
              <Text style={[styles.purgeText, { color: theme.primary }]}>Purge from Library</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Uninstall Button */}
        <View style={styles.section}>
          <View style={[styles.sectionContent, { backgroundColor: theme.card }]}>
            <TouchableOpacity style={styles.uninstallButton} onPress={handleUninstall}>
              <Text style={[styles.uninstallText, { color: theme.error }]}>Uninstall Extension</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 50,
    paddingBottom: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 17,
    marginLeft: -4,
  },
  content: {
    paddingBottom: 40,
  },
  extensionHeader: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 12,
  },
  iconImage: {
    width: 100,
    height: 100,
    borderRadius: 20,
  },
  extensionName: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 4,
  },
  extensionVersion: {
    fontSize: 15,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '400',
    marginLeft: 16,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  sectionContent: {
    marginHorizontal: 16,
    borderRadius: 10,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  infoLabel: {
    fontSize: 16,
    flex: 1,
  },
  infoValue: {
    fontSize: 16,
    textAlign: 'right',
    flex: 1,
  },
  descriptionRow: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 4,
  },
  descriptionText: {
    fontSize: 15,
    lineHeight: 20,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  stepperLabel: {
    fontSize: 16,
    flex: 1,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepperValue: {
    fontSize: 16,
    marginRight: 12,
    minWidth: 20,
    textAlign: 'center',
  },
  stepperButtons: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
  },
  stepperButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  stepperDivider: {
    width: 1,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  switchLabel: {
    fontSize: 16,
  },
  purgeButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  purgeText: {
    fontSize: 16,
  },
  uninstallButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  uninstallText: {
    fontSize: 16,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128, 128, 128, 0.3)',
  },
  settingsLabel: {
    fontSize: 16,
  },
  resetButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  resetText: {
    fontSize: 16,
  },
});
