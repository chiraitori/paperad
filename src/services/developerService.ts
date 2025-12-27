/**
 * Developer Settings Service
 * Manages debug options and developer preferences
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const DEVELOPER_SETTINGS_KEY = '@developer_settings';

export interface DeveloperSettings {
  debugMode: boolean;
  verboseLogging: boolean;
  networkInspector: boolean;
  showMemoryUsage: boolean;
  showFpsCounter: boolean;
  customApiEndpoint: string;
  enableTestAds: boolean;
}

const DEFAULT_SETTINGS: DeveloperSettings = {
  debugMode: false,
  verboseLogging: false,
  networkInspector: false,
  showMemoryUsage: false,
  showFpsCounter: false,
  customApiEndpoint: '',
  enableTestAds: false,
};

// In-memory cache for quick access
let cachedSettings: DeveloperSettings | null = null;

/**
 * Load developer settings from storage
 */
export const getDeveloperSettings = async (): Promise<DeveloperSettings> => {
  try {
    const stored = await AsyncStorage.getItem(DEVELOPER_SETTINGS_KEY);
    if (stored) {
      cachedSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      return cachedSettings!;
    }
  } catch (error) {
    console.error('Failed to load developer settings:', error);
  }
  cachedSettings = DEFAULT_SETTINGS;
  return DEFAULT_SETTINGS;
};

/**
 * Save developer settings to storage (partial update)
 */
export const saveDeveloperSettings = async (settings: Partial<DeveloperSettings>): Promise<void> => {
  try {
    const current = cachedSettings || DEFAULT_SETTINGS;
    cachedSettings = { ...current, ...settings };
    await AsyncStorage.setItem(DEVELOPER_SETTINGS_KEY, JSON.stringify(cachedSettings));
  } catch (error) {
    console.error('Failed to save developer settings:', error);
  }
};

/**
 * Get cached settings (synchronous)
 */
export const getCachedSettings = (): DeveloperSettings => {
  return cachedSettings || DEFAULT_SETTINGS;
};

/**
 * Check if debug mode is enabled
 */
export const isDebugMode = (): boolean => {
  return cachedSettings?.debugMode || false;
};

/**
 * Check if verbose logging is enabled
 */
export const isVerboseLogging = (): boolean => {
  return cachedSettings?.verboseLogging || false;
};

/**
 * Debug log - only logs when debug mode is enabled
 */
export const debugLog = (...args: any[]) => {
  if (isDebugMode()) {
    console.log('[DEBUG]', ...args);
  }
};

/**
 * Verbose log - only logs when verbose logging is enabled
 */
export const verboseLog = (...args: any[]) => {
  if (isVerboseLogging()) {
    console.log('[VERBOSE]', ...args);
  }
};

// Network request log storage for inspector
const networkLogs: NetworkLogEntry[] = [];
const MAX_NETWORK_LOGS = 100;

export interface NetworkLogEntry {
  id: string;
  timestamp: number;
  method: string;
  url: string;
  status?: number;
  duration?: number;
  error?: string;
}

/**
 * Log a network request
 */
export const logNetworkRequest = (entry: Omit<NetworkLogEntry, 'id' | 'timestamp'>): string => {
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const logEntry: NetworkLogEntry = {
    ...entry,
    id,
    timestamp: Date.now(),
  };

  networkLogs.unshift(logEntry);

  // Keep only last N logs
  if (networkLogs.length > MAX_NETWORK_LOGS) {
    networkLogs.pop();
  }

  if (cachedSettings?.networkInspector) {
    console.log('[NETWORK]', entry.method, entry.url, entry.status || 'pending');
  }

  return id;
};

/**
 * Update network log entry (e.g., when response is received)
 */
export const updateNetworkLog = (id: string, updates: Partial<NetworkLogEntry>) => {
  const entry = networkLogs.find(log => log.id === id);
  if (entry) {
    Object.assign(entry, updates);
    if (cachedSettings?.networkInspector) {
      console.log('[NETWORK]', entry.method, entry.url, 'completed in', updates.duration, 'ms', 'status:', updates.status);
    }
  }
};

/**
 * Get all network logs
 */
export const getNetworkLogs = (): NetworkLogEntry[] => {
  return [...networkLogs];
};

/**
 * Clear network logs
 */
export const clearNetworkLogs = () => {
  networkLogs.length = 0;
};

// ===== Log Capture System =====
interface LogEntry {
  timestamp: string;
  level: 'log' | 'warn' | 'error';
  message: string;
}

const logs: LogEntry[] = [];
const MAX_LOGS = 500;
let logCaptureInitialized = false;

/**
 * Initialize console log capture
 */
export const initLogCapture = () => {
  if (logCaptureInitialized) return;
  logCaptureInitialized = true;

  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  console.log = (...args: any[]) => {
    addLog('log', args);
    originalLog.apply(console, args);
  };

  console.warn = (...args: any[]) => {
    addLog('warn', args);
    originalWarn.apply(console, args);
  };

  console.error = (...args: any[]) => {
    addLog('error', args);
    originalError.apply(console, args);
  };
};

const addLog = (level: LogEntry['level'], args: any[]) => {
  const message = args.map(arg =>
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(' ');

  logs.unshift({
    timestamp: new Date().toISOString(),
    level,
    message,
  });

  if (logs.length > MAX_LOGS) {
    logs.pop();
  }
};

/**
 * Get all captured logs
 */
export const getLogs = (): LogEntry[] => [...logs];

/**
 * Clear all captured logs
 */
export const clearLogs = () => {
  logs.length = 0;
};

/**
 * Get memory info (estimated)
 */
export const getMemoryInfo = (): { used: string; available: string } => {
  // React Native doesn't expose real memory info easily
  // This is a placeholder that would need native modules for real data
  return {
    used: 'N/A',
    available: 'N/A',
  };
};

/**
 * Get performance/device info
 */
export const getPerformanceInfo = async () => {
  return {
    deviceName: Constants.deviceName || 'Unknown Device',
    osVersion: `${Platform.OS} ${Platform.Version}`,
    appVersion: Constants.expoConfig?.version || '0.0.1',
    sdkVersion: Constants.expoConfig?.sdkVersion || 'Unknown',
  };
};