import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  ScrollView,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { NativeDropdown } from '../components';
import { t } from '../services/i18nService';

export const ThemeSettingsScreen: React.FC = () => {
  const {
    theme,
    themeMode,
    setThemeMode,
    customThemes,
    activeCustomThemeId,
    setActiveCustomTheme,
    importTheme,
    deleteCustomTheme,
  } = useTheme();
  const navigation = useNavigation();

  const getThemeLabel = (mode: string) => {
    switch (mode) {
      case 'light': return t('theme.light');
      case 'dark': return t('theme.dark');
      case 'system': return t('theme.system');
      default: return t('theme.system');
    }
  };


  const handleImportTheme = async () => {
    try {
      const importedTheme = await importTheme();
      if (importedTheme) {
        Alert.alert(
          t('theme.importedTitle'),
          t('theme.importedMessage', { name: importedTheme.name }),
          [
            { text: t('theme.notNow'), style: 'cancel' },
            {
              text: t('theme.apply'),
              onPress: () => setActiveCustomTheme(importedTheme.id)
            },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert(t('theme.importFailed'), error.message || 'Failed to import theme file');
    }
  };

  const handleSelectTheme = (themeId: string | null) => {
    setActiveCustomTheme(themeId);
  };

  const handleDeleteTheme = (themeId: string, themeName: string) => {
    Alert.alert(
      t('theme.deleteTitle'),
      t('theme.deleteConfirm', { name: themeName }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => deleteCustomTheme(themeId),
        },
      ]
    );
  };

  const handleResetTheme = () => {
    Alert.alert(
      t('theme.resetTitle'),
      t('theme.resetConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.reset'), // Make sure to add this common key if missing, or use 'common.delete' logic
          style: 'destructive',
          onPress: () => setActiveCustomTheme(null),
        },
      ]
    );
  };

  const renderSettingItem = ({
    title,
    value,
    onPress,
    isDestructive = false,
    showSelector = false,
    centered = false,
    isSelected = false,
    showDelete = false,
    onDelete,
  }: {
    title: string;
    value?: string;
    onPress?: () => void;
    isDestructive?: boolean;
    showSelector?: boolean;
    centered?: boolean;
    isSelected?: boolean;
    showDelete?: boolean;
    onDelete?: () => void;
  }) => (
    <TouchableOpacity
      style={[styles.settingItem, { borderBottomColor: theme.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {centered ? (
        <Text
          style={[
            styles.centeredTitle,
            { color: isDestructive ? theme.error : theme.primary },
          ]}
        >
          {title}
        </Text>
      ) : (
        <>
          <View style={styles.leftContent}>
            {isSelected && (
              <Ionicons
                name="checkmark"
                size={22}
                color={theme.primary}
                style={styles.checkmark}
              />
            )}
            <Text style={[styles.settingTitle, { color: theme.text }]}>
              {title}
            </Text>
          </View>
          <View style={styles.rightContainer}>
            {value && (
              <Text style={[styles.valueText, { color: theme.textSecondary }]}>
                {value}
              </Text>
            )}
            {showSelector && (
              <Ionicons
                name="chevron-expand"
                size={18}
                color={theme.textSecondary}
                style={styles.selectorIcon}
              />
            )}
            {showDelete && onDelete && (
              <TouchableOpacity onPress={onDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons
                  name="trash-outline"
                  size={20}
                  color={theme.error}
                />
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </TouchableOpacity>
  );

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
        {title}
      </Text>
      <View style={[styles.sectionContent, { backgroundColor: theme.card }]}>
        {children}
      </View>
    </View>
  );

  const renderThemePreview = (colors: { primary: string; background: string; card: string; text: string }) => (
    <View style={styles.previewContainer}>
      <View style={[styles.previewBox, { backgroundColor: colors.background }]}>
        <View style={[styles.previewCard, { backgroundColor: colors.card }]}>
          <View style={[styles.previewAccent, { backgroundColor: colors.primary }]} />
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'} size={28} color={theme.primary} />
          <Text style={[styles.backText, { color: theme.primary }]}>{t('settings.title')}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('theme.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Theme Mode */}
        {renderSection(
          t('theme.appearance'),
          <View style={[styles.settingItem, { borderBottomColor: theme.border }]}>
            <View style={styles.leftContent}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>
                {t('theme.themeMode')}
              </Text>
            </View>
            <NativeDropdown
              options={[
                { label: t('theme.light'), value: 'light' },
                { label: t('theme.dark'), value: 'dark' },
                { label: t('theme.system'), value: 'system' },
              ]}
              selectedValue={themeMode}
              onSelect={(value) => setThemeMode(value as 'light' | 'dark' | 'system')}
              title={t('theme.themeMode')}
            >
              <View style={styles.rightContainer}>
                <Text style={[styles.valueText, { color: theme.textSecondary }]}>
                  {getThemeLabel(themeMode)}
                </Text>
                <Ionicons
                  name="chevron-expand"
                  size={18}
                  color={theme.textSecondary}
                  style={styles.selectorIcon}
                />
              </View>
            </NativeDropdown>
          </View>
        )}

        {/* Built-in Theme */}
        {renderSection(
          'THEME', // Adding key recommended, using literal for now or 'theme.theme'
          renderSettingItem({
            title: t('theme.default'),
            onPress: () => handleSelectTheme(null),
            isSelected: activeCustomThemeId === null,
          })
        )}

        {/* Custom Themes */}
        {customThemes.length > 0 && renderSection(
          t('theme.customThemes'),
          <>
            {customThemes.map((customTheme, index) => (
              <View key={customTheme.id}>
                {renderSettingItem({
                  title: customTheme.name,
                  onPress: () => handleSelectTheme(customTheme.id),
                  isSelected: activeCustomThemeId === customTheme.id,
                  showDelete: true,
                  onDelete: () => handleDeleteTheme(customTheme.id, customTheme.name),
                })}
              </View>
            ))}
          </>
        )}

        {/* Import/Export */}
        {renderSection(
          t('theme.manage'),
          <>
            {renderSettingItem({
              title: t('theme.importTheme'),
              onPress: handleImportTheme,
              centered: true,
            })}
            {activeCustomThemeId && renderSettingItem({
              title: t('theme.resetToDefault'),
              onPress: handleResetTheme,
              isDestructive: true,
              centered: true,
            })}
          </>
        )}

        <View style={styles.infoContainer}>
          <Text style={[styles.infoText, { color: theme.textSecondary }]}>
            {t('theme.importHint')}
          </Text>
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
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backText: {
    fontSize: 17,
    marginLeft: -2,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerSpacer: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 16,
    textTransform: 'uppercase',
  },
  sectionContent: {
    borderRadius: 10,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 44,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkmark: {
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 17,
    fontWeight: '400',
  },
  centeredTitle: {
    fontSize: 17,
    fontWeight: '400',
    flex: 1,
    textAlign: 'center',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueText: {
    fontSize: 17,
    marginRight: 4,
  },
  selectorIcon: {
    marginLeft: 2,
  },
  previewContainer: {
    marginLeft: 8,
  },
  previewBox: {
    width: 40,
    height: 30,
    borderRadius: 4,
    padding: 4,
    borderWidth: 1,
    borderColor: 'rgba(128, 128, 128, 0.3)',
  },
  previewCard: {
    flex: 1,
    borderRadius: 2,
    padding: 2,
  },
  previewAccent: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  infoContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  infoText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
