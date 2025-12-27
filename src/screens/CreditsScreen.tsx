import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Image,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { t } from '../services/i18nService';
import { useDialog } from '../hooks';
import { AppDialog } from '../components';

interface Contributor {
  name: string;
  role: string;
  github?: string;
  twitter?: string;
}

const CORE_TEAM: Contributor[] = [
  { name: 'Chiraitori', role: 'Lead Developer', github: 'chiraitori' },
];

const INSPIRATIONS: Contributor[] = [
  { name: 'Faizan Durrani', role: 'Paperback Lead Developer', github: 'FaizanDurrani' },
  { name: 'Lemon', role: 'Paperback Core Developer', github: 'lemontea' },
  { name: 'Netsky', role: 'Paperback Extensions Developer', github: 'Netsky' },
  { name: 'GameFuzzy', role: 'Paperback Extensions Developer', github: 'GameFuzzy' },
];

const SPECIAL_THANKS = [
  'The Paperback team for inspiration',
  'The Tachiyomi team for inspiration',
  'All contributors and testers',
];

export const CreditsScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { dialogVisible, dialogConfig, showDialog, hideDialog } = useDialog();

  const openGithub = (username: string) => {
    Linking.openURL(`https://github.com/${username}`);
  };

  const renderContributor = (contributor: Contributor, index: number) => (
    <TouchableOpacity
      key={index}
      style={[styles.contributorItem, { borderBottomColor: theme.border }]}
      onPress={() => contributor.github && openGithub(contributor.github)}
      activeOpacity={contributor.github ? 0.7 : 1}
    >
      <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
        <Text style={styles.avatarText}>{contributor.name[0]}</Text>
      </View>
      <View style={styles.contributorInfo}>
        <Text style={[styles.contributorName, { color: theme.text }]}>{contributor.name}</Text>
        <Text style={[styles.contributorRole, { color: theme.textSecondary }]}>{contributor.role}</Text>
      </View>
      {contributor.github && (
        <Ionicons name="logo-github" size={24} color={theme.textSecondary} />
      )}
    </TouchableOpacity>
  );

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{title}</Text>
      <View style={[styles.sectionContent, { backgroundColor: theme.card }]}>
        {children}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'} size={28} color={theme.primary} />
          <Ionicons name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'} size={28} color={theme.primary} />
          <Text style={[styles.backText, { color: theme.primary }]}>{t('settings.title')}</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t('credits.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* App Logo & Name */}
        <View style={styles.appInfo}>
          <View style={[styles.appIcon, { backgroundColor: theme.primary }]}>
            <Ionicons name="book" size={48} color="#FFF" />
          </View>
          <Text style={[styles.appName, { color: theme.text }]}>{t('more.appName')}</Text>
          <Text style={[styles.appTagline, { color: theme.textSecondary }]}>
            {t('credits.adFree')}
          </Text>
        </View>

        {/* Core Team */}
        {renderSection(
          t('credits.developer'),
          CORE_TEAM.map(renderContributor)
        )}

        {/* Inspirations */}
        {renderSection(
          t('credits.inspiredBy'),
          INSPIRATIONS.map(renderContributor)
        )}

        {/* Special Thanks */}
        {renderSection(
          t('credits.specialThanks'),
          SPECIAL_THANKS.map((thanks, index) => (
            <View
              key={index}
              style={[styles.thanksItem, { borderBottomColor: theme.border }]}
            >
              <Ionicons name="heart" size={18} color={theme.primary} style={styles.heartIcon} />
              <Text style={[styles.thanksText, { color: theme.text }]}>{thanks}</Text>
            </View>
          ))
        )}

        {/* Links */}
        {renderSection(
          t('credits.links'),
          <>
            <TouchableOpacity
              style={[styles.linkItem, { borderBottomColor: theme.border }]}
              onPress={() => Linking.openURL('https://github.com/chiraitori/paperand')}
            >
              <Ionicons name="logo-github" size={24} color={theme.text} />
              <Text style={[styles.linkText, { color: theme.text }]}>{t('more.github')}</Text>
              <Ionicons name="open-outline" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.linkItem, { borderBottomColor: theme.border }]}
              onPress={() => showDialog(t('credits.discordAlert'), t('credits.discordMessage'))}
            >
              <Ionicons name="logo-discord" size={24} color={theme.text} />
              <Text style={[styles.linkText, { color: theme.text }]}>{t('credits.discord')}</Text>
              <Ionicons name="open-outline" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          </>
        )}

        <Text style={[styles.copyright, { color: theme.textSecondary }]}>
          {t('credits.madeWith')}
        </Text>
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
    paddingTop: 50,
    paddingBottom: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backText: {
    fontSize: 17,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSpacer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  appIcon: {
    width: 100,
    height: 100,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  appTagline: {
    fontSize: 16,
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
  contributorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  contributorInfo: {
    flex: 1,
  },
  contributorName: {
    fontSize: 17,
    fontWeight: '500',
  },
  contributorRole: {
    fontSize: 14,
    marginTop: 2,
  },
  thanksItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  heartIcon: {
    marginRight: 12,
  },
  thanksText: {
    fontSize: 17,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  linkText: {
    fontSize: 17,
    flex: 1,
    marginLeft: 12,
  },
  copyright: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 16,
  },
});
