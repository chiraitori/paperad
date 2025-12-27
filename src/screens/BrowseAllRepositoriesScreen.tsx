import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { AppDialog } from '../components';
import { RootStackParamList } from '../types';
import {
  ExtensionSource,
  ExtensionRepository,
  DEFAULT_REPOSITORIES,
  fetchRepositoryVersioning,
  getTagColor,
} from '../services/extensionService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { t } from '../services/i18nService';

// Use same key as ExtensionsScreen for sync
const INSTALLED_EXTENSIONS_KEY = '@installed_extensions_data';
const ADDED_REPOS_KEY = '@added_repositories';

interface InstalledExtension extends ExtensionSource {
  repoId: string;
  repoBaseUrl: string;
  sourceJs?: string;
}

interface RepoExtensions {
  repo: ExtensionRepository;
  extensions: ExtensionSource[];
}

export const BrowseAllRepositoriesScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [repoExtensions, setRepoExtensions] = useState<RepoExtensions[]>([]);
  const [installedExtensions, setInstalledExtensions] = useState<InstalledExtension[]>([]);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  // Dialog state for Android Material You
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    title: string;
    message: string;
    buttons: Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }>;
  }>({ title: '', message: '', buttons: [] });

  // Derive installed IDs from full extension data
  const installedIds = new Set(installedExtensions.map(ext => ext.id));

  // Helper to show platform-appropriate dialog
  const showAppDialog = (
    title: string,
    message: string,
    buttons: Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }> = [{ text: 'OK' }]
  ) => {
    if (Platform.OS === 'ios') {
      Alert.alert(title, message, buttons);
    } else {
      setDialogConfig({ title, message, buttons });
      setDialogVisible(true);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);

    // Load installed extensions (full data)
    try {
      const stored = await AsyncStorage.getItem(INSTALLED_EXTENSIONS_KEY);
      if (stored) {
        const exts: InstalledExtension[] = JSON.parse(stored);
        setInstalledExtensions(exts);
      }
    } catch (error) {
      console.error('Error loading installed extensions:', error);
    }

    // Load added repositories only (not defaults)
    let repos: ExtensionRepository[] = [];
    try {
      const storedRepos = await AsyncStorage.getItem(ADDED_REPOS_KEY);
      if (storedRepos) {
        repos = JSON.parse(storedRepos);
      }
    } catch (error) {
      console.error('Error loading repos:', error);
    }

    // Fetch extensions from all repositories
    const results: RepoExtensions[] = [];
    await Promise.all(
      repos.map(async (repo) => {
        try {
          const versioning = await fetchRepositoryVersioning(repo.baseUrl);
          if (versioning && versioning.sources && versioning.sources.length > 0) {
            results.push({
              repo,
              extensions: versioning.sources,
            });
          }
        } catch (error) {
          console.error(`Error fetching from ${repo.name}:`, error);
        }
      })
    );

    // Sort by repo name
    results.sort((a, b) => a.repo.name.localeCompare(b.repo.name));
    setRepoExtensions(results);
    setLoading(false);
  };

  const handleInstall = async (ext: ExtensionSource, repoId: string, repoBaseUrl: string) => {
    setLoadingIds((prev) => new Set(prev).add(ext.id));

    try {
      // Download the extension's source.js
      const sourceUrl = `${repoBaseUrl}/${ext.id}/source.js`;
      console.log(`Downloading extension source from: ${sourceUrl}`);

      const sourceResponse = await fetch(sourceUrl);
      if (!sourceResponse.ok) {
        throw new Error(`Failed to download source.js: ${sourceResponse.status}`);
      }
      const sourceJs = await sourceResponse.text();

      // Create full extension data with repo info and source code
      const installedExt: InstalledExtension = {
        ...ext,
        repoId: repoId,
        repoBaseUrl: repoBaseUrl,
        sourceJs: sourceJs,
      };

      const newInstalled = [...installedExtensions, installedExt];
      setInstalledExtensions(newInstalled);

      // Save to storage
      await AsyncStorage.setItem(
        INSTALLED_EXTENSIONS_KEY,
        JSON.stringify(newInstalled)
      );

      showAppDialog(t('repositories.installSuccess'), t('repositories.installSuccessMessage', { name: ext.name }));
    } catch (error) {
      console.error('Error installing extension:', error);
      showAppDialog(t('common.error'), t('repositories.installErrorMessage', { name: ext.name, error: String(error) }));
    }

    setLoadingIds((prev) => {
      const next = new Set(prev);
      next.delete(ext.id);
      return next;
    });
  };

  const handleReload = async (ext: ExtensionSource) => {
    setLoadingIds((prev) => new Set(prev).add(ext.id));

    // Simulate reload delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setLoadingIds((prev) => {
      const next = new Set(prev);
      next.delete(ext.id);
      return next;
    });

    showAppDialog(t('repositories.reloaded'), t('repositories.reloadedMessage', { name: ext.name }));
  };

  const handleUninstall = async (ext: ExtensionSource) => {
    showAppDialog(
      t('repositories.uninstallTitle'),
      t('repositories.uninstallConfirm', { name: ext.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('repositories.uninstall'),
          style: 'destructive',
          onPress: async () => {
            const newInstalled = installedExtensions.filter(e => e.id !== ext.id);
            setInstalledExtensions(newInstalled);

            try {
              await AsyncStorage.setItem(
                INSTALLED_EXTENSIONS_KEY,
                JSON.stringify(newInstalled)
              );
            } catch (error) {
              console.error('Error saving installed extensions:', error);
            }
          },
        },
      ]
    );
  };

  const renderExtensionItem = (ext: ExtensionSource, repoId: string, repoBaseUrl: string) => {
    const isInstalled = installedIds.has(ext.id);
    const isLoading = loadingIds.has(ext.id);

    return (
      <View
        key={ext.id}
        style={[styles.extensionItem, { borderBottomColor: theme.border }]}
      >
        {/* Extension Icon */}
        <View style={[styles.iconContainer, { backgroundColor: '#2A2A2D' }]}>
          {ext.icon && repoBaseUrl ? (
            <Image
              source={{ uri: `${repoBaseUrl} / ${ext.id} / includes / ${ext.icon}` }}
              style={styles.iconImage}
              defaultSource={require('../../assets/icon.png')}
            />
          ) : (
            <Ionicons name="extension-puzzle" size={28} color="#FFF" />
          )}
        </View>

        {/* Extension Info */}
        <View style={styles.extensionContent}>
          <Text style={[styles.extensionName, { color: theme.text }]}>{ext.name}</Text>
          <Text style={[styles.extensionAuthor, { color: theme.textSecondary }]}>
            {ext.author} | {ext.version}
          </Text>
          <View style={styles.tagsRow}>
            {/* Action buttons */}
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#007AFF' }]}>
              <Ionicons name="list" size={12} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#5856D6' }]}>
              <Ionicons name="globe" size={12} color="#FFF" />
            </TouchableOpacity>
            {/* Tags */}
            {ext.tags?.map((tag, idx) => {
              const colors = getTagColor(tag.type);
              return (
                <View key={idx} style={[styles.tag, { backgroundColor: colors.bg }]}>
                  <Text style={[styles.tagText, { color: colors.text }]}>{tag.text}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Install/Reload Button */}
        <TouchableOpacity
          style={[
            styles.actionButton,
            {
              backgroundColor: isInstalled ? 'transparent' : theme.primary,
              borderWidth: isInstalled ? 1 : 0,
              borderColor: theme.primary,
            },
          ]}
          onPress={() => (isInstalled ? handleReload(ext) : handleInstall(ext, repoId, repoBaseUrl))}
          onLongPress={() => isInstalled && handleUninstall(ext)}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={isInstalled ? theme.primary : '#FFF'} />
          ) : (
            <Text
              style={[
                styles.actionButtonText,
                { color: isInstalled ? theme.primary : '#FFF' },
              ]}
            >
              {isInstalled ? t('repositories.reload') : t('repositories.get')}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'} size={28} color={theme.primary} />
          <Text style={[styles.backText, { color: theme.primary }]}>{t('repositories.browseAllTitle')}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            {t('repositories.loading')}
          </Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {repoExtensions.map(({ repo, extensions }) => (
            <View key={repo.id} style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                {repo.name.toUpperCase()}
              </Text>
              <View style={[styles.sectionContent, { backgroundColor: theme.card }]}>
                {extensions.map((ext) => renderExtensionItem(ext, repo.id, repo.baseUrl))}
              </View>
            </View>
          ))}

          {repoExtensions.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={48} color={theme.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                {t('repositories.noRepos')}
              </Text>
              <Text style={[styles.emptySubText, { color: theme.textSecondary }]}>
                {t('repositories.noReposHint')}
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Material You Dialog for Android */}
      <AppDialog
        visible={dialogVisible}
        title={dialogConfig.title}
        message={dialogConfig.message}
        buttons={dialogConfig.buttons}
        onDismiss={() => setDialogVisible(false)}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
  },
  content: {
    paddingBottom: 40,
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
  extensionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  iconImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  extensionContent: {
    flex: 1,
  },
  extensionName: {
    fontSize: 17,
    fontWeight: '500',
    marginBottom: 2,
  },
  extensionAuthor: {
    fontSize: 13,
    marginBottom: 6,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  actionBtn: {
    width: 22,
    height: 22,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  emptySubText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
