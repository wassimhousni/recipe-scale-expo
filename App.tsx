import { useState, useCallback, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import ScannerScreen from './screens/ScannerScreen';
import RecipeListScreen from './screens/RecipeListScreen';
import RecipeDetailScreen from './screens/RecipeDetailScreen';

/** Available screens in the app */
type Screen = 'scanner' | 'list' | 'detail';

/**
 * Main app component with simple state-based navigation.
 * Manages navigation between Scanner, Recipe List, and Recipe Detail screens.
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
          // Will be handled by useEffect, return null for this render
          return null;
        }
        return (
          <RecipeDetailScreen
            recipeId={selectedRecipeId}
            onBack={goToList}
            onDelete={goToList}
          />
        );

      default:
        return <ScannerScreen onGoToRecipes={goToList} />;
    }
  };

  return (
    <>
      <StatusBar style="light" />
      {renderScreen()}
    </>
  );
}