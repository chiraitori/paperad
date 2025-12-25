import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
    Platform,
    ActionSheetIOS,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { PickerModal } from '../components/PickerModal';

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
    const navigation = useNavigation();

    const [settings, setSettings] = useState<GeneralSettings>(defaultSettings);
    const [showSortPicker, setShowSortPicker] = useState(false);

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

    const showSortOptions = () => {
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: ['Cancel', 'Ascending', 'Descending'],
                    cancelButtonIndex: 0,
                },
                (buttonIndex) => {
                    if (buttonIndex === 1) updateSetting('chapterListSort', 'ascending');
                    if (buttonIndex === 2) updateSetting('chapterListSort', 'descending');
                }
            );
        } else {
            setShowSortPicker(true);
        }
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
                    <Text style={[styles.backText, { color: theme.primary }]}>Settings</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>General Settings</Text>
                <View style={{ width: 80 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>

                {/* Items Per Row */}
                <View style={styles.section}>
                    {renderSectionHeader('ITEMS PER ROW')}
                    <View style={[styles.sectionContent, { backgroundColor: theme.card }]}>
                        {renderItem({
                            title: 'Portrait',
                            value: settings.portraitColumns,
                            valueColor: theme.error,
                            rightElement: renderStepper(
                                settings.portraitColumns,
                                () => updateSetting('portraitColumns', settings.portraitColumns + 1),
                                () => updateSetting('portraitColumns', Math.max(1, settings.portraitColumns - 1))
                            )
                        })}
                        {renderItem({
                            title: 'Landscape',
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
                            ⚠️ More than 3 columns in portrait mode may make covers too small on phones
                        </Text>
                    )}
                </View>

                {/* Chapter List Sort */}
                <View style={styles.section}>
                    {renderSectionHeader('CHAPTER LIST SORT')}
                    <View style={[styles.sectionContent, { backgroundColor: theme.card }]}>
                        {renderItem({
                            title: 'Chapter List Sort',
                            value: settings.chapterListSort === 'ascending' ? 'Ascending' : 'Descending',
                            showChevron: true,
                            onPress: showSortOptions
                        })}
                    </View>
                </View>

                {/* Content Filtering */}
                <View style={styles.section}>
                    {renderSectionHeader('CONTENT FILTERING')}
                    <View style={[styles.sectionContent, { backgroundColor: theme.card }]}>
                        {renderItem({
                            title: 'Content Settings Unavailable',
                            disabled: true
                        })}
                    </View>
                    {renderFooter('Manage content filtering on your Paperback account')}
                </View>

                {/* Interactive Update Checking */}
                <View style={styles.section}>
                    {renderSectionHeader('INTERACTIVE UPDATE CHECKING')}
                    <View style={[styles.sectionContent, { backgroundColor: theme.card }]}>
                        {renderItem({
                            title: 'Interactive Updates',
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
                    {renderFooter('Run the updater in the background to allow browsing the app normally (STILL REQUIRES THE APP TO BE OPEN).\n\nNOTE: This creates a new instance of the source in order to bypass request manager saturation. This might break sources which store in-memory data per their lifecycle.')}
                </View>

                {/* Security */}
                <View style={styles.section}>
                    {renderSectionHeader('SECURITY')}
                    <View style={[styles.sectionContent, { backgroundColor: theme.card }]}>
                        {renderItem({
                            title: 'Library Requires Authentication',
                            rightElement: (
                                <Switch
                                    value={settings.libraryAuth}
                                    onValueChange={(value) => updateSetting('libraryAuth', value)}
                                    trackColor={{ false: theme.border, true: theme.success }}
                                    thumbColor={'#FFFFFF'}
                                />
                            )
                        })}
                        {renderItem({
                            title: 'History Requires Authentication',
                            rightElement: (
                                <Switch
                                    value={settings.historyAuth}
                                    onValueChange={(value) => updateSetting('historyAuth', value)}
                                    trackColor={{ false: theme.border, true: theme.success }}
                                    thumbColor={'#FFFFFF'}
                                />
                            )
                        })}
                    </View>
                    {renderFooter('Ask for Pin/TouchID/FaceID when opening Library or History')}
                </View>

                {/* Update Checking */}
                <View style={styles.section}>
                    {renderSectionHeader('UPDATE CHECKING')}
                    <View style={[styles.sectionContent, { backgroundColor: theme.card }]}>
                        {renderItem({
                            title: 'Hide Update Modal',
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
                    {renderFooter('When enabled, the app will not show update notifications on startup')}
                </View>

                {/* Manga Preview */}
                <View style={styles.section}>
                    {renderSectionHeader('MANGA PREVIEW')}
                    <View style={[styles.sectionContent, { backgroundColor: theme.card }]}>
                        {renderItem({
                            title: Platform.OS === 'android' ? 'Preview on Long Press (Experimental)' : 'Preview on Long Press',
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
                        ? '⚡ EXPERIMENTAL: Long press on manga cards to preview details. This feature is experimental on Android.'
                        : 'Long press on manga cards to preview details, chapters, and actions without navigating away.')}
                </View>

            </ScrollView>

            {/* Sort Picker Modal (Android) */}
            <PickerModal
                visible={showSortPicker}
                onClose={() => setShowSortPicker(false)}
                title="Chapter List Sort"
                options={[
                    { label: 'Ascending', value: 'ascending' },
                    { label: 'Descending', value: 'descending' },
                ]}
                selectedValue={settings.chapterListSort}
                onSelect={(value) => {
                    updateSetting('chapterListSort', value as 'ascending' | 'descending');
                    setShowSortPicker(false);
                }}
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
