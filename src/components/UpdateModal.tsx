import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import {
  ReleaseInfo,
  downloadApk,
  installApk,
  skipVersion,
  formatBytes,
  canAutoInstall,
} from '../services/updateService';

interface UpdateModalProps {
  visible: boolean;
  currentVersion: string;
  releaseInfo: ReleaseInfo;
  onClose: () => void;
  onSkip: () => void;
}

type DownloadState = 'idle' | 'downloading' | 'downloaded' | 'installing' | 'error';

export const UpdateModal: React.FC<UpdateModalProps> = ({
  visible,
  currentVersion,
  releaseInfo,
  onClose,
  onSkip,
}) => {
  const { theme: colors } = useTheme();
  const [downloadState, setDownloadState] = useState<DownloadState>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [downloadedFileUri, setDownloadedFileUri] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSkip = useCallback(async () => {
    await skipVersion(releaseInfo.version);
    onSkip();
  }, [releaseInfo.version, onSkip]);

  const handleOpenInBrowser = useCallback(() => {
    if (releaseInfo.htmlUrl) {
      Linking.openURL(releaseInfo.htmlUrl);
    }
  }, [releaseInfo.htmlUrl]);

  const handleDownload = useCallback(async () => {
    if (!releaseInfo.apkDownloadUrl) {
      setErrorMessage('No APK download available');
      setDownloadState('error');
      return;
    }

    try {
      setDownloadState('downloading');
      setErrorMessage(null);
      setDownloadProgress(0);

      const fileUri = await downloadApk(
        releaseInfo.apkDownloadUrl,
        (progress, downloaded, total) => {
          setDownloadProgress(progress);
          setDownloadedBytes(downloaded);
          setTotalBytes(total);
        }
      );

      if (fileUri) {
        setDownloadedFileUri(fileUri);
        setDownloadState('downloaded');
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Download error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Download failed');
      setDownloadState('error');
    }
  }, [releaseInfo.apkDownloadUrl]);

  const handleInstall = useCallback(async () => {
    if (!downloadedFileUri) return;

    try {
      setDownloadState('installing');
      await installApk(downloadedFileUri);
      // Note: The app might be closed by the system during installation
    } catch (error) {
      console.error('Installation error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Installation failed');
      setDownloadState('error');
    }
  }, [downloadedFileUri]);

  const handleClose = useCallback(() => {
    // Reset state when closing
    setDownloadState('idle');
    setDownloadProgress(0);
    setDownloadedBytes(0);
    setTotalBytes(0);
    setDownloadedFileUri(null);
    setErrorMessage(null);
    onClose();
  }, [onClose]);

  const renderReleaseNotes = () => {
    // Simple markdown-like rendering for release notes
    const lines = releaseInfo.releaseNotes.split('\n');
    return lines.map((line, index) => {
      const trimmedLine = line.trim();
      
      // Heading
      if (trimmedLine.startsWith('## ')) {
        return (
          <Text key={index} style={[styles.releaseNotesHeading, { color: colors.text }]}>
            {trimmedLine.replace('## ', '')}
          </Text>
        );
      }
      
      // List item
      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        return (
          <Text key={index} style={[styles.releaseNotesItem, { color: colors.textSecondary }]}>
            • {trimmedLine.replace(/^[-*]\s/, '')}
          </Text>
        );
      }
      
      // Regular text
      if (trimmedLine) {
        return (
          <Text key={index} style={[styles.releaseNotesText, { color: colors.textSecondary }]}>
            {trimmedLine}
          </Text>
        );
      }
      
      // Empty line
      return <View key={index} style={styles.releaseNotesSpacer} />;
    });
  };

  const renderDownloadSection = () => {
    // iOS doesn't support auto-install
    if (Platform.OS === 'ios') {
      return (
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          onPress={handleOpenInBrowser}
        >
          <Ionicons name="open-outline" size={20} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>View on GitHub</Text>
        </TouchableOpacity>
      );
    }

    // Android with APK download
    if (!releaseInfo.apkDownloadUrl) {
      return (
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.primary }]}
          onPress={handleOpenInBrowser}
        >
          <Ionicons name="open-outline" size={20} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>View on GitHub</Text>
        </TouchableOpacity>
      );
    }

    switch (downloadState) {
      case 'idle':
        return (
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={handleDownload}
          >
            <Ionicons name="download-outline" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>
              Download APK {releaseInfo.apkSize ? `(${formatBytes(releaseInfo.apkSize)})` : ''}
            </Text>
          </TouchableOpacity>
        );

      case 'downloading':
        return (
          <View style={styles.downloadingContainer}>
            <View style={[styles.progressBarContainer, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressBar,
                  { backgroundColor: colors.primary, width: `${downloadProgress * 100}%` },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              Downloading... {Math.round(downloadProgress * 100)}%
              {totalBytes > 0 && ` (${formatBytes(downloadedBytes)} / ${formatBytes(totalBytes)})`}
            </Text>
          </View>
        );

      case 'downloaded':
        return (
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.success }]}
            onPress={handleInstall}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Install Update</Text>
          </TouchableOpacity>
        );

      case 'installing':
        return (
          <View style={[styles.primaryButton, { backgroundColor: colors.textSecondary }]}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Installing...</Text>
          </View>
        );

      case 'error':
        return (
          <View>
            <Text style={[styles.errorText, { color: colors.error }]}>
              {errorMessage || 'An error occurred'}
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={handleDownload}
            >
              <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Retry Download</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
              <Ionicons name="sparkles" size={32} color="#FFFFFF" />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Update Available!</Text>
            <Text style={[styles.versionInfo, { color: colors.textSecondary }]}>
              {currentVersion} → {releaseInfo.version}
            </Text>
          </View>

          {/* Release Notes */}
          <View style={[styles.releaseNotesContainer, { borderColor: colors.border }]}>
            <Text style={[styles.releaseNotesTitle, { color: colors.text }]}>
              What's New
            </Text>
            <ScrollView style={styles.releaseNotesScroll} showsVerticalScrollIndicator={false}>
              {renderReleaseNotes()}
            </ScrollView>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {renderDownloadSection()}

            <View style={styles.secondaryButtons}>
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.border }]}
                onPress={handleSkip}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>
                  Skip This Version
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.border }]}
                onPress={handleClose}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>
                  Later
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Platform Note for iOS */}
          {Platform.OS === 'ios' && (
            <Text style={[styles.platformNote, { color: colors.textSecondary }]}>
              Automatic installation is not available on iOS. Please download from the App Store or GitHub.
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    maxHeight: '80%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  versionInfo: {
    fontSize: 16,
  },
  releaseNotesContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    maxHeight: 200,
  },
  releaseNotesTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  releaseNotesScroll: {
    maxHeight: 140,
  },
  releaseNotesHeading: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  releaseNotesItem: {
    fontSize: 14,
    lineHeight: 22,
    paddingLeft: 8,
  },
  releaseNotesText: {
    fontSize: 14,
    lineHeight: 22,
  },
  releaseNotesSpacer: {
    height: 8,
  },
  buttonContainer: {
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  downloadingContainer: {
    padding: 16,
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  platformNote: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
});

export default UpdateModal;
