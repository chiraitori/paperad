import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
    Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as LocalAuthentication from 'expo-local-authentication';
import { useTheme } from '../context/ThemeContext';
import { AppDialog } from '../components/AppDialog';
import { NativeDropdown } from '../components/NativeDropdown';
import { t, getCurrentLanguage, SUPPORTED_LANGUAGES, LanguageCode } from '../services/i18nService';
import { RootStackParamList } from '../types';

const SETTINGS_KEY = '@general_settings';

interface GeneralSettings {
    portraitColumns: number;
    landscapeColumns: number;
    chapterListSort: 'ascending' | 'descending';
    interactiveUpdates: boolean;
    libraryAuth: boolean;
    historyAuth: boolean;
    hideUpdateModal: boolean;
    mangaPreviewEnabled: boolean; // Long-press preview popup
}

interface DialogState {
    visible: boolean;
    title: string;
    message: string;
    buttons: { text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }[];
}

const defaultSettings: GeneralSettings = {
    portraitColumns: 3,
    landscapeColumns: 7,
    chapterListSort: 'descending',
    interactiveUpdates: false,
    libraryAuth: false,
    historyAuth: false,
    hideUpdateModal: false,
    mangaPreviewEnabled: Platform.OS === 'ios', // Default: enabled on iOS, disabled on Android
};

