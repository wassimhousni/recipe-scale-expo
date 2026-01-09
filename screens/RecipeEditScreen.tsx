import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { createRecipe, updateRecipe } from '../src/features/recipes/recipeService';
import { getCurrentUser } from '../src/features/auth/authService';
import { uploadPhoto, deletePhoto } from '../src/features/media/photoService';
import type { RecipeV2, IngredientV2, Category, CreateRecipeData } from '../src/features/recipes/recipeTypesV2';

/** Category options for the picker */
const CATEGORIES: { value: Category; label: string }[] = [
  { value: 'entree', label: 'Entree' },
  { value: 'appetizer', label: 'Appetizer' },
  { value: 'dessert', label: 'Dessert' },
  { value: 'snack', label: 'Snack' },
  { value: 'drink', label: 'Drink' },
  { value: 'other', label: 'Other' },
];

interface RecipeEditScreenProps {
  /** Pre-filled data from OCR (for post-scan flow) */
  initialData?: {
    title: string;
    ingredients: IngredientV2[];
    steps: string[];
    rawText?: string;
  };
  /** For editing existing recipe */
  existingRecipe?: RecipeV2;
  /** Navigation callbacks */
  onSave: (recipe: RecipeV2) => void;
  onCancel: () => void;
}

/**
 * Screen for creating/editing recipes with editable fields.
 */
