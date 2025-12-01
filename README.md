# Paperad- Ad-Free Manga Reader 📚

An elegant, ad-free manga reader built with Expo and React Native.

## Features

- 📖 **Browse Manga** - Discover manga with genre filtering and search
- 📚 **Personal Library** - Save your favorite manga for quick access
- ❤️ **Favorites** - Mark manga as favorites for easy organization
- 📊 **Reading Progress** - Automatic tracking of your reading position
- 🌙 **Dark Mode** - Eye-friendly dark theme with system theme support
- 📱 **Dual Reading Modes** - Vertical scroll or horizontal page flip
- 🔄 **Chapter Navigation** - Easy navigation between chapters
- 📜 **Reading History** - Track what you've been reading

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
├── components/          # Reusable UI components
│   ├── MangaCard.tsx    # Manga cover card
│   ├── ChapterListItem.tsx
│   ├── LoadingIndicator.tsx
│   └── EmptyState.tsx
├── context/             # React Context providers
│   ├── ThemeContext.tsx # Theme management
│   └── LibraryContext.tsx # Library & progress state
├── data/                # Mock data for demo
│   └── mockData.ts
├── navigation/          # Navigation configuration
│   ├── AppNavigator.tsx
│   └── BottomTabNavigator.tsx
├── screens/             # App screens
│   ├── LibraryScreen.tsx
│   ├── BrowseScreen.tsx
│   ├── MangaDetailScreen.tsx
│   ├── ReaderScreen.tsx
│   ├── HistoryScreen.tsx
│   └── MoreScreen.tsx
├── types/               # TypeScript types
│   └── index.ts
└── constants/           # App constants
    └── theme.ts
```

## Tech Stack

- **Expo** - Development framework
- **React Native** - Cross-platform mobile development
- **TypeScript** - Type-safe JavaScript
- **React Navigation** - Navigation library
- **AsyncStorage** - Persistent local storage
- **Expo Image** - Optimized image loading

## Building for Production

### Android

```bash
npx expo build:android
# or for EAS Build
npx eas build --platform android
```

### iOS

```bash
npx expo build:ios
# or for EAS Build
npx eas build --platform ios
```

## Customization

### Adding Real Manga Sources

The app currently uses mock data. To add real manga sources:

1. Create a new data source in `src/data/`
2. Implement the API interface matching the types in `src/types/`
3. Replace mock data imports with your data source

### Theming

Customize colors in `src/constants/theme.ts`:

```typescript
export const lightTheme: ThemeColors = {
  primary: '#6200EE',  // Change primary color
  // ...
};
```

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Made with ❤️ for manga lovers. No ads. No tracking. Just manga.
