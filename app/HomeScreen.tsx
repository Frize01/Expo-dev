import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { addTrip, deleteTrip, getTrips, initDatabase } from '../lib/db';

type RootStackParamList = {
  AddTrip: undefined;
  Home: undefined;
};

type Trip = {
  id: number;
  title: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  notes?: string;
  imageUri?: string;
};

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

const HomeScreen = () => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // État pour les données du nouveau voyage
  const [newTrip, setNewTrip] = useState({
    title: '',
    destination: '',
    startDate: new Date(),
    endDate: new Date(),
    budget: '',
    notes: '',
  });
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  useEffect(() => {
    initDatabase();
    loadTrips();
  }, []);

  useFocusEffect(
    useCallback(() => {
        initDatabase();
      loadTrips();
    }, [])
  );

  const loadTrips = () => {
    setIsLoading(true);
    getTrips((loadedTrips) => {
      setTrips(loadedTrips);
      setIsLoading(false);
    });
  };

  const handleAddTrip = () => {
    if (newTrip.title.trim()) {
      addTrip({
        title: newTrip.title,
        destination: newTrip.destination,
        startDate: newTrip.startDate.toISOString(),
        endDate: newTrip.endDate.toISOString(),
        budget: parseFloat(newTrip.budget) || 0,
        notes: newTrip.notes,
      }, (success, id) => {
        if (success) {
          // Réinitialiser le formulaire et fermer la modal
          setNewTrip({
            title: '',
            destination: '',
            startDate: new Date(),
            endDate: new Date(),
            budget: '',
            notes: '',
          });
          setModalVisible(false);
          // Recharger la liste des voyages
          loadTrips();
        }
      });
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Non définie';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  };

  const renderTrip = ({ item }: { item: Trip }) => (
    <View style={styles.tripItem}>
      {item.imageUri && (
        <Image source={{ uri: item.imageUri }} style={styles.tripImage} resizeMode="cover" />
      )}
      <View style={styles.tripContent}>
        <Text style={styles.tripTitle}>{item.title}</Text>
        {item.destination && <Text style={styles.tripDestination}>Destination: {item.destination}</Text>}
        <View style={styles.tripDates}>
          <Text>Du {formatDate(item.startDate)} au {formatDate(item.endDate)}</Text>
        </View>
        {item.budget && <Text>Budget: {item.budget} €</Text>}
        
        <View style={styles.tripActions}>
          <TouchableOpacity 
            style={[styles.actionButton, styles.viewButton]}
            onPress={() => router.push(`/${item.id}/view`)}
          >
            <Text style={styles.actionButtonText}>Voir</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => confirmDelete(item.id)}
          >
            <Text style={styles.actionButtonText}>Supprimer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const confirmDelete = (tripId: number) => {
    Alert.alert(
      "Supprimer le voyage",
      "Êtes-vous sûr de vouloir supprimer ce voyage ? Cette action est irréversible.",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Supprimer", 
          style: "destructive",
          onPress: () => {
            deleteTrip(tripId, (success) => {
              if (success) {
                loadTrips(); // Actualiser la liste après suppression
              } else {
                Alert.alert("Erreur", "Impossible de supprimer le voyage.");
              }
            });
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text>Chargement des voyages...</Text>
        </View>
      ) : (
        <>
          {trips.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucun voyage planifié</Text>
              <Text>Appuyez sur le bouton pour créer votre premier voyage</Text>
            </View>
          ) : (
            <FlatList
              data={trips}
              renderItem={renderTrip}
              keyExtractor={(item) => item.id.toString()}
            />
          )}
        </>
      )}

      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Créer un nouveau voyage</Text>
            
            <ScrollView style={styles.formContainer}>
              <Text style={styles.inputLabel}>Titre*</Text>
              <TextInput
                style={styles.input}
                placeholder="Titre du voyage"
                value={newTrip.title}
                onChangeText={(text) => setNewTrip({...newTrip, title: text})}
              />
              
              <Text style={styles.inputLabel}>Destination</Text>
              <TextInput
                style={styles.input}
                placeholder="Destination"
                value={newTrip.destination}
                onChangeText={(text) => setNewTrip({...newTrip, destination: text})}
              />
              
              <Text style={styles.inputLabel}>Date de début</Text>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Text>{newTrip.startDate.toLocaleDateString('fr-FR')}</Text>
              </TouchableOpacity>
              {showStartDatePicker && (
                <DateTimePicker
                  value={newTrip.startDate}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowStartDatePicker(false);
                    if (selectedDate) {
                      // Si la date de début est après la date de fin, mettre à jour la date de fin aussi
                      if (selectedDate > newTrip.endDate) {
                        setNewTrip({
                          ...newTrip, 
                          startDate: selectedDate,
                          endDate: selectedDate
                        });
                      } else {
                        setNewTrip({...newTrip, startDate: selectedDate});
                      }
                    }
                  }}
                />
              )}
              
              <Text style={styles.inputLabel}>Date de fin</Text>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Text>{newTrip.endDate.toLocaleDateString('fr-FR')}</Text>
              </TouchableOpacity>
              {showEndDatePicker && (
                <DateTimePicker
                  value={newTrip.endDate}
                  mode="date"
                  display="default"
                  minimumDate={newTrip.startDate}
                  onChange={(event, selectedDate) => {
                    setShowEndDatePicker(false);
                    if (selectedDate) {
                      setNewTrip({...newTrip, endDate: selectedDate});
                    }
                  }}
                />
              )}
              
              <Text style={styles.inputLabel}>Budget (€)</Text>
              <TextInput
                style={styles.input}
                placeholder="Budget estimé"
                keyboardType="numeric"
                value={newTrip.budget}
                onChangeText={(text) => setNewTrip({...newTrip, budget: text})}
              />
              
              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Notes et commentaires"
                multiline
                numberOfLines={4}
                value={newTrip.notes}
                onChangeText={(text) => setNewTrip({...newTrip, notes: text})}
              />
            </ScrollView>
            
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.addTripButton]}
                onPress={handleAddTrip}
              >
                <Text style={styles.buttonText}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingBottom: 64,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  tripItem: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'white',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tripTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  tripDestination: {
    fontStyle: 'italic',
    marginBottom: 5,
  },
  tripDates: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  addButton: {
    position: 'absolute',
    bottom: 64,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  addButtonText: {
    fontSize: 30,
    color: 'white',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  formContainer: {
    maxHeight: 400,
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateButton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#6c757d',
  },
  addTripButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  tripActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  actionButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    marginLeft: 10,
  },
  viewButton: {
    backgroundColor: '#007AFF',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  tripImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 10,
  },
  tripImagePlaceholder: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  placeholderText: {
    color: '#888',
    fontSize: 18,
  },
  tripContent: {
    flex: 1,
  },
});

export default HomeScreen;