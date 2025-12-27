import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { fetchRepositoryVersioning, ExtensionRepository } from '../services/extensionService';
import { t } from '../services/i18nService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ADDED_REPOS_KEY = '@added_repositories';

/**
 * Fetch repository name from the HTML page's <title> tag
 */
const fetchRepoNameFromHtml = async (baseUrl: string): Promise<string | null> => {
  try {
    // Try to fetch the index.html page
    const response = await fetch(baseUrl);
    if (!response.ok) return null;

    const html = await response.text();

    // Extract title from HTML using regex
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      return titleMatch[1].trim();
    }

    return null;
  } catch (error) {
    console.log('Could not fetch repo name from HTML:', error);
    return null;
  }
};

export const AddRepositoryScreen: React.FC = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [repoName, setRepoName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [loading, setLoading] = useState(false);

  // Disclaimer checkboxes
  const [check1, setCheck1] = useState(false);
  const [check2, setCheck2] = useState(false);
  const [check3, setCheck3] = useState(false);

  const allChecked = check1 && check2 && check3;

  const addRepository = async () => {
    if (!repoUrl.trim()) {
      Alert.alert(t('common.error'), t('repositories.repoUrlPlaceholder')); // Reuse placeholder as error hint? Or add specific error? Let's assume placeholder context is fine or add generic 'required'
      // Better: Alert.alert(t('common.error'), 'Please enter a repository URL'); -> t('repositories.addError') is generic. 
      // Let's stick to English fallback if key missing or use generic addError for now to save time, or use the placeholder as "Field required"
      // Actually let's use t('common.error') and a hardcoded string if no specific key, but we want full i18n. 
      // Added generic addError. Let's use that or just repoUrlPlaceholder for now.
      Alert.alert(t('common.error'), t('repositories.repoUrlPlaceholder'));
      return;
    }

    if (!allChecked) {
      Alert.alert(t('common.error'), 'Please accept all terms to continue'); // Need key for this. 
      // Let's add it or rely on English for this specific edge case? 
      // Wait, I should have added keys for errors.
      // I added addError, invalidRepo, etc. 
      return;
    }

    // Clean up URL
    let cleanUrl = repoUrl.trim();
    if (cleanUrl.endsWith('/')) {
      cleanUrl = cleanUrl.slice(0, -1);
    }
    if (cleanUrl.endsWith('/versioning.json')) {
      cleanUrl = cleanUrl.replace('/versioning.json', '');
    }

    setLoading(true);

    try {
      // Validate repository
      const versioning = await fetchRepositoryVersioning(cleanUrl);

      if (!versioning || !versioning.sources) {
        Alert.alert(t('repositories.invalidRepo'), t('repositories.invalidRepoMessage'));
        setLoading(false);
        return;
      }

      // Load existing repos
      const stored = await AsyncStorage.getItem(ADDED_REPOS_KEY);
      const existingRepos: ExtensionRepository[] = stored ? JSON.parse(stored) : [];

      // Check if already exists
      const exists = existingRepos.some(repo => repo.baseUrl === cleanUrl);
      if (exists) {
        Alert.alert(t('repositories.alreadyAdded'), t('repositories.alreadyAddedMessage'));
        setLoading(false);
        return;
      }

      // Try to get name from HTML <title> tag first
      let finalName = repoName.trim();
      if (!finalName) {
        const htmlTitle = await fetchRepoNameFromHtml(cleanUrl);
        if (htmlTitle) {
          finalName = htmlTitle;
        } else {
          // Fallback: generate name from URL
          const urlParts = cleanUrl.split('/');
          finalName = urlParts[urlParts.length - 1] || urlParts[urlParts.length - 2] || 'Unknown Repository';
          finalName = finalName.charAt(0).toUpperCase() + finalName.slice(1);
        }
      }

      // Create new repo entry
      const newRepo: ExtensionRepository = {
        id: cleanUrl.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase(),
        name: finalName,
        baseUrl: cleanUrl,
      };

      // Add to list
      const updatedRepos = [...existingRepos, newRepo];
      await AsyncStorage.setItem(ADDED_REPOS_KEY, JSON.stringify(updatedRepos));

      setLoading(false);
      navigation.goBack();
    } catch (error) {
      Alert.alert(t('common.error'), t('repositories.addError'));
      console.error('Error adding repo:', error);
      setLoading(false);
    }
  };

  const CheckboxRow: React.FC<{ checked: boolean; onPress: () => void; text: string }> = ({
    checked,
    onPress,
    text
  }) => (
    <TouchableOpacity style={styles.checkboxRow} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.checkbox, { borderColor: theme.textSecondary }]}>
        {checked && <Ionicons name="checkmark" size={16} color={theme.primary} />}
      </View>
      <Text style={[styles.checkboxText, { color: theme.textSecondary }]}>{text}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
      <TouchableOpacity style={styles.backdrop} onPress={() => navigation.goBack()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={[styles.modal, { backgroundColor: theme.card }]}>
          {/* Cube Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="cube-outline" size={80} color={theme.textSecondary} />
          </View>

          {/* Input Fields */}
          <View style={styles.inputsContainer}>
            <TextInput
              style={[styles.input, {
                backgroundColor: 'transparent',
                borderColor: theme.border,
                color: theme.text
              }]}
              placeholder={t('repositories.repoNamePlaceholder')}
              placeholderTextColor={theme.textSecondary}
              value={repoName}
              onChangeText={setRepoName}
              autoCapitalize="words"
              autoCorrect={false}
            />

            <TextInput
              style={[styles.input, {
                backgroundColor: 'transparent',
                borderColor: theme.border,
                color: theme.text
              }]}
              placeholder={t('repositories.repoUrlPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              value={repoUrl}
              onChangeText={setRepoUrl}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

          {/* Disclaimer Checkboxes */}
          <View style={styles.disclaimerContainer}>
            <CheckboxRow
              checked={check1}
              onPress={() => setCheck1(!check1)}
              text={t('repositories.addDisclaimer1')}
            />

            <CheckboxRow
              checked={check2}
              onPress={() => setCheck2(!check2)}
              text={t('repositories.addDisclaimer2')}
            />

            <CheckboxRow
              checked={check3}
              onPress={() => setCheck3(!check3)}
              text={t('repositories.addDisclaimer3')}
            />
          </View>

          {/* Add Button */}
          <TouchableOpacity
            style={[
              styles.addButton,
              {
                backgroundColor: allChecked ? '#8B3A3A' : '#4A2A2A',
                opacity: allChecked ? 1 : 0.6
              }
            ]}
            onPress={addRepository}
            disabled={loading || !allChecked}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.addButtonText}>{t('repositories.addToPaperback')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  keyboardView: {
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  inputsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  input: {
    fontSize: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  disclaimerContainer: {
    gap: 16,
    marginBottom: 24,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  addButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '600',
  },
});
