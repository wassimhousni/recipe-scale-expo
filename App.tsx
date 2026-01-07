import { useState, useCallback, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import ScannerScreen from './screens/ScannerScreen';
import RecipeListScreen from './screens/RecipeListScreen';
import RecipeDetailScreen from './screens/RecipeDetailScreen';
import SettingsScreen from './screens/SettingsScreen';

/** Available screens in the app */
type Screen = 'scanner' | 'list' | 'detail' | 'settings';

/** Tab bar item configuration */
interface TabItem {
  screen: 'scanner' | 'list' | 'settings';
  label: string;
  iconActive: keyof typeof Ionicons.glyphMap;
  iconInactive: keyof typeof Ionicons.glyphMap;
}

const TABS: TabItem[] = [
  { screen: 'scanner', label: 'Scanner', iconActive: 'scan', iconInactive: 'scan-outline' },
  { screen: 'list', label: 'Recipes', iconActive: 'book', iconInactive: 'book-outline' },
  { screen: 'settings', label: 'Settings', iconActive: 'settings', iconInactive: 'settings-outline' },
];

/**
 * Main app component with tab navigation.
 * Manages navigation between Scanner, Recipe List, Recipe Detail, and Settings screens.
 */
export default function App() {
  const [screen, setScreen] = useState<Screen>('scanner');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);

  // Navigation handlers
  const goToScanner = useCallback(() => {
    setScreen('scanner');
    setSelectedRecipeId(null);
  }, []);

  const goToList = useCallback(() => {
    setScreen('list');
    setSelectedRecipeId(null);
  }, []);

  const goToSettings = useCallback(() => {
    setScreen('settings');
    setSelectedRecipeId(null);
  }, []);

  const goToDetail = useCallback((recipeId: string) => {
    setSelectedRecipeId(recipeId);
    setScreen('detail');
  }, []);

  // Handle invalid detail screen state (no recipe selected)
  useEffect(() => {
    if (screen === 'detail' && !selectedRecipeId) {
      setScreen('list');
    }
  }, [screen, selectedRecipeId]);

  // Check if tab bar should be visible (hidden on detail screen)
  const showTabBar = screen !== 'detail';

  // Get active tab for highlighting
  const getActiveTab = (): 'scanner' | 'list' | 'settings' => {
    if (screen === 'detail') return 'list';
    if (screen === 'settings') return 'settings';
    if (screen === 'list') return 'list';
    return 'scanner';
  };

  // Handle tab press
  const handleTabPress = (tabScreen: 'scanner' | 'list' | 'settings') => {
    switch (tabScreen) {
      case 'scanner':
        goToScanner();
        break;
      case 'list':
        goToList();
        break;
      case 'settings':
        goToSettings();
        break;
    }
  };

  // Render current screen
  const renderScreen = () => {
    switch (screen) {
      case 'scanner':
        return <ScannerScreen onGoToRecipes={goToList} />;

      case 'list':
        return (
          <RecipeListScreen
            onSelectRecipe={goToDetail}
            onGoToScanner={goToScanner}
          />
        );

      case 'detail':
        if (!selectedRecipeId) {
          return null;
        }
        return (
          <RecipeDetailScreen
            recipeId={selectedRecipeId}
            onBack={goToList}
            onDelete={goToList}
          />
        );

      case 'settings':
        return (
          <SettingsScreen
            onGoToScanner={goToScanner}
            onGoToRecipes={goToList}
          />
        );

      default:
        return <ScannerScreen onGoToRecipes={goToList} />;
    }
  };

  const activeTab = getActiveTab();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Screen Content */}
      <View style={styles.screenContainer}>
        {renderScreen()}
      </View>

      {/* Tab Bar */}
      {showTabBar && (
        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab.screen;
            return (
              <TouchableOpacity
                key={tab.screen}
                style={styles.tabItem}
                onPress={() => handleTabPress(tab.screen)}
                accessibilityLabel={tab.label}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
              >
                <Ionicons
                  name={isActive ? tab.iconActive : tab.iconInactive}
                  size={24}
                  color={isActive ? '#FF6B35' : '#9ca3af'}
                />
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  screenContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#FF6B35',
    fontWeight: '600',
  },
});
