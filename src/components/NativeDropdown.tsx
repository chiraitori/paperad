import React, { useState } from 'react';
import { Platform, View, Text, TouchableOpacity, StyleSheet, Modal, TouchableWithoutFeedback, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { t } from '../services/i18nService';
import Constants from 'expo-constants';

// Conditionally import zeego - will fail in Expo Go but work in dev/prod builds
let DropdownMenuRoot: any = null;
let DropdownMenuTrigger: any = null;
let DropdownMenuContent: any = null;
let DropdownMenuLabel: any = null;
let DropdownMenuCheckboxItem: any = null;
let DropdownMenuItemIndicator: any = null;
let DropdownMenuItemTitle: any = null;

// Check if running in Expo Go
const isExpoGo = Constants.appOwnership === 'expo';

// Only try to load zeego if not in Expo Go
if (!isExpoGo && Platform.OS === 'ios') {
    try {
        const zeego = require('zeego/dropdown-menu');
        DropdownMenuRoot = zeego.Root;
        DropdownMenuTrigger = zeego.Trigger;
        DropdownMenuContent = zeego.Content;
        DropdownMenuLabel = zeego.Label;
        DropdownMenuCheckboxItem = zeego.CheckboxItem;
        DropdownMenuItemIndicator = zeego.ItemIndicator;
        DropdownMenuItemTitle = zeego.ItemTitle;
    } catch (e) {
        // zeego not available, will use fallback
    }
}

interface DropdownOption {
    label: string;
    value: string;
}

interface NativeDropdownProps {
    options: DropdownOption[];
    selectedValue: string;
    onSelect: (value: string) => void;
    title?: string;
    children: React.ReactNode;
}

/**
 * Native dropdown menu component
 * - iOS (production build): Uses native pull-down menu via zeego
 * - iOS (Expo Go) / Android: Uses modal picker fallback
 */
export const NativeDropdown: React.FC<NativeDropdownProps> = ({
    options,
    selectedValue,
    onSelect,
    title,
    children,
}) => {
    const { theme } = useTheme();
    const [showPicker, setShowPicker] = useState(false);

    // Use native zeego dropdown on iOS production builds
    if (Platform.OS === 'ios' && DropdownMenuRoot && !isExpoGo) {
        return (
            <DropdownMenuRoot>
                <DropdownMenuTrigger>
                    {children}
                </DropdownMenuTrigger>

                <DropdownMenuContent>
                    {title && <DropdownMenuLabel>{title}</DropdownMenuLabel>}

                    {options.map((option) => (
                        <DropdownMenuCheckboxItem
                            key={option.value}
                            value={selectedValue === option.value ? 'on' : 'off'}
                            onValueChange={() => onSelect(option.value)}
                        >
                            <DropdownMenuItemIndicator />
                            <DropdownMenuItemTitle>{option.label}</DropdownMenuItemTitle>
                        </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenuRoot>
        );
    }

    // Fallback: Modal picker for Expo Go and Android
    const handleSelect = (value: string) => {
        onSelect(value);
        setShowPicker(false);
    };

    return (
        <>
            <Pressable onPress={() => setShowPicker(true)}>
                {children}
            </Pressable>

            <Modal
                visible={showPicker}
                transparent
                animationType="fade"
                onRequestClose={() => setShowPicker(false)}
            >
                <TouchableWithoutFeedback onPress={() => setShowPicker(false)}>
                    <View style={styles.overlay}>
                        <TouchableWithoutFeedback>
                            <View style={[styles.container, { backgroundColor: theme.card }]}>
                                {title && (
                                    <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
                                )}
                                <ScrollView style={styles.optionsContainer} bounces={false}>
                                    {options.map((option, index) => (
                                        <TouchableOpacity
                                            key={option.value}
                                            style={[
                                                styles.option,
                                                index < options.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth },
                                            ]}
                                            onPress={() => handleSelect(option.value)}
                                        >
                                            <Text
                                                style={[
                                                    styles.optionText,
                                                    { color: theme.text },
                                                    selectedValue === option.value && { color: theme.primary, fontWeight: '600' },
                                                ]}
                                            >
                                                {option.label}
                                            </Text>
                                            {selectedValue === option.value && (
                                                <Ionicons name="checkmark" size={22} color={theme.primary} />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                                <TouchableOpacity
                                    style={[styles.cancelButton, { borderTopColor: theme.border }]}
                                    onPress={() => setShowPicker(false)}
                                >
                                    <Text style={[styles.cancelText, { color: theme.primary }]}>{t('common.cancel')}</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </>
    );
};

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
        paddingBottom: 12,
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

export default NativeDropdown;
