import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { RootStackParamList } from '../types';
import {
  getExtensionSettings,
  ExtensionSettings,
  DUISection,
  DUIRow,
  updateExtensionSetting,
  invokeExtensionSettingAction,
} from '../services/sourceService';

type ExtensionSettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ExtensionSettings'>;
type ExtensionSettingsScreenRouteProp = RouteProp<RootStackParamList, 'ExtensionSettings'>;

export const ExtensionSettingsScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<ExtensionSettingsScreenNavigationProp>();
  const route = useRoute<ExtensionSettingsScreenRouteProp>();
  const { extensionId, extensionName } = route.params;

  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const [currentForm, setCurrentForm] = useState<DUISection[] | null>(null);
  const [formStack, setFormStack] = useState<{ title: string; sections: DUISection[]; rowId: string; sectionId: string }[]>([]);
  // Local state for input values - key is "sectionId/rowId"
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getExtensionSettings(extensionId);
      setSettings(result);
      
      // Re-navigate to current form if we have a stack
      if (formStack.length > 0 && result) {
        // Rebuild the current form from fresh settings
        let currentSections: DUISection[] | undefined = result.sections ? [{ id: 'main', rows: result.sections as unknown as DUIRow[] }] : undefined;
        
        for (const stackItem of formStack) {
          if (!currentSections) break;
          
          // Find the row in current sections
          for (const section of currentSections) {
            const row = section.rows?.find(r => r.id === stackItem.rowId);
            if (row?.form) {
              currentSections = row.form;
              break;
            }
          }
        }
        
        if (currentSections) {
          setCurrentForm(currentSections);
        }
      }
    } catch (error) {
      console.error('Error loading extension settings:', error);
    } finally {
      setLoading(false);
    }
  }, [extensionId, formStack]);

  useEffect(() => {
    loadSettings();
  }, []);  // Only load on mount, not when formStack changes

  // Build the current path from the form stack - only include rowIds, not sectionIds
  const getCurrentPath = useCallback(() => {
    return formStack.map(item => item.rowId).join('/');
  }, [formStack]);

  const handleNavigationPress = (row: DUIRow, sectionId: string) => {
    if (row.form) {
      setFormStack(prev => [...prev, { title: row.label, sections: row.form!, rowId: row.id, sectionId }]);
      setCurrentForm(row.form);
    }
  };

  const handleBack = () => {
    if (formStack.length > 1) {
      const newStack = [...formStack];
      newStack.pop();
      setFormStack(newStack);
      setCurrentForm(newStack[newStack.length - 1].sections);
    } else if (formStack.length === 1) {
      setFormStack([]);
      setCurrentForm(null);
    } else {
      navigation.goBack();
    }
  };

  const handleButtonPress = async (row: DUIRow, sectionId: string) => {
    if (row.hasOnTap) {
      try {
        // Build the full path for this button
        const basePath = getCurrentPath();
        const fullPath = basePath ? `${basePath}/${sectionId}/${row.id}` : `${sectionId}/${row.id}`;
        
        console.log('Invoking button action:', fullPath);
        const success = await invokeExtensionSettingAction(extensionId, fullPath);
        
        if (success) {
          // Reload settings after button action
          await loadSettings();
          Alert.alert('Success', `${row.label} completed`);
        } else {
          Alert.alert('Error', `Failed to execute ${row.label}`);
        }
      } catch (error) {
        Alert.alert('Error', `Failed to execute ${row.label}`);
      }
    }
  };

  const handleSelectChange = async (row: DUIRow, sectionId: string, selectedValue: string) => {
    try {
      // Build the full path for this setting
      const basePath = getCurrentPath();
      const fullPath = basePath ? `${basePath}/${sectionId}/${row.id}` : `${sectionId}/${row.id}`;
      
      console.log('Updating setting:', fullPath, 'to', [selectedValue]);
      const success = await updateExtensionSetting(extensionId, fullPath, [selectedValue]);
      
      if (success) {
        // Reload settings to reflect changes
        await loadSettings();
      } else {
        console.error('Failed to update setting');
      }
    } catch (error) {
      console.error('Error saving select value:', error);
    }
  };

  // Update local input state (doesn't save to extension yet)
  const handleInputTextChange = (sectionId: string, rowId: string, value: string) => {
    const key = `${sectionId}/${rowId}`;
    setInputValues(prev => ({ ...prev, [key]: value }));
  };

  // Get input value - use local state if exists, otherwise use row value
  const getInputValue = (sectionId: string, rowId: string, rowValue: any): string => {
    const key = `${sectionId}/${rowId}`;
    if (key in inputValues) {
      return inputValues[key];
    }
    return rowValue || '';
  };

  // Save input value on blur
  const handleInputBlur = async (row: DUIRow, sectionId: string) => {
    const key = `${sectionId}/${row.id}`;
    const value = inputValues[key];
    
    // Only save if we have a local value that differs from the original
    if (value === undefined) return;
    
    try {
      // Build the full path for this setting
      const basePath = getCurrentPath();
      const fullPath = basePath ? `${basePath}/${sectionId}/${row.id}` : `${sectionId}/${row.id}`;
      
      console.log('Saving input setting on blur:', fullPath, 'to', value);
      const success = await updateExtensionSetting(extensionId, fullPath, value);
      
      if (success) {
        // Clear local state for this input after save
        setInputValues(prev => {
          const newState = { ...prev };
          delete newState[key];
          return newState;
        });
        // Reload settings to get updated values
        await loadSettings();
      } else {
        console.error('Failed to save input setting');
      }
    } catch (error) {
      console.error('Error saving input value:', error);
    }
  };

  const renderRow = (row: DUIRow, index: number, sectionId: string) => {
    switch (row.type) {
      case 'navigation':
        return (
          <TouchableOpacity
            key={row.id || index}
            style={[styles.row, { backgroundColor: theme.card }]}
            onPress={() => handleNavigationPress(row, sectionId)}
          >
            <Text style={[styles.rowLabel, { color: theme.text }]}>{row.label}</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        );

      case 'button':
        return (
          <TouchableOpacity
            key={row.id || index}
            style={[styles.row, styles.buttonRow, { backgroundColor: theme.card }]}
            onPress={() => handleButtonPress(row, sectionId)}
          >
            <Text style={[styles.buttonLabel, { color: theme.error }]}>{row.label}</Text>
          </TouchableOpacity>
        );

      case 'select':
        return (
          <View key={row.id || index} style={[styles.row, styles.selectRow, { backgroundColor: theme.card }]}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>{row.label}</Text>
            <View style={styles.selectContainer}>
              {row.options?.map((option, optIndex) => {
                const isSelected = Array.isArray(row.value) && row.value.includes(option);
                // Use optionLabels if available, otherwise fall back to raw option
                const displayLabel = row.optionLabels?.[optIndex] || option;
                return (
                  <TouchableOpacity
                    key={optIndex}
                    style={[
                      styles.selectOption,
                      isSelected && { backgroundColor: theme.primary },
                    ]}
                    onPress={() => handleSelectChange(row, sectionId, option)}
                  >
                    <Text
                      style={[
                        styles.selectOptionText,
                        { color: isSelected ? '#fff' : theme.textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {displayLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );

      case 'stepper':
        return (
          <View key={row.id || index} style={[styles.row, { backgroundColor: theme.card }]}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>{row.label}</Text>
            <View style={styles.stepperContainer}>
              <TouchableOpacity
                style={[styles.stepperButton, { backgroundColor: theme.background }]}
                onPress={async () => {
                  const newValue = Math.max(row.minValue || 0, (row.value || 0) - (row.step || 1));
                  const basePath = getCurrentPath();
                  const fullPath = basePath ? `${basePath}/${sectionId}/${row.id}` : `${sectionId}/${row.id}`;
                  await updateExtensionSetting(extensionId, fullPath, newValue);
                  await loadSettings();
                }}
              >
                <Ionicons name="remove" size={20} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.stepperValue, { color: theme.text }]}>{row.value || 0}</Text>
              <TouchableOpacity
                style={[styles.stepperButton, { backgroundColor: theme.background }]}
                onPress={async () => {
                  const newValue = Math.min(row.maxValue || 100, (row.value || 0) + (row.step || 1));
                  const basePath = getCurrentPath();
                  const fullPath = basePath ? `${basePath}/${sectionId}/${row.id}` : `${sectionId}/${row.id}`;
                  await updateExtensionSetting(extensionId, fullPath, newValue);
                  await loadSettings();
                }}
              >
                <Ionicons name="add" size={20} color={theme.text} />
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'input':
        return (
          <View key={row.id || index} style={[styles.row, styles.inputRow, { backgroundColor: theme.card }]}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>{row.label}</Text>
            <TextInput
              style={[styles.textInput, { color: theme.text, borderColor: theme.border }]}
              value={getInputValue(sectionId, row.id, row.value)}
              onChangeText={(text) => handleInputTextChange(sectionId, row.id, text)}
              onBlur={() => handleInputBlur(row, sectionId)}
              placeholder={row.label}
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        );

      case 'secureInput':
        return (
          <View key={row.id || index} style={[styles.row, styles.inputRow, { backgroundColor: theme.card }]}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>{row.label}</Text>
            <TextInput
              style={[styles.textInput, { color: theme.text, borderColor: theme.border }]}
              value={getInputValue(sectionId, row.id, row.value)}
              onChangeText={(text) => handleInputTextChange(sectionId, row.id, text)}
              onBlur={() => handleInputBlur(row, sectionId)}
              placeholder={row.label}
              placeholderTextColor={theme.textSecondary}
              secureTextEntry={true}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        );

      case 'label':
        return (
          <View key={row.id || index} style={[styles.row, { backgroundColor: theme.card }]}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>{row.label}</Text>
          </View>
        );

      default:
        return (
          <View key={row.id || index} style={[styles.row, { backgroundColor: theme.card }]}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>{row.label}</Text>
          </View>
        );
    }
  };

  const renderSection = (section: DUISection, index: number) => {
    if (section.isHidden) return null;
    const sectionId = section.id || `section_${index}`;

    return (
      <View key={sectionId} style={styles.section}>
        {section.header && (
          <Text style={[styles.sectionHeader, { color: theme.textSecondary }]}>
            {section.header.toUpperCase()}
          </Text>
        )}
        <View style={[styles.sectionContent, { borderColor: theme.border }]}>
          {section.rows.map((row, rowIndex) => renderRow(row, rowIndex, sectionId))}
        </View>
        {section.footer && (
          <Text style={[styles.sectionFooter, { color: theme.textSecondary }]}>
            {section.footer}
          </Text>
        )}
      </View>
    );
  };

  const sectionsToRender = currentForm || settings?.sections || [];
  const currentTitle = formStack.length > 0 ? formStack[formStack.length - 1].title : extensionName;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
          {currentTitle}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Loading settings...
          </Text>
        </View>
      ) : !settings || sectionsToRender.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="settings-outline" size={64} color={theme.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No settings available for this extension
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {sectionsToRender.map((section, index) => renderSection(section, index))}
        </ScrollView>
      )}
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
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 16,
    letterSpacing: 0.5,
  },
  sectionContent: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionFooter: {
    fontSize: 13,
    marginTop: 8,
    marginLeft: 16,
    marginRight: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(128, 128, 128, 0.2)',
  },
  rowLabel: {
    fontSize: 16,
    flex: 1,
  },
  buttonRow: {
    justifyContent: 'center',
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  selectRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  selectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  selectOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(128, 128, 128, 0.15)',
  },
  selectOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperValue: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  textInput: {
    width: '100%',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    backgroundColor: 'rgba(128, 128, 128, 0.1)',
  },
});
