import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

interface SaveRecipeModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback when user saves with a title */
  onSave: (title: string) => void;
  /** Callback when user cancels */
  onCancel: () => void;
}

/**
 * Modal for entering a recipe title when saving.
 * Shows a text input with Save and Cancel buttons.
 */
export function SaveRecipeModal({ visible, onSave, onCancel }: SaveRecipeModalProps) {
  const [title, setTitle] = useState('');

  const handleSave = () => {
    const trimmedTitle = title.trim();
    if (trimmedTitle) {
      onSave(trimmedTitle);
      setTitle('');
    }
  };

  const handleCancel = () => {
    setTitle('');
    onCancel();
  };

  const isValid = title.trim().length > 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.container}>
          <Text style={styles.title}>Save Recipe</Text>
          <Text style={styles.subtitle}>Enter a name for this recipe</Text>

          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Recipe name"
            placeholderTextColor="#6b7280"
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSave}
            accessibilityLabel="Recipe name input"
            accessibilityHint="Enter a name for your recipe"
          />

          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              accessibilityLabel="Cancel"
              accessibilityRole="button"
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, !isValid && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!isValid}
              accessibilityLabel="Save recipe"
              accessibilityRole="button"
              accessibilityState={{ disabled: !isValid }}
            >
              <Text style={[styles.saveButtonText, !isValid && styles.saveButtonTextDisabled]}>
                Save
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#111827',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#374151',
  },
  buttons: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#374151',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: '#22c55e',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#374151',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonTextDisabled: {
    color: '#6b7280',
  },
});