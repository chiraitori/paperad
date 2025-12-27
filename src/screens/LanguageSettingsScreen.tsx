import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Platform,
    Alert,
    StatusBar,
    Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { t, getCurrentLanguage, setLanguage, SUPPORTED_LANGUAGES, LanguageCode } from '../services/i18nService';
import { useDialog } from '../hooks';
import { AppDialog } from '../components';

export const LanguageSettingsScreen: React.FC = () => {
    const { theme } = useTheme();
    const navigation = useNavigation();
    const [currentLang, setCurrentLang] = useState<LanguageCode>(getCurrentLanguage());
    const { dialogVisible, dialogConfig, showDialog, hideDialog } = useDialog();

    const handleLanguageSelect = async (langCode: LanguageCode) => {
        if (langCode === currentLang) return;

        await setLanguage(langCode);
        setCurrentLang(langCode);
        showDialog(
            t('settings.languageChanged'),
            t('settings.restartRequired'),
            [{ text: t('common.ok') }]
        );
    };

    const handleOpenIOSSettings = () => {
        Alert.alert(
            t('settings.changeLanguageTitle'),
            t('settings.changeLanguageInstructions'),
            [
                { text: t('common.cancel'), style: 'cancel' },
                {
                    text: t('common.continue'),
                    onPress: () => Linking.openURL('app-settings:')
                },
            ]
        );
    };

    const languages = Object.entries(SUPPORTED_LANGUAGES) as [LanguageCode, typeof SUPPORTED_LANGUAGES[LanguageCode]][];

    // iOS: Show simplified view with redirect to Settings
    if (Platform.OS === 'ios') {
        return (
            <View style={[styles.container, { backgroundColor: theme.background }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="chevron-back" size={28} color={theme.primary} />
                        <Text style={[styles.backText, { color: theme.primary }]}>{t('settings.generalSettings')}</Text>
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>{t('settings.language')}</Text>
                    <View style={{ width: 120 }} />
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                    {/* iOS Language Setting Link */}
                    <TouchableOpacity
                        style={[styles.listContainer, { backgroundColor: theme.card }]}
                        onPress={handleOpenIOSSettings}
                    >
                        <View style={styles.languageItem}>
                            <View style={styles.languageInfo}>
                                <Text style={[styles.nativeName, { color: theme.text }]}>
                                    {t('settings.languageSetting')}
                                </Text>
                                <Text style={[styles.englishName, { color: theme.textSecondary }]}>
                                    {t('settings.openInSettings')}
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                        </View>
                    </TouchableOpacity>

                    <Text style={[styles.iosHint, { color: theme.textSecondary }]}>
                        {t('settings.iosLanguageHint')}
                    </Text>

                    <TouchableOpacity
                        style={[styles.contributeButton, { backgroundColor: theme.card, borderColor: theme.primary }]}
                        onPress={() => Linking.openURL('https://crowdin.com/project/paperand')}
                    >
                        <Ionicons name="globe-outline" size={20} color={theme.primary} />
                        <Text style={[styles.contributeText, { color: theme.primary }]}>
                            {t('settings.contribute')}
                        </Text>
                        <Ionicons name="open-outline" size={16} color={theme.primary} />
                    </TouchableOpacity>
                </ScrollView>
            </View>
        );
    }

    // Android: Show full language list
    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={28} color={theme.primary} />
                    <Text style={[styles.backText, { color: theme.primary }]}>{t('settings.generalSettings')}</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>{t('settings.language')}</Text>
                <View style={{ width: 120 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                <View style={[styles.listContainer, { backgroundColor: theme.card }]}>
                    {languages.map(([code, lang], index) => (
                        <TouchableOpacity
                            key={code}
                            style={[
                                styles.languageItem,
                                index < languages.length - 1 && {
                                    borderBottomColor: theme.border,
                                    borderBottomWidth: StyleSheet.hairlineWidth
                                }
                            ]}
                            onPress={() => handleLanguageSelect(code)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.languageInfo}>
                                <Text style={[styles.nativeName, { color: theme.text }]}>
                                    {lang.nativeName}
                                </Text>
                                <Text style={[styles.englishName, { color: theme.textSecondary }]}>
                                    {lang.name}
                                </Text>
                            </View>
                            {currentLang === code && (
                                <Ionicons name="checkmark" size={24} color={theme.primary} />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity
                    style={[styles.contributeButton, { backgroundColor: theme.card, borderColor: theme.primary }]}
                    onPress={() => Linking.openURL('https://crowdin.com/project/paperand')}
                >
                    <Ionicons name="globe-outline" size={20} color={theme.primary} />
                    <Text style={[styles.contributeText, { color: theme.primary }]}>
                        {t('settings.contribute')}
                    </Text>
                    <Ionicons name="open-outline" size={16} color={theme.primary} />
                </TouchableOpacity>
            </ScrollView>

            {/* Material You Dialog for Android */}
            <AppDialog
                visible={dialogVisible}
                title={dialogConfig.title}
                message={dialogConfig.message}
                buttons={dialogConfig.buttons}
                onDismiss={hideDialog}
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
        paddingTop: Platform.OS === 'ios' ? 60 : (StatusBar.currentHeight || 24) + 16,
        paddingBottom: 16,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        minWidth: 120,
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
        paddingHorizontal: 16,
        paddingBottom: 100,
    },
    listContainer: {
        borderRadius: 10,
        overflow: 'hidden',
    },
    languageItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        minHeight: 60,
    },
    languageInfo: {
        flex: 1,
    },
    nativeName: {
        fontSize: 17,
        fontWeight: '400',
    },
    englishName: {
        fontSize: 13,
        marginTop: 2,
    },
    iosHint: {
        fontSize: 13,
        marginTop: 12,
        marginHorizontal: 16,
        lineHeight: 18,
    },
    contributeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 10,
        marginTop: 20,
        borderWidth: 1,
        gap: 8,
    },
    contributeText: {
        fontSize: 16,
        fontWeight: '600',
    },
});

