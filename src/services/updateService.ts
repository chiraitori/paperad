import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as IntentLauncher from 'expo-intent-launcher';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// GitHub repository configuration
const GITHUB_OWNER = 'chiraitori';
const GITHUB_REPO = 'paperand';
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`;

// Storage keys
const STORAGE_KEYS = {
  LAST_CHECK_TIME: '@update_last_check',
  SKIPPED_VERSION: '@update_skipped_version',
};

// Debug mode - set to true to test update modal with mock data
const DEBUG_FORCE_UPDATE = false; // Set to true for testing with mock data

// Check interval in milliseconds (24 hours)
const CHECK_INTERVAL = 24 * 60 * 60 * 1000;

export interface ReleaseInfo {
  version: string;
  tagName: string;
  releaseNotes: string;
  publishedAt: string;
  htmlUrl: string;
  downloadUrl: string | null;
  apkDownloadUrl: string | null;
  apkSize: number | null;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestRelease: ReleaseInfo | null;
  error: string | null;
}

/**
 * Get the current app version from expo config
 */
export const getCurrentVersion = (): string => {
  return Constants.expoConfig?.version || '0.0.0';
};

/**
 * Compare two semantic version strings
 * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
 */
export const compareVersions = (v1: string, v2: string): number => {
  // Remove any pre-release tags for comparison (e.g., -rc, -beta)
  const cleanVersion = (v: string) => v.replace(/-.*$/, '');
  
  const parts1 = cleanVersion(v1).split('.').map(Number);
  const parts2 = cleanVersion(v2).split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  
  // If base versions are equal, check pre-release tags
  // Release version (no tag) > pre-release version (with tag)
  const hasTag1 = v1.includes('-');
  const hasTag2 = v2.includes('-');
  
  if (!hasTag1 && hasTag2) return 1;
  if (hasTag1 && !hasTag2) return -1;
  
  return 0;
};

/**
 * Parse GitHub release data to extract relevant information
 */
const parseReleaseData = (data: any): ReleaseInfo => {
  // Find APK download URL from assets
  let apkDownloadUrl: string | null = null;
  let apkSize: number | null = null;
  
  if (data.assets && Array.isArray(data.assets)) {
    const apkAsset = data.assets.find(
      (asset: any) => asset.name?.endsWith('.apk')
    );
    if (apkAsset) {
      apkDownloadUrl = apkAsset.browser_download_url;
      apkSize = apkAsset.size;
    }
  }
  
  // Clean up release notes - remove HTML tags and extract meaningful content
  let releaseNotes = data.body || 'No release notes available.';
  releaseNotes = cleanReleaseNotes(releaseNotes);
  
  return {
    version: data.tag_name?.replace(/^v/, '') || data.name || 'Unknown',
    tagName: data.tag_name || '',
    releaseNotes,
    publishedAt: data.published_at || '',
    htmlUrl: data.html_url || '',
    downloadUrl: data.html_url || null,
    apkDownloadUrl,
    apkSize,
  };
};

/**
 * Clean up release notes by removing HTML tags and extracting key sections
 */
const cleanReleaseNotes = (notes: string): string => {
  // Remove HTML tags like <div>, <img>, etc.
  let cleaned = notes.replace(/<[^>]*>/g, '');
  
  // Remove markdown image syntax ![alt](url)
  cleaned = cleaned.replace(/!\[[^\]]*\]\([^)]*\)/g, '');
  
  // Remove markdown link syntax but keep text [text](url) -> text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  
  // Remove horizontal rules
  cleaned = cleaned.replace(/^---+$/gm, '');
  
  // Remove excessive whitespace and empty lines
  cleaned = cleaned.replace(/\r\n/g, '\n');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // Try to extract "What's New" section
  const whatsNewMatch = cleaned.match(/##\s*✨\s*What's New([\s\S]*?)(?=##|$)/i) ||
                        cleaned.match(/##\s*What's New([\s\S]*?)(?=##|$)/i);
  
  if (whatsNewMatch) {
    let whatsNew = whatsNewMatch[1].trim();
    // Clean up the extracted section and limit to 5 items
    const items = whatsNew.split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('|') && line.startsWith('-'))
      .slice(0, 5); // Only show first 5 items
    
    if (items.length > 0) {
      return items.join('\n'); // Don't include heading, modal already has one
    }
  }
  
  // Fallback: just clean up and return first meaningful content
  const lines = cleaned.split('\n')
    .map(line => line.trim())
    .filter(line => {
      // Skip empty lines, single characters, badges, and table rows
      if (!line || line.length < 3) return false;
      if (line.startsWith('|')) return false;
      if (line.match(/^#+\s*$/)) return false;
      return true;
    });
  
  return lines.slice(0, 8).join('\n').trim() || 'New version available!';
};

/**
 * Fetch the latest release information from GitHub
 */
export const fetchLatestRelease = async (): Promise<ReleaseInfo | null> => {
  try {
    const response = await fetch(GITHUB_API_URL, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Paperand-App',
      },
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log('No releases found on GitHub');
        return null;
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }
    
    const data = await response.json();
    return parseReleaseData(data);
  } catch (error) {
    console.error('Error fetching latest release:', error);
    throw error;
  }
};

/**
 * Check if enough time has passed since the last update check
 */
export const shouldCheckForUpdate = async (): Promise<boolean> => {
  try {
    const lastCheckStr = await AsyncStorage.getItem(STORAGE_KEYS.LAST_CHECK_TIME);
    if (!lastCheckStr) return true;
    
    const lastCheck = parseInt(lastCheckStr, 10);
    const now = Date.now();
    
    return now - lastCheck >= CHECK_INTERVAL;
  } catch (error) {
    console.error('Error checking update interval:', error);
    return true;
  }
};

/**
 * Mark the current time as the last update check time
 */
export const markUpdateChecked = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_CHECK_TIME, Date.now().toString());
  } catch (error) {
    console.error('Error marking update checked:', error);
  }
};

/**
 * Check if a version was previously skipped by the user
 */
export const isVersionSkipped = async (version: string): Promise<boolean> => {
  try {
    const skippedVersion = await AsyncStorage.getItem(STORAGE_KEYS.SKIPPED_VERSION);
    return skippedVersion === version;
  } catch (error) {
    console.error('Error checking skipped version:', error);
    return false;
  }
};

/**
 * Mark a version as skipped
 */
export const skipVersion = async (version: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SKIPPED_VERSION, version);
  } catch (error) {
    console.error('Error skipping version:', error);
  }
};

/**
 * Clear the skipped version (useful when user manually checks for updates)
 */
export const clearSkippedVersion = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.SKIPPED_VERSION);
  } catch (error) {
    console.error('Error clearing skipped version:', error);
  }
};

/**
 * Main function to check for updates
 */
export const checkForUpdate = async (force: boolean = false): Promise<UpdateCheckResult> => {
  const currentVersion = getCurrentVersion();
  console.log('Current app version:', currentVersion);
  
  // Debug mode: return mock update data
  if (DEBUG_FORCE_UPDATE) {
    const mockRelease: ReleaseInfo = {
      version: '1.0.0',
      tagName: 'v1.0.0',
      releaseNotes: `## What's New

