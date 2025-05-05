import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { TripStep, addTripStep, deleteTripStep, updateTripStep } from '../../lib/db';
import { commonStyles } from '../../styles/common';

type TripStepsSectionProps = {
  tripId: number;
  steps: TripStep[];
  onStepsUpdated: () => void;
};

export const TripStepsSection = ({ tripId, steps, onStepsUpdated }: TripStepsSectionProps) => {
  const [showStepModal, setShowStepModal] = useState(false);
  const [currentStep, setCurrentStep] = useState<TripStep | null>(null);
  const [newStep, setNewStep] = useState({
    name: '',
    location: '',
    startDate: new Date(),
    endDate: new Date(),
    description: '',
  });
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [editMode, setEditMode] = useState(false);

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Non définie";
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR");
  };

  const handleAddStep = () => {
    // Réinitialiser le formulaire d'étape
    setNewStep({
      name: '',
      location: '',
      startDate: new Date(),
      endDate: new Date(),
      description: '',
    });
    setEditMode(false);
    setShowStepModal(true);
  };

  const handleEditStep = (step: TripStep) => {
    setCurrentStep(step);
    setNewStep({
      name: step.name,
      location: step.location || '',
      startDate: step.startDate ? new Date(step.startDate) : new Date(),
      endDate: step.endDate ? new Date(step.endDate) : new Date(),
      description: step.description || '',
    });
    setEditMode(true);
    setShowStepModal(true);
  };

  const handleDeleteStep = (stepId: number) => {
    Alert.alert(
      "Supprimer l'étape",
      "Êtes-vous sûr de vouloir supprimer cette étape ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => {
            deleteTripStep(stepId, (success) => {
              if (success) {
                onStepsUpdated();
                Alert.alert("Succès", "L'étape a été supprimée avec succès");
              } else {
                Alert.alert("Erreur", "Impossible de supprimer l'étape");
              }
            });
          },
        },
      ]
    );
  };

  const handleSaveStep = () => {
    if (!newStep.name.trim()) {
      Alert.alert("Erreur", "Le nom du lieu est obligatoire");
      return;
    }

    if (editMode && currentStep) {
      // Mode édition
      updateTripStep(
        currentStep.id,
        {
          name: newStep.name,
          location: newStep.location || undefined,
          startDate: newStep.startDate.toISOString(),
          endDate: newStep.endDate.toISOString(),
          description: newStep.description || undefined,
        },
        (success) => {
          if (success) {
            setShowStepModal(false);
            onStepsUpdated();
            Alert.alert("Succès", "L'étape a été modifiée avec succès");
          } else {
            Alert.alert("Erreur", "Impossible de modifier l'étape");
          }
        }
      );
    } else {
      // Mode ajout
      addTripStep(
        {
          trip_id: tripId,
          name: newStep.name,
          location: newStep.location || undefined,
          startDate: newStep.startDate.toISOString(),
          endDate: newStep.endDate.toISOString(),
          description: newStep.description || undefined,
        },
        (success) => {
          if (success) {
            setShowStepModal(false);
            onStepsUpdated();
            Alert.alert("Succès", "L'étape a été ajoutée avec succès");
          } else {
            Alert.alert("Erreur", "Impossible d'ajouter l'étape");
          }
        }
      );
    }
  };

  return (
    <>
      <View style={commonStyles.section}>
        <View style={styles.sectionHeader}>
          <Text style={commonStyles.sectionTitle}>Étapes du voyage</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddStep}
          >
            <Text style={styles.addButtonText}>+ Ajouter une étape</Text>
          </TouchableOpacity>
        </View>

        {steps && steps.length > 0 ? (
          steps.map((step) => (
            <View key={step.id} style={styles.stepItem}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepName}>{step.name}</Text>
                <View style={styles.stepActions}>
                  <TouchableOpacity 
                    style={[styles.stepButton, styles.editStepButton]} 
                    onPress={() => handleEditStep(step)}
                  >
                    <Text style={styles.stepButtonText}>Modifier</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.stepButton, styles.deleteStepButton]} 
                    onPress={() => handleDeleteStep(step.id)}
                  >
                    <Text style={styles.stepButtonText}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {step.location && (
                <Text style={styles.stepInfo}>📍 {step.location}</Text>
              )}
              <Text style={styles.stepInfo}>
                🗓️ Du {formatDate(step.startDate)} au {formatDate(step.endDate)}
              </Text>
              {step.description && (
                <Text style={styles.stepDescription}>{step.description}</Text>
              )}
            </View>
          ))
        ) : (
          <Text style={styles.emptySteps}>Aucune étape planifiée pour ce voyage</Text>
        )}
      </View>

      {/* Modal pour ajouter/modifier une étape */}
      <Modal
        visible={showStepModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowStepModal(false)}
      >
        <View style={commonStyles.modalContainer}>
          <View style={commonStyles.modalContent}>
            <Text style={commonStyles.modalTitle}>
              {editMode ? "Modifier l'étape" : "Ajouter une étape"}
            </Text>

            <TextInput
              style={commonStyles.input}
              placeholder="Nom du lieu"
              value={newStep.name}
              onChangeText={(text) => setNewStep({ ...newStep, name: text })}
            />

            <TextInput
              style={commonStyles.input}
              placeholder="Emplacement"
              value={newStep.location}
              onChangeText={(text) => setNewStep({ ...newStep, location: text })}
            />

            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowStartDatePicker(true)}
            >
              <Text style={styles.datePickerButtonText}>
                Date de début: {newStep.startDate.toLocaleDateString("fr-FR")}
              </Text>
            </TouchableOpacity>

            {showStartDatePicker && (
              <DateTimePicker
                value={newStep.startDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowStartDatePicker(false);
                  if (selectedDate) {
                    setNewStep({ ...newStep, startDate: selectedDate });
                  }
                }}
              />
            )}

            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowEndDatePicker(true)}
            >
              <Text style={styles.datePickerButtonText}>
                Date de fin: {newStep.endDate.toLocaleDateString("fr-FR")}
              </Text>
            </TouchableOpacity>

            {showEndDatePicker && (
              <DateTimePicker
                value={newStep.endDate}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowEndDatePicker(false);
                  if (selectedDate) {
                    setNewStep({ ...newStep, endDate: selectedDate });
                  }
                }}
              />
            )}

            <TextInput
              style={[commonStyles.input, commonStyles.textArea]}
              placeholder="Description"
              value={newStep.description}
              onChangeText={(text) => setNewStep({ ...newStep, description: text })}
              multiline={true}
              numberOfLines={4}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[commonStyles.button, commonStyles.backButton]}
                onPress={() => setShowStepModal(false)}
              >
                <Text style={commonStyles.buttonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[commonStyles.button, commonStyles.primaryButton]}
                onPress={handleSaveStep}
              >
                <Text style={commonStyles.buttonText}>
                  {editMode ? "Modifier" : "Ajouter"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  stepItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepActions: {
    flexDirection: 'row',
  },
  stepButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginLeft: 4,
  },
  editStepButton: {
    backgroundColor: '#007AFF',
  },
  deleteStepButton: {
    backgroundColor: '#FF3B30',
  },
  stepButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  stepInfo: {
    fontSize: 14,
    color: '#6c757d',
  },
  stepDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginTop: 4,
  },
  emptySteps: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 8,
  },
  datePickerButton: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 4,
    marginBottom: 12,
    borderColor: '#ddd',
    borderWidth: 1,
  },
  datePickerButtonText: {
    color: '#6c757d',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});