import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { addJournalMedia, deleteJournalMedia, getJournalEntryById, getJournalMediaByEntryId, getTripById, getTripSteps, JournalEntry, JournalMedia, TripStep, updateJournalEntry } from '../../lib/db';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EditJournalEntryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [entryDate, setEntryDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tripSteps, setTripSteps] = useState<TripStep[]>([]);
  const [selectedStepId, setSelectedStepId] = useState<number | null>(null);
  const [existingMedia, setExistingMedia] = useState<JournalMedia[]>([]);
  const [newImages, setNewImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tripTitle, setTripTitle] = useState('');

  useEffect(() => {
    if (!id) {
      Alert.alert('Erreur', 'Identifiant d\'entrée invalide');
      router.back();
      return;
    }

    loadEntry();
  }, [id]);

  const loadEntry = () => {
    setLoading(true);
    getJournalEntryById(parseInt(id!), (journalEntry) => {
      if (journalEntry) {
        setEntry(journalEntry);
        setTitle(journalEntry.title);
        setContent(journalEntry.content || '');
        setEntryDate(new Date(journalEntry.entry_date));
        setSelectedStepId(journalEntry.step_id || null);

        // Récupérer les informations du voyage
        getTripById(journalEntry.trip_id, (trip) => {
          if (trip) {
            setTripTitle(trip.title);
            
            // Récupérer les étapes du voyage
            getTripSteps(trip.id, (steps) => {
              setTripSteps(steps);
            });
          }
        });

        // Récupérer les médias associés
        getJournalMediaByEntryId(journalEntry.id, (entryMedia) => {
          setExistingMedia(entryMedia);
          setLoading(false);
        });
      } else {
        Alert.alert('Erreur', 'Entrée introuvable');
        router.back();
      }
    });

    // Demander les permissions pour accéder aux photos
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission requise',
            'Nous avons besoin de votre permission pour accéder à votre galerie de photos'
          );
        }
      }
    })();
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setEntryDate(selectedDate);
    }
  };

  const formatDateDisplay = (date: Date) => {
    return format(date, 'dd MMMM yyyy', { locale: fr });
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        setNewImages([...newImages, result.assets[0].uri]);
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'image:', error);
      Alert.alert('Erreur', 'Impossible de charger l\'image');
    }
  };

  const removeImage = (index: number) => {
    const updatedImages = [...newImages];
    updatedImages.splice(index, 1);
    setNewImages(updatedImages);
  };

  const removeExistingMedia = (mediaId: number) => {
    Alert.alert(
      'Confirmation',
      'Êtes-vous sûr de vouloir supprimer cette image ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            deleteJournalMedia(mediaId, (success) => {
              if (success) {
                const updatedMedia = existingMedia.filter(m => m.id !== mediaId);
                setExistingMedia(updatedMedia);
              } else {
                Alert.alert('Erreur', 'Impossible de supprimer l\'image');
              }
            });
          },
        }
      ]
    );
  };

  const handleSubmit = async () => {
    if (title.trim() === '') {
      Alert.alert('Erreur', 'Veuillez saisir un titre');
      return;
    }

    if (!entry) {
      Alert.alert('Erreur', 'Entrée introuvable');
      return;
    }

    setIsSubmitting(true);

    // Mettre à jour l'entrée de journal
    updateJournalEntry(entry.id, {
      title,
      content,
      step_id: selectedStepId,
      entry_date: format(entryDate, 'yyyy-MM-dd')
    }, async (success) => {
      if (success) {
        // Ajouter les nouvelles images
        if (newImages.length > 0) {
          const imagePromises = newImages.map((uri) => {
            return new Promise<void>((resolve, reject) => {
              addJournalMedia({
                entry_id: entry.id,
                media_type: 'image',
                uri,
                description: ''
              }, (success) => {
                if (success) {
                  resolve();
                } else {
                  reject();
                }
              });
            });
          });

          try {
            await Promise.all(imagePromises);
            setIsSubmitting(false);
            Alert.alert(
              'Succès',
              'L\'entrée a été mise à jour',
              [{ text: 'OK', onPress: () => router.replace(`/journal/${entry.id}`) }]
            );
          } catch (error) {
            setIsSubmitting(false);
            Alert.alert('Erreur', 'Une erreur est survenue lors de l\'ajout des nouvelles images');
          }
        } else {
          setIsSubmitting(false);
          Alert.alert(
            'Succès',
            'L\'entrée a été mise à jour',
            [{ text: 'OK', onPress: () => router.replace(`/journal/${entry.id}`) }]
          );
        }
      } else {
        setIsSubmitting(false);
        Alert.alert('Erreur', 'Une erreur est survenue lors de la mise à jour de l\'entrée');
      }
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff6b6b" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (isSubmitting) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff6b6b" />
        <Text style={styles.loadingText}>Enregistrement en cours...</Text>
      </View>
    );
  }

  const imageMedia = existingMedia.filter(m => m.media_type === 'image');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Modifier l'entrée</Text>
        <Text style={styles.subtitle}>{tripTitle}</Text>
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.formContainer}>
        <Text style={styles.label}>Titre</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Titre de l'entrée"
          placeholderTextColor="#aaa"
        />

        <Text style={styles.label}>Date</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons name="calendar" size={20} color="#666" />
          <Text style={styles.dateText}>{formatDateDisplay(entryDate)}</Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={entryDate}
            mode="date"
            display="default"
            onChange={handleDateChange}
          />
        )}

        {tripSteps.length > 0 && (
          <>
            <Text style={styles.label}>Associer à une étape (optionnel)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stepsScrollView}>
              <TouchableOpacity
                style={[
                  styles.stepButton,
                  selectedStepId === null && styles.stepButtonSelected
                ]}
                onPress={() => setSelectedStepId(null)}
              >
                <Text style={[
                  styles.stepText,
                  selectedStepId === null && styles.stepTextSelected
                ]}>Aucune</Text>
              </TouchableOpacity>
              
              {tripSteps.map(step => (
                <TouchableOpacity
                  key={step.id}
                  style={[
                    styles.stepButton,
                    selectedStepId === step.id && styles.stepButtonSelected
                  ]}
                  onPress={() => setSelectedStepId(step.id)}
                >
                  <Text style={[
                    styles.stepText,
                    selectedStepId === step.id && styles.stepTextSelected
                  ]}>{step.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={styles.textArea}
          value={content}
          onChangeText={setContent}
          placeholder="Racontez votre journée..."
          placeholderTextColor="#aaa"
          multiline
          textAlignVertical="top"
        />

        <Text style={styles.label}>Photos existantes</Text>
        {imageMedia.length === 0 ? (
          <Text style={styles.noMediaText}>Aucune photo</Text>
        ) : (
          <View style={styles.imageSection}>
            <View style={styles.imagesGrid}>
              {imageMedia.map((media) => (
                <View key={media.id} style={styles.imageContainer}>
                  <Image source={{ uri: media.uri }} style={styles.imagePreview} contentFit="cover" />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeExistingMedia(media.id)}
                  >
                    <Ionicons name="close-circle" size={24} color="white" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        <Text style={styles.label}>Ajouter des photos</Text>
        <View style={styles.imageSection}>
          <View style={styles.imagesGrid}>
            {newImages.map((uri, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image source={{ uri }} style={styles.imagePreview} contentFit="cover" />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                >
                  <Ionicons name="close-circle" size={24} color="white" />
                </TouchableOpacity>
              </View>
            ))}
            
            <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
              <Ionicons name="add" size={40} color="#ccc" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>Enregistrer les modifications</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e4e8',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  scrollContainer: {
    flex: 1,
  },
  formContainer: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dateText: {
    fontSize: 16,
    marginLeft: 8,
  },
  textArea: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    minHeight: 120,
  },
  imageSection: {
    marginBottom: 20,
  },
  noMediaText: {
    color: '#888',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  imageContainer: {
    width: 100,
    height: 100,
    margin: 4,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 12,
  },
  addImageButton: {
    width: 100,
    height: 100,
    margin: 4,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  submitButton: {
    backgroundColor: '#ff6b6b',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  stepsScrollView: {
    marginBottom: 8,
  },
  stepButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  stepButtonSelected: {
    backgroundColor: '#ff6b6b',
    borderColor: '#ff6b6b',
  },
  stepText: {
    color: '#666',
  },
  stepTextSelected: {
    color: 'white',
    fontWeight: '500',
  },
});