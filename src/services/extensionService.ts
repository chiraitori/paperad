// Extension Repository Types
export interface ExtensionSource {
  id: string;
  name: string;
  author: string;
  desc: string;
  website: string;
  contentRating: 'EVERYONE' | 'MATURE' | 'ADULT';
  version: string;
  icon: string;
  tags: ExtensionTag[];
  websiteBaseURL: string;
  intents: number;
}

export interface ExtensionTag {
  text: string;
  type: 'default' | 'info' | 'success' | 'warning' | 'danger';
}

export interface ExtensionRepository {
  id: string;
  name: string;
  baseUrl: string;
  icon?: string;
}

export interface VersioningResponse {
  buildTime: string;
  sources: ExtensionSource[];
  builtWith: {
    toolchain: string;
    types: string;
  };
}

// Default repositories - known repository URLs
export const DEFAULT_REPOSITORIES: ExtensionRepository[] = [];

// API Functions
export const fetchRepositoryVersioning = async (baseUrl: string): Promise<VersioningResponse | null> => {
  try {
    const response = await fetch(`${baseUrl}/versioning.json`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Failed to fetch from ${baseUrl}:`, error);
    return null;
  }
};

export const fetchAllExtensions = async (repositories: ExtensionRepository[]): Promise<Map<string, ExtensionSource[]>> => {
  const extensionsMap = new Map<string, ExtensionSource[]>();
  
  await Promise.all(
    repositories.map(async (repo) => {
      const versioning = await fetchRepositoryVersioning(repo.baseUrl);
      if (versioning && versioning.sources) {
        extensionsMap.set(repo.id, versioning.sources);
      }
    })
  );
  
  return extensionsMap;
};

// Tag color mapping
export const getTagColor = (type: ExtensionTag['type']): { bg: string; text: string } => {
  switch (type) {
    case 'warning':
      return { bg: '#FFD60A', text: '#000000' };
    case 'danger':
      return { bg: '#FF453A', text: '#FFFFFF' };
    case 'success':
      return { bg: '#32D74B', text: '#FFFFFF' };
    case 'info':
      return { bg: '#007AFF', text: '#FFFFFF' };
    default:
      return { bg: '#636366', text: '#FFFFFF' };
  }
};
