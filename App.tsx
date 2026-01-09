import { useState, useCallback, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import ScannerScreen from './screens/ScannerScreen';
import RecipeListScreen from './screens/RecipeListScreen';
import RecipeDetailScreen from './screens/RecipeDetailScreen';
import RecipeEditScreen from './screens/RecipeEditScreen';
import CookModeScreen from './screens/CookModeScreen';
import SettingsScreen from './screens/SettingsScreen';
import LoginScreen from './screens/auth/LoginScreen';
import SignUpScreen from './screens/auth/SignUpScreen';
import ForgotPasswordScreen from './screens/auth/ForgotPasswordScreen';
import { getCurrentUser, onAuthStateChange } from './src/features/auth/authService';
import type { User } from './src/features/auth/authTypes';
import type { RecipeV2, IngredientV2 } from './src/features/recipes/recipeTypesV2';

/** Available screens in the app */
type Screen = 'scanner' | 'list' | 'detail' | 'settings' | 'recipeEdit';

/** Auth screens */
type AuthScreen = 'login' | 'signup' | 'forgotPassword';

/** Data for RecipeEditScreen from scanner */
interface ScanData {
  title: string;
  ingredients: IngredientV2[];
  steps: string[];
  rawText?: string;
}

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
 * Main app component with auth and tab navigation.
 * Shows auth screens when logged out, main tabs when logged in.
 */
export default function App() {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authScreen, setAuthScreen] = useState<AuthScreen>('login');

  // App state
  const [screen, setScreen] = useState<Screen>('scanner');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);

  // Recipe edit state
  const [editInitialData, setEditInitialData] = useState<ScanData | null>(null);
  const [editExistingRecipe, setEditExistingRecipe] = useState<RecipeV2 | null>(null);

  // Cook mode state
  const [cookModeRecipe, setCookModeRecipe] = useState<{
    recipe: RecipeV2;
    targetServings: number;
  } | null>(null);

  // Check auth state on mount and subscribe to changes
  useEffect(() => {
    // Check initial auth state
    getCurrentUser().then((currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });

    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChange((newUser) => {
      setUser(newUser);
      // Reset to login screen when user logs out
      if (!newUser) {
        setAuthScreen('login');
      }
    });

    return unsubscribe;
  }, []);

  // Auth navigation handlers
  const goToLogin = useCallback(() => setAuthScreen('login'), []);
  const goToSignUp = useCallback(() => setAuthScreen('signup'), []);
  const goToForgotPassword = useCallback(() => setAuthScreen('forgotPassword'), []);

  // Navigation handlers
  const goToScanner = useCallback(() => {
    setScreen('scanner');
    setSelectedRecipeId(null);
    setEditInitialData(null);
    setEditExistingRecipe(null);
  }, []);

  const goToList = useCallback(() => {
    setScreen('list');
    setSelectedRecipeId(null);
    setEditInitialData(null);
    setEditExistingRecipe(null);
  }, []);

  const goToSettings = useCallback(() => {
    setScreen('settings');
    setSelectedRecipeId(null);
  }, []);

  const goToDetail = useCallback((recipeId: string) => {
    setSelectedRecipeId(recipeId);
    setScreen('detail');
  }, []);

  // Navigate to RecipeEditScreen with scanned data
  const goToRecipeEdit = useCallback((data: ScanData) => {
    setEditInitialData(data);
    setEditExistingRecipe(null);
    setScreen('recipeEdit');
  }, []);

  // Navigate to RecipeEditScreen for manual entry (blank form)
  const goToNewRecipe = useCallback(() => {
    setEditInitialData(null);
    setEditExistingRecipe(null);
    setScreen('recipeEdit');
  }, []);

  // Navigate to RecipeEditScreen for editing existing recipe
  const goToEditRecipe = useCallback((recipe: RecipeV2) => {
    setEditExistingRecipe(recipe);
    setEditInitialData(null);
    setScreen('recipeEdit');
  }, []);

  // Handle recipe save from edit screen
  const handleRecipeSaved = useCallback((recipe: RecipeV2) => {
    setSelectedRecipeId(recipe.id);
    setScreen('detail');
    setEditInitialData(null);
    setEditExistingRecipe(null);
  }, []);

  // Handle cancel from edit screen - go back to appropriate screen
  const handleEditCancel = useCallback(() => {
    if (editExistingRecipe) {
      // Editing existing recipe - go back to detail view
      setSelectedRecipeId(editExistingRecipe.id);
      setScreen('detail');
    } else if (editInitialData) {
      // From scanner - go back to scanner
      setScreen('scanner');
    } else {
      // Manual entry - go back to list
      setScreen('list');
    }
    setEditInitialData(null);
    setEditExistingRecipe(null);
  }, [editInitialData, editExistingRecipe]);

  // Start cook mode
  const handleStartCookMode = useCallback((recipe: RecipeV2, targetServings: number) => {
    setCookModeRecipe({ recipe, targetServings });
  }, []);

  // Exit cook mode
  const handleExitCookMode = useCallback(() => {
    setCookModeRecipe(null);
  }, []);

  // Handle invalid detail screen state (no recipe selected)
  useEffect(() => {
    if (screen === 'detail' && !selectedRecipeId) {
      setScreen('list');
    }
  }, [screen, selectedRecipeId]);

  // Check if tab bar should be visible (hidden on detail and edit screens)
  const showTabBar = screen !== 'detail' && screen !== 'recipeEdit';

  // Get active tab for highlighting
  const getActiveTab = (): 'scanner' | 'list' | 'settings' => {
    if (screen === 'detail') return 'list';
    if (screen === 'recipeEdit') return 'scanner';
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

  // Render auth screens
  const renderAuthScreen = () => {
    switch (authScreen) {
      case 'signup':
        return <SignUpScreen onGoToLogin={goToLogin} />;
      case 'forgotPassword':
        return <ForgotPasswordScreen onGoToLogin={goToLogin} />;
      case 'login':
      default:
        return (
          <LoginScreen
            onGoToSignUp={goToSignUp}
            onGoToForgotPassword={goToForgotPassword}
          />
        );
    }
  };

  // Render current screen
  const renderScreen = () => {
    switch (screen) {
      case 'scanner':
        return (
          <ScannerScreen
            onGoToRecipes={goToList}
            onScanComplete={goToRecipeEdit}
          />
        );

      case 'list':
        return (
          <RecipeListScreen
            onSelectRecipe={goToDetail}
            onGoToScanner={goToScanner}
            onCreateRecipe={goToNewRecipe}
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
            onEdit={goToEditRecipe}
            onCook={handleStartCookMode}
          />
        );

      case 'recipeEdit':
        return (
          <RecipeEditScreen
            initialData={editInitialData ?? undefined}
            existingRecipe={editExistingRecipe ?? undefined}
            onSave={handleRecipeSaved}
            onCancel={handleEditCancel}
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
        return (
          <ScannerScreen
            onGoToRecipes={goToList}
            onScanComplete={goToRecipeEdit}
          />
        );
    }
  };

  // Show loading screen while checking auth
  if (isAuthLoading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar style="dark" />
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  // Show auth screens if not logged in
  if (!user) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        {renderAuthScreen()}
      </View>
    );
  }

  // Show main app if logged in
  const activeTab = getActiveTab();

  // Show cook mode if active (overlays everything)
  if (cookModeRecipe) {
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        <CookModeScreen
          recipe={cookModeRecipe.recipe}
          targetServings={cookModeRecipe.targetServings}
          onExit={handleExitCookMode}
        />
      </View>
    );
  }

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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FDF7F2',
    justifyContent: 'center',
    alignItems: 'center',
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