export default function RecipeEditScreen({
  initialData,
  existingRecipe,
  onSave,
  onCancel,
}: RecipeEditScreenProps) {
  const isEditing = !!existingRecipe;

  // Form state
  const [title, setTitle] = useState(
    existingRecipe?.title ?? initialData?.title ?? ''
  );
  const [ingredients, setIngredients] = useState<IngredientV2[]>(
    existingRecipe?.ingredients ?? initialData?.ingredients ?? []
  );
  const [steps, setSteps] = useState<string[]>(
    existingRecipe?.steps ?? initialData?.steps ?? []
  );
  const [category, setCategory] = useState<Category>(
    existingRecipe?.category ?? 'other'
  );
  const [tagsText, setTagsText] = useState(
    existingRecipe?.tags?.join(', ') ?? ''
  );
  const [servings, setServings] = useState(
    String(existingRecipe?.original_servings ?? 4)
  );

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [editingIngredientIndex, setEditingIngredientIndex] = useState<number | null>(null);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);

  // Photo state
  const [photoUri, setPhotoUri] = useState<string | null>(
    existingRecipe?.photo_url ?? null
  );
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Temporary edit values
  const [tempIngredient, setTempIngredient] = useState<IngredientV2 | null>(null);
  const [tempStep, setTempStep] = useState('');

  /** Validate form before save */
  const validateForm = (): string | null => {
    if (!title.trim()) {
      return 'Please enter a recipe title.';
    }
    if (ingredients.length === 0) {
      return 'Please add at least one ingredient.';
    }
    return null;
  };

  /** Show options to pick photo from camera or gallery */
  const handleAddPhoto = () => {
    Alert.alert(
      'Add Photo',
      'Choose a source',
      [
        { text: 'Camera', onPress: handleTakePhoto },
        { text: 'Gallery', onPress: handlePickFromGallery },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  /** Take photo with camera */
  const handleTakePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Camera access is required to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  /** Pick photo from gallery */
  const handlePickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Gallery access is required to pick photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  /** Remove current photo */
  const handleRemovePhoto = () => {
    setPhotoUri(null);
  };

  /** Handle save */
  const handleSave = useCallback(async () => {
    const error = validateForm();
    if (error) {
      Alert.alert('Validation Error', error);
      return;
    }

    setIsSaving(true);

    try {
      const user = await getCurrentUser();
      if (!user) {
        Alert.alert('Error', 'You must be logged in to save recipes.');
        setIsSaving(false);
        return;
      }

      // Parse tags from comma-separated text
      const tags = tagsText
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
        .slice(0, 5); // Max 5 tags

      // Parse servings
      const parsedServings = parseInt(servings, 10) || 4;

      // Handle photo upload
      let finalPhotoUrl: string | undefined = undefined;

      if (photoUri) {
        // Check if it's a new local photo that needs uploading
        if (photoUri.startsWith('file://')) {
          setIsUploadingPhoto(true);
          const recipeId = existingRecipe?.id ?? `temp-${Date.now()}`;
          const { publicUrl, error: uploadError } = await uploadPhoto(photoUri, recipeId);
          setIsUploadingPhoto(false);

          if (uploadError) {
            Alert.alert('Upload Error', uploadError);
            setIsSaving(false);
            return;
          }
          finalPhotoUrl = publicUrl ?? undefined;
        } else {
          // Keep existing URL
          finalPhotoUrl = photoUri;
        }
      }

      // If editing and had a photo but now removed, delete old photo
      if (isEditing && existingRecipe?.photo_url && !photoUri) {
        await deletePhoto(existingRecipe.photo_url);
      }

      if (isEditing && existingRecipe) {
        // Update existing recipe
        const { recipe, error: updateError } = await updateRecipe({
          id: existingRecipe.id,
          title: title.trim(),
          ingredients,
          steps: steps.filter((s) => s.trim()),
          original_servings: parsedServings,
          category,
          tags,
          photo_url: finalPhotoUrl,
        });

        if (updateError) {
          Alert.alert('Error', updateError);
          setIsSaving(false);
          return;
        }

        if (recipe) {
          onSave(recipe);
        }
      } else {
        // Create new recipe
        const recipeData: CreateRecipeData = {
          title: title.trim(),
          ingredients,
          steps: steps.filter((s) => s.trim()),
          original_servings: parsedServings,
          category,
          tags,
          photo_url: finalPhotoUrl,
        };

        const { recipe, error: createError } = await createRecipe(user.id, recipeData);

        if (createError) {
          Alert.alert('Error', createError);
          setIsSaving(false);
          return;
        }

        if (recipe) {
          onSave(recipe);
        }
      }
    } catch {
      Alert.alert('Error', 'Failed to save recipe. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [title, ingredients, steps, category, tagsText, servings, photoUri, isEditing, existingRecipe, onSave]);

  /** Add new ingredient */
  const handleAddIngredient = () => {
    const newIngredient: IngredientV2 = {
      quantity: 1,
      unit: '',
      name: '',
    };
    setIngredients([...ingredients, newIngredient]);
    setEditingIngredientIndex(ingredients.length);
    setTempIngredient(newIngredient);
  };

  /** Start editing ingredient */
  const handleEditIngredient = (index: number) => {
    setEditingIngredientIndex(index);
    setTempIngredient({ ...ingredients[index] });
  };

  /** Save ingredient edit */
  const handleSaveIngredient = () => {
    if (editingIngredientIndex === null || !tempIngredient) return;

    // Validate ingredient has a name
    if (!tempIngredient.name.trim()) {
      // If it's a new empty ingredient, remove it
      if (!ingredients[editingIngredientIndex].name.trim()) {
        const updated = [...ingredients];
        updated.splice(editingIngredientIndex, 1);
        setIngredients(updated);
      }
      setEditingIngredientIndex(null);
      setTempIngredient(null);
      return;
    }

    const updated = [...ingredients];
    updated[editingIngredientIndex] = {
      ...tempIngredient,
      name: tempIngredient.name.trim(),
      unit: tempIngredient.unit?.trim() || undefined,
    };
    setIngredients(updated);
    setEditingIngredientIndex(null);
    setTempIngredient(null);
  };

  /** Delete ingredient */
  const handleDeleteIngredient = (index: number) => {
    const updated = [...ingredients];
    updated.splice(index, 1);
    setIngredients(updated);
    if (editingIngredientIndex === index) {
      setEditingIngredientIndex(null);
      setTempIngredient(null);
    }
  };

  /** Add new step */
  const handleAddStep = () => {
    setSteps([...steps, '']);
    setEditingStepIndex(steps.length);
    setTempStep('');
  };

  /** Start editing step */
  const handleEditStep = (index: number) => {
    setEditingStepIndex(index);
    setTempStep(steps[index]);
  };

  /** Save step edit */
  const handleSaveStep = () => {
    if (editingStepIndex === null) return;

    // If empty, remove the step
    if (!tempStep.trim()) {
      const updated = [...steps];
      updated.splice(editingStepIndex, 1);
      setSteps(updated);
      setEditingStepIndex(null);
      setTempStep('');
      return;
    }

    const updated = [...steps];
    updated[editingStepIndex] = tempStep.trim();
    setSteps(updated);
    setEditingStepIndex(null);
    setTempStep('');
  };

  /** Delete step */
  const handleDeleteStep = (index: number) => {
    const updated = [...steps];
    updated.splice(index, 1);
    setSteps(updated);
    if (editingStepIndex === index) {
      setEditingStepIndex(null);
      setTempStep('');
    }
  };

  /** Format ingredient for display */
  const formatIngredient = (ing: IngredientV2): string => {
    const parts = [];
    if (ing.quantity) parts.push(String(ing.quantity));
    if (ing.unit) parts.push(ing.unit);
    if (ing.name) parts.push(ing.name);
    return parts.join(' ') || 'New ingredient';
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <LinearGradient
        colors={['#FF6B35', '#FF8C42']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.headerButton}
          onPress={onCancel}
          disabled={isSaving}
        >
          <Text style={styles.headerButtonText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? 'Edit Recipe' : 'New Recipe'}
        </Text>
        <TouchableOpacity
          style={[styles.headerButton, isSaving && styles.headerButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.headerButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title Input */}
        <View style={styles.card}>
          <Text style={styles.label}>Recipe Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter recipe title"
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Photo Section */}
        <View style={styles.card}>
          <Text style={styles.label}>Photo</Text>
          {photoUri ? (
            <View style={styles.photoContainer}>
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
              <View style={styles.photoActions}>
                <TouchableOpacity style={styles.photoActionButton} onPress={handleAddPhoto}>
                  <Ionicons name="camera" size={20} color="#FF6B35" />
                  <Text style={styles.photoActionText}>Change</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.photoActionButton} onPress={handleRemovePhoto}>
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  <Text style={[styles.photoActionText, { color: '#ef4444' }]}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.addPhotoButton} onPress={handleAddPhoto}>
              <Ionicons name="camera-outline" size={32} color="#FF6B35" />
              <Text style={styles.addPhotoText}>Add Photo</Text>
            </TouchableOpacity>
          )}
          {isUploadingPhoto && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator size="small" color="#FF6B35" />
              <Text style={styles.uploadingText}>Uploading...</Text>
            </View>
          )}
        </View>

        {/* Servings */}
        <View style={styles.card}>
          <Text style={styles.label}>Servings</Text>
          <TextInput
            style={[styles.input, styles.smallInput]}
            value={servings}
            onChangeText={setServings}
            keyboardType="number-pad"
            placeholder="4"
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Category Picker */}
        <View style={styles.card}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryContainer}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.categoryChip,
                  category === cat.value && styles.categoryChipActive,
                ]}
                onPress={() => setCategory(cat.value)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    category === cat.value && styles.categoryChipTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tags Input */}
        <View style={styles.card}>
          <Text style={styles.label}>Tags (comma-separated, max 5)</Text>
          <TextInput
            style={styles.input}
            value={tagsText}
            onChangeText={setTagsText}
            placeholder="e.g. quick, healthy, vegetarian"
            placeholderTextColor="#9ca3af"
          />
        </View>

        {/* Ingredients Section */}
        <View style={styles.card}>
          <Text style={styles.label}>Ingredients</Text>
          {ingredients.map((ing, index) => (
            <View key={index} style={styles.listItem}>
              {editingIngredientIndex === index ? (
                <View style={styles.editIngredientForm}>
                  <View style={styles.editIngredientRow}>
                    <TextInput
                      style={[styles.editInput, styles.qtyInput]}
                      value={String(tempIngredient?.quantity ?? '')}
                      onChangeText={(text) =>
                        setTempIngredient((prev) =>
                          prev ? { ...prev, quantity: parseFloat(text) || 0 } : null
                        )
                      }
                      keyboardType="decimal-pad"
                      placeholder="Qty"
                      placeholderTextColor="#9ca3af"
                    />
                    <TextInput
                      style={[styles.editInput, styles.unitInput]}
                      value={tempIngredient?.unit ?? ''}
                      onChangeText={(text) =>
                        setTempIngredient((prev) =>
                          prev ? { ...prev, unit: text } : null
                        )
                      }
                      placeholder="Unit"
                      placeholderTextColor="#9ca3af"
                    />
                    <TextInput
                      style={[styles.editInput, styles.nameInput]}
                      value={tempIngredient?.name ?? ''}
                      onChangeText={(text) =>
                        setTempIngredient((prev) =>
                          prev ? { ...prev, name: text } : null
                        )
                      }
                      placeholder="Ingredient name"
                      placeholderTextColor="#9ca3af"
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.doneButton}
                    onPress={handleSaveIngredient}
                  >
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <Text style={styles.listItemText} numberOfLines={1}>
                    {formatIngredient(ing)}
                  </Text>
                  <View style={styles.listItemActions}>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => handleEditIngredient(index)}
                    >
                      <Ionicons name="pencil" size={18} color="#FF6B35" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => handleDeleteIngredient(index)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          ))}
          <TouchableOpacity style={styles.addButton} onPress={handleAddIngredient}>
            <Ionicons name="add" size={20} color="#FF6B35" />
            <Text style={styles.addButtonText}>Add Ingredient</Text>
          </TouchableOpacity>
        </View>

        {/* Steps Section */}
        <View style={styles.card}>
          <Text style={styles.label}>Steps</Text>
          {steps.map((step, index) => (
            <View key={index} style={styles.listItem}>
              {editingStepIndex === index ? (
                <View style={styles.editStepForm}>
                  <TextInput
                    style={[styles.editInput, styles.stepInput]}
                    value={tempStep}
                    onChangeText={setTempStep}
                    placeholder="Enter step..."
                    placeholderTextColor="#9ca3af"
                    multiline
                  />
                  <TouchableOpacity
                    style={styles.doneButton}
                    onPress={handleSaveStep}
                  >
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.listItemText} numberOfLines={2}>
                    {step || 'Empty step'}
                  </Text>
                  <View style={styles.listItemActions}>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => handleEditStep(index)}
                    >
                      <Ionicons name="pencil" size={18} color="#FF6B35" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => handleDeleteStep(index)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          ))}
          <TouchableOpacity style={styles.addButton} onPress={handleAddStep}>
            <Ionicons name="add" size={20} color="#FF6B35" />
            <Text style={styles.addButtonText}>Add Step</Text>
          </TouchableOpacity>
        </View>

        {/* Spacer for keyboard */}
        <View style={styles.spacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDF7F2',
  },

  // Header
  header: {
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerButtonDisabled: {
    opacity: 0.5,
  },

  // Content
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    gap: 16,
  },

  // Cards
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    color: '#3D2B1F',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },

  // Inputs
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#3D2B1F',
  },
  smallInput: {
    width: 100,
  },

  // Category chips
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  categoryChipActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  categoryChipText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryChipTextActive: {
    color: '#fff',
  },

  // List items
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 12,
  },
  listItemText: {
    flex: 1,
    color: '#3D2B1F',
    fontSize: 15,
  },
  listItemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },

  // Step number
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Add button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
    borderWidth: 2,
    borderColor: '#FF6B35',
    borderRadius: 12,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addButtonText: {
    color: '#FF6B35',
    fontSize: 15,
    fontWeight: '600',
  },

  // Edit forms
  editIngredientForm: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editIngredientRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  editInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#FF6B35',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#3D2B1F',
  },
  qtyInput: {
    width: 50,
    textAlign: 'center',
  },
  unitInput: {
    width: 60,
  },
  nameInput: {
    flex: 1,
  },
  editStepForm: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  stepInput: {
    flex: 1,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  doneButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Spacer
  spacer: {
    height: 100,
  },

  // Photo section
  photoContainer: {
    gap: 12,
  },
  photoPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  photoActions: {
    flexDirection: 'row',
    gap: 16,
  },
  photoActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  photoActionText: {
    color: '#FF6B35',
    fontSize: 14,
    fontWeight: '600',
  },
  addPhotoButton: {
    height: 150,
    borderWidth: 2,
    borderColor: '#FF6B35',
    borderStyle: 'dashed',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  addPhotoText: {
    color: '#FF6B35',
    fontSize: 15,
    fontWeight: '600',
  },
  uploadingOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  uploadingText: {
    color: '#6b7280',
    fontSize: 14,
  },
});
