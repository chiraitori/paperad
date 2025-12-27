import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { t } from '../services/i18nService';

interface PickerModalProps<T extends string> {
  visible: boolean;
  title: string;
  subtitle?: string;
  options: T[];
  selectedValue: T;
  onSelect: (value: T) => void;
  onClose: () => void;
  renderOption?: (option: T) => string;
}

export function PickerModal<T extends string>({
  visible,
  title,
  subtitle,
  options,
  selectedValue,
  onSelect,
  onClose,
  renderOption,
}: PickerModalProps<T>) {
  const { theme } = useTheme();

  const handleSelect = (option: T) => {
    onSelect(option);
    onClose();
  };

  const getOptionLabel = (option: T): string => {
    if (renderOption) {
      return renderOption(option);
    }
    return option;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.container, { backgroundColor: theme.card }]}>
              <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
              {subtitle && (
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  {subtitle}
                </Text>
              )}
              <ScrollView style={styles.optionsContainer} bounces={false}>
                {options.map((option, index) => (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.option,
                      index < options.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth },
                    ]}
                    onPress={() => handleSelect(option)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        { color: theme.text },
                        selectedValue === option && { color: theme.primary, fontWeight: '600' },
                      ]}
                    >
                      {getOptionLabel(option)}
                    </Text>
                    {selectedValue === option && (
                      <Ionicons name="checkmark" size={22} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={[styles.cancelButton, { borderTopColor: theme.border }]}
                onPress={onClose}
              >
                <Text style={[styles.cancelText, { color: theme.primary }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  container: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 14,
    overflow: 'hidden',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    paddingTop: 20,
    paddingHorizontal: 16,
  },
  subtitle: {
    fontSize: 13,
    textAlign: 'center',
    paddingTop: 4,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  optionsContainer: {
    maxHeight: 300,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  optionText: {
    fontSize: 16,
  },
  cancelButton: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    marginTop: 8,
  },
  cancelText: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
});
