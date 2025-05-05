import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChecklistsSection } from "../../components/trip-details/ChecklistsSection";
import { TripHeader } from "../../components/trip-details/TripHeader";
import { TripInfoSection } from "../../components/trip-details/TripInfoSection";
import { TripMap } from "../../components/trip-details/TripMap";
import { TripStepsSection } from "../../components/trip-details/TripStepsSection";
import { deleteTrip, getChecklistsByTripId, getTripById, getTripSteps } from "../../lib/db";
import { geocodeDestination } from "../../services/GeocodingService";
import { commonStyles } from "../../styles/common";
import { Trip } from "../../types/Trip";

const TripDetailScreen = () => {
    const { id } = useLocalSearchParams();
    const [trip, setTrip] = useState<Trip | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [mapCoordinates, setMapCoordinates] = useState({
        lat: 0,
        lon: 0,
    });
    const [checklists, setChecklists] = useState<any[]>([]);

    useEffect(() => {
        if (id) {
            loadTrip(Number(id));
            loadChecklists(Number(id));
        }
    }, [id]);

    useEffect(() => {
        // Si la destination change, essayer de géocoder pour obtenir les coordonnées
        if (trip?.destination) {
            fetchGeocodingData(trip.destination);
        }
    }, [trip?.destination]);

    const fetchGeocodingData = async (destination: string) => {
        const coordinates = await geocodeDestination(destination);
        if (coordinates) {
            setMapCoordinates(coordinates);
        }
    };

    const loadTrip = (tripId: number) => {
        setIsLoading(true);
        getTripById(tripId, (tripData) => {
            if (tripData) {
                // Charger les étapes du voyage
                getTripSteps(tripId, (steps) => {
                    setTrip({ ...tripData, steps });
                    setIsLoading(false);
                });
            } else {
                setTrip(null);
                setIsLoading(false);
            }
        });
    };

    // Charger les checklists du voyage
    const loadChecklists = (tripId: number) => {
        getChecklistsByTripId(tripId, (checklistsData) => {
            setChecklists(checklistsData);
        });
    };

    const handleDelete = () => {
        if (!trip) return;

        Alert.alert(
            "Supprimer le voyage",
            "Êtes-vous sûr de vouloir supprimer ce voyage ? Cette action est irréversible.",
            [
                { text: "Annuler", style: "cancel" },
                {
                    text: "Supprimer",
                    style: "destructive",
                    onPress: () => {
                        deleteTrip(trip.id, (success) => {
                            if (success) {
                                Alert.alert(
                                    "Succès",
                                    "Le voyage a été supprimé avec succès."
                                );
                                router.replace("/HomeScreen");
                            } else {
                                Alert.alert(
                                    "Erreur",
                                    "Impossible de supprimer le voyage."
                                );
                            }
                        });
                    },
                },
            ]
        );
    };

    if (isLoading) {
        return (
            <View style={commonStyles.loadingContainer}>
                <Text>Chargement des détails du voyage...</Text>
            </View>
        );
    }

    if (!trip) {
        return (
            <View style={commonStyles.errorContainer}>
                <Text style={commonStyles.errorText}>Voyage non trouvé</Text>
                <TouchableOpacity
                    style={[commonStyles.button, commonStyles.backButton]}
                    onPress={() => router.back()}
                >
                    <Text style={commonStyles.buttonText}>Retour</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={commonStyles.container}>
            <ScrollView style={styles.detailsContainer}>
                {/* En-tête avec image, titre et bouton journal */}
                <TripHeader 
                    tripId={trip.id}
                    title={trip.title}
                    imageUri={trip.imageUri}
                    onImageUpdated={() => loadTrip(trip.id)}
                />

                {/* Sections d'informations du voyage */}
                <TripInfoSection 
                    destination={trip.destination}
                    startDate={trip.startDate}
                    endDate={trip.endDate}
                    budget={trip.budget}
                    notes={trip.notes}
                />

                {/* Carte si une destination est définie */}
                {trip.destination && (
                    <TripMap 
                        destination={trip.destination}
                        coordinates={mapCoordinates}
                    />
                )}

                {/* Section des étapes du voyage */}
                <TripStepsSection 
                    tripId={trip.id}
                    steps={trip.steps || []}
                    onStepsUpdated={() => loadTrip(trip.id)}
                />

                {/* Section des checklists */}
                <ChecklistsSection 
                    tripId={trip.id}
                    checklists={checklists}
                    onChecklistsUpdated={() => loadChecklists(trip.id)}
                />
            </ScrollView>

            <View style={styles.buttonsContainer}>
                <TouchableOpacity
                    style={[commonStyles.button, commonStyles.backButton]}
                    onPress={() => router.back()}
                >
                    <Text style={commonStyles.buttonText}>Retour</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[commonStyles.button, commonStyles.primaryButton]}
                    onPress={() => router.push(`/${trip.id}/edit`)}
                >
                    <Text style={commonStyles.buttonText}>Modifier</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[commonStyles.button, commonStyles.dangerButton]}
                    onPress={handleDelete}
                >
                    <Text style={commonStyles.buttonText}>Supprimer</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    detailsContainer: {
        flex: 1,
        padding: 16,
    },
    buttonsContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        padding: 16,
        backgroundColor: "white",
        borderTopWidth: 1,
        borderTopColor: "#ddd",
    },
});

export default TripDetailScreen;
