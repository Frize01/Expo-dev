import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Button,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { getTripById, updateTrip } from "../../lib/db";
import { SafeAreaView } from 'react-native-safe-area-context';

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

const EditTripScreen = () => {
  const { id } = useLocalSearchParams();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState("");
  const [notes, setNotes] = useState("");
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  // Charger les données du voyage
  useEffect(() => {
    if (id) {
      getTripById(Number(id), (tripData) => {
        if (tripData) {
          setTrip(tripData);
          setTitle(tripData.title || "");
          setDestination(tripData.destination || "");
          setStartDate(tripData.startDate || "");
          setEndDate(tripData.endDate || "");
          setBudget(tripData.budget ? String(tripData.budget) : "");
          setNotes(tripData.notes || "");
          setImageUri(tripData.imageUri);
        }
        setIsLoading(false);
      });
    }
  }, [id]);

  const handleChangeImage = () => {
    Alert.alert(
      "Changer l'image",
      "Choisissez une source pour l'image",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Galerie", onPress: pickImage },
        { text: "Appareil photo", onPress: takePicture },
        { text: "Supprimer l'image", onPress: removeImage, style: "destructive" }
      ]
    );
  };

  const pickImage = async () => {
    // Demander les permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permissions requises', 'L\'accès à la galerie est nécessaire pour choisir une image.');
      return;
    }

    try {
      // Ouvrir le sélecteur d'images
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        // Si une image a été sélectionnée, mettre à jour l'état local
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erreur lors de la sélection de l\'image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image.');
    }
  };

  const takePicture = async () => {
    // Demander les permissions pour l'appareil photo
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permissions requises', 'L\'accès à l\'appareil photo est nécessaire pour prendre une photo.');
      return;
    }

    try {
      // Ouvrir l'appareil photo
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0].uri) {
        // Si une photo a été prise, mettre à jour l'état local
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erreur lors de la prise de photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre une photo.');
    }
  };

  const removeImage = () => {
    setImageUri(undefined);
  };

  const handleSave = () => {
    if (!trip) return;
    if (!title.trim()) {
      Alert.alert("Erreur", "Le titre est obligatoire");
      return;
    }

    const budgetNumber = budget ? parseFloat(budget) : undefined;

    updateTrip(
      trip.id,
      {
        title,
        destination: destination || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        budget: budgetNumber,
        notes: notes || undefined,
        imageUri: imageUri,
      },
      (success) => {
        if (success) {
          Alert.alert("Succès", "Le voyage a été mis à jour avec succès");
          router.back();
        } else {
          Alert.alert("Erreur", "Impossible de mettre à jour le voyage");
        }
      }
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Chargement des données du voyage...</Text>
      </View>
    );
  }

  if (!trip) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Voyage non trouvé</Text>
        <Button title="Retour" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.form}>
        <TouchableOpacity onPress={handleChangeImage} style={styles.imageContainer}>
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={styles.headerImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>
                Appuyez pour ajouter une image
              </Text>
            </View>
          )}
          <View style={styles.imageOverlay}>
            <Text style={styles.changeImageText}>
              {imageUri ? "Modifier l'image" : "Ajouter une image"}
            </Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.label}>Titre*</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="Titre du voyage"
        />

        <Text style={styles.label}>Destination</Text>
        <TextInput
          style={styles.input}
          value={destination}
          onChangeText={setDestination}
          placeholder="Destination"
        />

        <Text style={styles.label}>Date de début</Text>
        <TextInput
          style={styles.input}
          value={startDate}
          onChangeText={setStartDate}
          placeholder="AAAA-MM-JJ"
        />

        <Text style={styles.label}>Date de fin</Text>
        <TextInput
          style={styles.input}
          value={endDate}
          onChangeText={setEndDate}
          placeholder="AAAA-MM-JJ"
        />

        <Text style={styles.label}>Budget (€)</Text>
        <TextInput
          style={styles.input}
          value={budget}
          onChangeText={setBudget}
          placeholder="Budget"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Notes supplémentaires"
          multiline
          numberOfLines={4}
        />
      </ScrollView>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>Annuler</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.saveButton]}
          onPress={handleSave}
        >
          <Text style={styles.buttonText}>Enregistrer</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
  },
  form: {
    flex: 1,
    padding: 16,
  },
  imageContainer: {
    position: 'relative',
    height: 200,
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#6c757d',
    fontSize: 16,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 8,
    alignItems: 'center',
  },
  changeImageText: {
    color: 'white',
    fontWeight: 'bold',
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: "#6c757d",
  },
  saveButton: {
    backgroundColor: "#007AFF",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
});

export default EditTripScreen;