export const GeneralSettingsScreen: React.FC = () => {
    const { theme } = useTheme();
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

    const [settings, setSettings] = useState<GeneralSettings>(defaultSettings);
    const [currentLang, setCurrentLang] = useState<LanguageCode>(getCurrentLanguage());
    const [dialog, setDialog] = useState<DialogState>({ visible: false, title: '', message: '', buttons: [] });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const saved = await AsyncStorage.getItem(SETTINGS_KEY);
            if (saved) {
                setSettings({ ...defaultSettings, ...JSON.parse(saved) });
            }
        } catch (e) {
            console.error('Failed to load settings:', e);
        }
    };

    const saveSettings = async (newSettings: GeneralSettings) => {
        try {
            await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
            setSettings(newSettings);
        } catch (e) {
            console.error('Failed to save settings:', e);
        }
    };

    const updateSetting = <K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) => {
        const newSettings = { ...settings, [key]: value };
        saveSettings(newSettings);
    };

    // Handle auth setting changes with biometric verification
    const handleAuthSettingChange = async (
        settingKey: 'libraryAuth' | 'historyAuth',
        newValue: boolean
    ) => {
        try {
            // Check if biometrics are available
            const hasHardware = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();

            if (hasHardware && isEnrolled) {
                // Require biometric verification before changing auth settings
                const result = await LocalAuthentication.authenticateAsync({
                    promptMessage: newValue
                        ? 'Verify to enable authentication'
                        : 'Verify to disable authentication',
                    fallbackLabel: 'Use passcode',
                    cancelLabel: 'Cancel',
                });

                if (result.success) {
                    updateSetting(settingKey, newValue);
                } else {
                    // Authentication failed or cancelled - don't change setting
                    setDialog({
                        visible: true,
                        title: 'Authentication Required',
                        message: 'You must verify your identity to change this security setting.',
                        buttons: [{ text: 'OK' }]
                    });
                }
            } else {
                // No biometrics available - show warning and allow change
                setDialog({
                    visible: true,
                    title: 'No Biometrics Available',
                    message: 'Biometric authentication is not set up on this device. The setting will be changed without verification.',
                    buttons: [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Continue',
                            onPress: () => updateSetting(settingKey, newValue)
                        },
                    ]
                });
            }
        } catch (error) {
            console.error('Biometric auth error:', error);
            setDialog({
                visible: true,
                title: 'Error',
                message: 'Failed to verify identity. Please try again.',
                buttons: [{ text: 'OK' }]
            });
        }
    };


    const navigateToLanguageSettings = () => {
        navigation.navigate('LanguageSettings');
    };

    const renderStepper = (
        value: number,
        onIncrement: () => void,
        onDecrement: () => void
    ) => (
        <View style={styles.stepperContainer}>
            <TouchableOpacity
                style={[styles.stepperButton, { backgroundColor: '#333' }]}
                onPress={onDecrement}
            >
                <Ionicons name="remove" size={18} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.stepperDivider} />
            <TouchableOpacity
                style={[styles.stepperButton, { backgroundColor: '#333' }]}
                onPress={onIncrement}
            >
                <Ionicons name="add" size={18} color="#FFF" />
            </TouchableOpacity>
        </View>
    );

    const renderSectionHeader = (title: string) => (
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
            {title}
        </Text>
    );

    const renderFooter = (text: string) => (
        <Text style={[styles.footerText, { color: theme.textSecondary }]}>
            {text}
        </Text>
    );

    const renderItem = ({
        title,
        rightElement,
        value,
        onPress,
        disabled = false,
        showChevron = false,
        valueColor,
    }: {
        title: string;
        rightElement?: React.ReactNode;
        value?: string | number;
        onPress?: () => void;
        disabled?: boolean;
        showChevron?: boolean;
        valueColor?: string;
    }) => (
        <TouchableOpacity
            style={[
                styles.itemContainer,
                { borderBottomColor: theme.border },
                disabled && { opacity: 0.5 }
            ]}
            onPress={onPress}
            disabled={disabled || !onPress}
            activeOpacity={0.7}
        >
            <Text style={[styles.itemTitle, { color: theme.text }]}>{title}</Text>
            <View style={styles.rightContainer}>
                {value !== undefined && (
                    <Text style={[styles.itemValue, { color: valueColor || theme.textSecondary }]}>
                        {value}
                    </Text>
                )}
                {rightElement}
                {showChevron && (
                    <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} style={styles.chevron} />
                )}
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'} size={28} color={theme.primary} />
                    <Text style={[styles.backText, { color: theme.primary }]}>{t('generalSettings.backToSettings')}</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>{t('generalSettings.title')}</Text>
                <View style={{ width: 80 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

                {/* Language - Android only (iOS uses system settings) */}
                {Platform.OS === 'android' && (
                    <View style={styles.section}>
                        {renderSectionHeader(t('settings.language').toUpperCase())}
                        <View style={[styles.sectionContent, { backgroundColor: theme.card }]}>
                            {renderItem({
                                title: t('settings.language'),
                                value: SUPPORTED_LANGUAGES[currentLang].nativeName,
                                showChevron: true,
                                onPress: navigateToLanguageSettings
                            })}
                        </View>
                    </View>
                )}

                {/* Items Per Row */}
                <View style={styles.section}>
                    {renderSectionHeader(t('generalSettings.itemsPerRow'))}
                    <View style={[styles.sectionContent, { backgroundColor: theme.card }]}>
                        {renderItem({
                            title: t('generalSettings.portrait'),
                            value: settings.portraitColumns,
                            valueColor: theme.error,
                            rightElement: renderStepper(
                                settings.portraitColumns,
                                () => updateSetting('portraitColumns', settings.portraitColumns + 1),
                                () => updateSetting('portraitColumns', Math.max(1, settings.portraitColumns - 1))
                            )
                        })}
                        {renderItem({
                            title: t('generalSettings.landscape'),
                            value: settings.landscapeColumns,
                            valueColor: theme.error,
                            rightElement: renderStepper(
                                settings.landscapeColumns,
                                () => updateSetting('landscapeColumns', settings.landscapeColumns + 1),
                                () => updateSetting('landscapeColumns', Math.max(1, settings.landscapeColumns - 1))
                            )
                        })}
                    </View>
                    {settings.portraitColumns > 3 && (
                        <Text style={[styles.warningText, { color: '#FF9500' }]}>
                            {t('generalSettings.portraitWarning')}
                        </Text>
                    )}
                </View>

                {/* Chapter List Sort */}
                <View style={styles.section}>
                    {renderSectionHeader(t('generalSettings.chapterListSort'))}
                    <View style={[styles.sectionContent, { backgroundColor: theme.card }]}>
                        <NativeDropdown
                            options={[
                                { label: t('generalSettings.ascending'), value: 'ascending' },
                                { label: t('generalSettings.descending'), value: 'descending' },
                            ]}
                            selectedValue={settings.chapterListSort}
                            onSelect={(value) => updateSetting('chapterListSort', value as 'ascending' | 'descending')}
                            title={t('generalSettings.chapterSort')}
                        >
                            <View style={[styles.itemContainer, { borderBottomColor: theme.border }]}>
                                <Text style={[styles.itemTitle, { color: theme.text }]}>
                                    {t('generalSettings.chapterSort')}
                                </Text>
                                <View style={styles.rightContainer}>
                                    <Text style={[styles.itemValue, { color: theme.textSecondary }]}>
                                        {settings.chapterListSort === 'ascending' ? t('generalSettings.ascending') : t('generalSettings.descending')}
                                    </Text>
                                    <Ionicons name="chevron-expand" size={20} color={theme.textSecondary} />
                                </View>
                            </View>
                        </NativeDropdown>
                    </View>
                </View>

                {/* Content Filtering */}
                <View style={styles.section}>
                    {renderSectionHeader(t('generalSettings.contentFiltering'))}
                    <View style={[styles.sectionContent, { backgroundColor: theme.card }]}>
                        {renderItem({
                            title: t('generalSettings.contentUnavailable'),
                            disabled: true
                        })}
                    </View>
                    {renderFooter(t('generalSettings.contentFilteringHint'))}
                </View>

                {/* Interactive Update Checking */}
                <View style={styles.section}>
                    {renderSectionHeader(t('generalSettings.interactiveUpdates'))}
                    <View style={[styles.sectionContent, { backgroundColor: theme.card }]}>
                        {renderItem({
                            title: t('generalSettings.interactiveUpdatesTitle'),
                            rightElement: (
                                <Switch
                                    value={settings.interactiveUpdates}
                                    onValueChange={(value) => updateSetting('interactiveUpdates', value)}
                                    trackColor={{ false: theme.border, true: theme.success }}
                                    thumbColor={'#FFFFFF'}
                                />
                            )
                        })}
                    </View>
                    {renderFooter(t('generalSettings.interactiveUpdatesHint'))}
                </View>

                {/* Security */}
                <View style={styles.section}>
                    {renderSectionHeader(t('generalSettings.security'))}
                    <View style={[styles.sectionContent, { backgroundColor: theme.card }]}>
                        {renderItem({
                            title: t('generalSettings.libraryAuth'),
                            rightElement: (
                                <Switch
                                    value={settings.libraryAuth}
                                    onValueChange={(value) => handleAuthSettingChange('libraryAuth', value)}
                                    trackColor={{ false: theme.border, true: theme.success }}
                                    thumbColor={'#FFFFFF'}
                                />
                            )
                        })}
                        {renderItem({
                            title: t('generalSettings.historyAuth'),
                            rightElement: (
                                <Switch
                                    value={settings.historyAuth}
                                    onValueChange={(value) => handleAuthSettingChange('historyAuth', value)}
                                    trackColor={{ false: theme.border, true: theme.success }}
                                    thumbColor={'#FFFFFF'}
                                />
                            )
                        })}
                    </View>
                    {renderFooter(t('generalSettings.securityHint'))}
                </View>

                {/* Update Checking */}
                <View style={styles.section}>
                    {renderSectionHeader(t('generalSettings.updateChecking'))}
                    <View style={[styles.sectionContent, { backgroundColor: theme.card }]}>
                        {renderItem({
                            title: t('generalSettings.hideUpdateModal'),
                            rightElement: (
                                <Switch
                                    value={settings.hideUpdateModal}
                                    onValueChange={(value) => updateSetting('hideUpdateModal', value)}
                                    trackColor={{ false: theme.border, true: theme.success }}
                                    thumbColor={'#FFFFFF'}
                                />
                            )
                        })}
                    </View>
                    {renderFooter(t('generalSettings.updateCheckingHint'))}
                </View>

                {/* Manga Preview */}
                <View style={styles.section}>
                    {renderSectionHeader(t('generalSettings.mangaPreview'))}
                    <View style={[styles.sectionContent, { backgroundColor: theme.card }]}>
                        {renderItem({
                            title: Platform.OS === 'android' ? t('generalSettings.previewExperimental') : t('generalSettings.previewOnLongPress'),
                            rightElement: (
                                <Switch
                                    value={settings.mangaPreviewEnabled}
                                    onValueChange={(value) => updateSetting('mangaPreviewEnabled', value)}
                                    trackColor={{ false: theme.border, true: theme.success }}
                                    thumbColor={'#FFFFFF'}
                                />
                            )
                        })}
                    </View>
                    {renderFooter(Platform.OS === 'android'
                        ? t('generalSettings.mangaPreviewHintAndroid')
                        : t('generalSettings.mangaPreviewHint'))}
                </View>

            </ScrollView>


            {/* Custom styled dialog */}
            <AppDialog
                visible={dialog.visible}
                title={dialog.title}
                message={dialog.message}
                buttons={dialog.buttons}
                onDismiss={() => setDialog({ ...dialog, visible: false })}
            />
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
        paddingHorizontal: 8,
        paddingTop: 50,
        paddingBottom: 12,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 80,
    },
    backText: {
        fontSize: 17,
        marginLeft: -4,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    content: {
        paddingBottom: 40,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        marginLeft: 16,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    sectionContent: {
        marginHorizontal: 16,
        borderRadius: 10,
        overflow: 'hidden',
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        minHeight: 44,
    },
    itemTitle: {
        fontSize: 17,
        flex: 1,
    },
    rightContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    itemValue: {
        fontSize: 17,
    },
    chevron: {
        opacity: 0.5,
    },
    footerText: {
        fontSize: 13,
        marginHorizontal: 16,
        marginTop: 8,
        lineHeight: 18,
    },
    stepperContainer: {
        flexDirection: 'row',
        backgroundColor: '#333',
        borderRadius: 8,
        overflow: 'hidden',
    },
    stepperButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepperDivider: {
        width: 1,
        backgroundColor: '#000',
    },
    warningText: {
        fontSize: 13,
        marginHorizontal: 16,
        marginTop: 8,
        lineHeight: 18,
    },
});