- New update checker feature
- Improved performance
- Bug fixes and stability improvements

## Bug Fixes

- Fixed crash on startup
- Fixed image loading issues`,
      publishedAt: new Date().toISOString(),
      htmlUrl: 'https://github.com/chiraitori/paperand/releases/tag/v1.0.0',
      downloadUrl: 'https://github.com/chiraitori/paperand/releases/tag/v1.0.0',
      apkDownloadUrl: 'https://github.com/chiraitori/paperand/releases/download/v1.0.0/app-release.apk',
      apkSize: 25 * 1024 * 1024, // 25 MB mock size
    };
    return {
      hasUpdate: true,
      currentVersion,
      latestRelease: mockRelease,
      error: null,
    };
  }
  
  try {
    // Check if we should perform the check (unless forced)
    if (!force) {
      const shouldCheck = await shouldCheckForUpdate();
      if (!shouldCheck) {
        return {
          hasUpdate: false,
          currentVersion,
          latestRelease: null,
          error: null,
        };
      }
    }
    
    // Fetch the latest release
    const latestRelease = await fetchLatestRelease();
    
    // Mark that we checked
    await markUpdateChecked();
    
    if (!latestRelease) {
      return {
        hasUpdate: false,
        currentVersion,
        latestRelease: null,
        error: null,
      };
    }
    
    // Compare versions
    console.log('Comparing versions - GitHub:', latestRelease.version, 'vs App:', currentVersion);
    const comparison = compareVersions(latestRelease.version, currentVersion);
    console.log('Version comparison result:', comparison, '(1 = update available, 0 = same, -1 = older)');
    const hasUpdate = comparison > 0;
    
    // Check if this version was skipped (unless force check)
    if (hasUpdate && !force) {
      const isSkipped = await isVersionSkipped(latestRelease.version);
      if (isSkipped) {
        return {
          hasUpdate: false,
          currentVersion,
          latestRelease,
          error: null,
        };
      }
    }
    
    return {
      hasUpdate,
      currentVersion,
      latestRelease,
      error: null,
    };
  } catch (error) {
    return {
      hasUpdate: false,
      currentVersion,
      latestRelease: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

/**
 * Download progress callback type
 */
export type DownloadProgressCallback = (progress: number, downloadedBytes: number, totalBytes: number) => void;

/**
 * Download APK file for Android
 */
export const downloadApk = async (
  url: string,
  onProgress?: DownloadProgressCallback
): Promise<string | null> => {
  if (Platform.OS !== 'android') {
    console.log('APK download is only supported on Android');
    return null;
  }
  
  try {
    const fileName = 'paperand-update.apk';
    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
    
    // Delete existing file if present
    const fileInfo = await FileSystem.getInfoAsync(fileUri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(fileUri);
    }
    
    // Create download resumable with progress callback
    const downloadResumable = FileSystem.createDownloadResumable(
      url,
      fileUri,
      {},
      (downloadProgress) => {
        const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
        if (onProgress) {
          onProgress(
            progress,
            downloadProgress.totalBytesWritten,
            downloadProgress.totalBytesExpectedToWrite
          );
        }
      }
    );
    
    const result = await downloadResumable.downloadAsync();
    
    if (result?.uri) {
      return result.uri;
    }
    
    return null;
  } catch (error) {
    console.error('Error downloading APK:', error);
    throw error;
  }
};

/**
 * Install APK file on Android
 */
export const installApk = async (fileUri: string): Promise<void> => {
  if (Platform.OS !== 'android') {
    console.log('APK installation is only supported on Android');
    return;
  }
  
  try {
    // Convert file:// URI to content:// URI for Android
    const contentUri = await FileSystem.getContentUriAsync(fileUri);
    
    await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
      data: contentUri,
      flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
      type: 'application/vnd.android.package-archive',
    });
  } catch (error) {
    console.error('Error installing APK:', error);
    throw error;
  }
};

/**
 * Format bytes to human readable string
 */
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Check if automatic installation is available for the current platform
 */
export const canAutoInstall = (): boolean => {
  return Platform.OS === 'android';
};
