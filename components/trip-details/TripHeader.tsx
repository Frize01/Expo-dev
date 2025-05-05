import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { updateTrip } from '../../lib/db';

type TripHeaderProps = {
  tripId: number;
  title: string;
  imageUri?: string;
  onImageUpdated: () => void;
};

export const TripHeader = ({ tripId, title, imageUri, onImageUpdated }: TripHeaderProps) => {
  const handleChangeImage = () => {
    Alert.alert(
      "Changer l'image",
      "Choisissez une source pour l'image",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Galerie", onPress: pickImage },
        { text: "Appareil photo", onPress: takePicture }
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
        // Si une image a été sélectionnée, on met à jour le voyage
        updateTripImage(result.assets[0].uri);
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
        // Si une photo a été prise, on met à jour le voyage
        updateTripImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erreur lors de la prise de photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre une photo.');
    }
  };

  const updateTripImage = (imageUri: string) => {
    updateTrip(tripId, { imageUri }, (success) => {
      if (success) {
        // Appeler le callback pour informer le parent de la mise à jour
        onImageUpdated();
        Alert.alert('Succès', 'Image ajoutée avec succès !');
      } else {
        Alert.alert('Erreur', 'Impossible de mettre à jour l\'image du voyage.');
      }
    });
  };

  return (
    <>
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

      <Text style={styles.title}>{title}</Text>

      <TouchableOpacity
        style={styles.journalButton}
        onPress={() => router.push({
          pathname: '/journal',
          params: { tripId }
        })}
      >
        <Ionicons name="book-outline" size={24} color="white" />
        <Text style={styles.journalButtonText}>Voir le journal de bord</Text>
      </TouchableOpacity>
    </>
  );
};

const styles = StyleSheet.create({
  imageContainer: {
    position: 'relative',
    height: 200,
    marginBottom: 16,
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
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  journalButton: {
    backgroundColor: '#ff6b6b', 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  journalButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
});