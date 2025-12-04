# Paperand - Ad-Free Manga Reader 📚

An elegant, ad-free manga reader built with Expo and React Native. Compatible with Paperback extensions.

[![Build and Release](https://github.com/chiraitori/paperand/actions/workflows/build.yml/badge.svg)](https://github.com/chiraitori/paperand/actions/workflows/build.yml)
[![Latest Release](https://img.shields.io/github/v/release/chiraitori/paperand?include_prereleases)](https://github.com/chiraitori/paperand/releases)

## Download

Get the latest release from the [Releases page](https://github.com/chiraitori/paperand/releases):

- **Android**: Download `.apk` file and install
- **iOS**: Download `.ipa` file and sideload with AltStore/Sideloadly

## Features

- 📖 **Browse Manga** - Discover manga with genre filtering and search
- 🔌 **Paperback Extensions** - Compatible with Paperback extension sources
- 📚 **Personal Library** - Save your favorite manga for quick access
- ❤️ **Favorites** - Mark manga as favorites for easy organization
- 📊 **Reading Progress** - Automatic tracking of your reading position
- 🌙 **Dark Mode** - Eye-friendly dark theme with custom `.pbcolors` support
- 📱 **Dual Reading Modes** - Vertical scroll or horizontal page flip
- 🔄 **Chapter Navigation** - Easy navigation between chapters
- 📜 **Reading History** - Track what you've been reading
- 🔍 **Multi-Source Search** - Search across all installed extensions
- 💾 **Image Caching** - Fast loading with configurable cache limits

## Screenshots

*Coming soon*

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Expo CLI
- Android Studio (for Android) or Xcode (for iOS)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npx expo start
```

3. Run on your device:
   - **Android**: Press `a` in the terminal or scan QR code with Expo Go
   - **iOS**: Press `i` in the terminal or scan QR code with Expo Go
   - **Web**: Press `w` to open in browser

## Project Structure

```
src/
├── components/             # Reusable UI components
│   ├── MangaCard.tsx       # Manga cover card
│   ├── ChapterListItem.tsx # Chapter list item
│   ├── ExtensionRunner.tsx # WebView extension runtime
│   ├── PickerModal.tsx     # Custom picker modal
│   ├── LoadingIndicator.tsx
│   └── EmptyState.tsx
├── context/                # React Context providers
│   ├── ThemeContext.tsx    # Theme management
│   └── LibraryContext.tsx  # Library & progress state
├── navigation/             # Navigation configuration
│   ├── AppNavigator.tsx
│   └── BottomTabNavigator.tsx
├── screens/                # App screens
│   ├── LibraryScreen.tsx   # User library
│   ├── DiscoverScreen.tsx  # Browse sources
│   ├── SearchScreen.tsx    # Multi-source search
│   ├── MangaDetailScreen.tsx
│   ├── ReaderScreen.tsx    # Manga reader
│   ├── HistoryScreen.tsx   # Reading history
│   ├── SettingsScreen.tsx  # App settings
│   ├── ExtensionsScreen.tsx # Manage extensions
│   ├── CategoryScreen.tsx  # Category view more
│   └── ...                 # Other screens
├── services/               # Core services
│   ├── sourceService.ts    # Extension API bridge
│   ├── extensionService.ts # Extension management
│   ├── cacheService.ts     # Image caching
│   ├── themeService.ts     # Theme file parsing
│   └── deepLinkService.ts  # Deep link handling
├── types/                  # TypeScript types
│   └── index.ts
└── constants/              # App constants
    └── theme.ts
```

## Tech Stack

- **Expo SDK 54** - Development framework
- **React Native** - Cross-platform mobile development
- **TypeScript** - Type-safe JavaScript
- **React Navigation** - Navigation library
- **AsyncStorage** - Persistent local storage
- **expo-image** - Optimized image loading with caching
- **WebView** - Extension runtime for Paperback sources

## Building

### Local Development

```bash
# Install dependencies
npm install

# Start Expo dev server
npx expo start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

### GitHub Actions (Automated)

The project uses GitHub Actions for automated builds. On every push to `main` or manual trigger:

1. Builds Android APK with signing
2. Builds iOS IPA (simulator build, sideloadable)
3. Creates a GitHub Release with both artifacts

**Required Secrets:**
- `EXPO_TOKEN` - Expo access token
- `ANDROID_KEYSTORE_BASE64` - Base64 encoded keystore
- `ANDROID_KEYSTORE_PASSWORD` - Keystore password
- `ANDROID_KEY_ALIAS` - Key alias
- `ANDROID_KEY_PASSWORD` - Key password

### Manual EAS Build

```bash
# Android APK
eas build --platform android --profile preview

# iOS
eas build --platform ios --profile preview
```

## Adding Extensions

1. Go to **More → External Sources**
2. Add a Paperback-compatible extension repository URL
3. Browse and install extensions
4. Sources will appear in the **Discover** tab

## Customization

### Themes

Supports custom `.pbcolors` theme files. Import via **More → Appearance**.

### Settings

- **Portrait/Landscape columns** - Customize grid layout
- **Chapter list sort** - Ascending or descending
- **Cache limit** - Control storage usage

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Credits

- Inspired by [Paperback](https://paperback.moe/)
- Built with [Expo](https://expo.dev/)

---

Made with ❤️ for manga lovers. No ads. No tracking. Just manga.
