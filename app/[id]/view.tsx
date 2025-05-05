import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    Alert,
    Dimensions,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import {
    addChecklist,
    addChecklistItem,
    addTripStep,
    Checklist,
    ChecklistItem,
    deleteChecklist,
    deleteChecklistItem,
    deleteTrip,
    deleteTripStep,
    getChecklistItems,
    getChecklistsByTripId,
    getTripById,
    getTripSteps,
    toggleChecklistItemCheck,
    TripStep,
    updateChecklist,
    updateChecklistItem,
    updateTrip,
    updateTripStep
} from "../../lib/db";

const { width } = Dimensions.get('window');

type Trip = {
    id: number;
    title: string;
    destination?: string;
    startDate?: string;
    endDate?: string;
    budget?: number;
    notes?: string;
    imageUri?: string;
    latitude?: number;
    longitude?: number;
    steps?: TripStep[];
    checklists?: Checklist[];
};

const TripDetailScreen = () => {
    const { id } = useLocalSearchParams();
    const [trip, setTrip] = useState<Trip | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [mapCoordinates, setMapCoordinates] = useState({
        lat: 0,
        lon: 0,
    });
    
    // États pour la gestion des étapes
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
    
    // États pour la gestion des checklists
    const [checklists, setChecklists] = useState<Checklist[]>([]);
    const [showChecklistModal, setShowChecklistModal] = useState(false);
    const [currentChecklist, setCurrentChecklist] = useState<Checklist | null>(null);
    const [newChecklist, setNewChecklist] = useState({
        title: '',
        description: '',
    });
    const [isChecklistEditMode, setIsChecklistEditMode] = useState(false);
    
    // États pour la gestion des items de checklist
    const [checklistItems, setChecklistItems] = useState<{[key: number]: ChecklistItem[]}>({});
    const [showItemModal, setShowItemModal] = useState(false);
    const [currentChecklistId, setCurrentChecklistId] = useState<number | null>(null);
    const [currentItem, setCurrentItem] = useState<ChecklistItem | null>(null);
    const [newItem, setNewItem] = useState({
        text: '',
        is_checked: false
    });
    const [isItemEditMode, setIsItemEditMode] = useState(false);
    const [expandedChecklists, setExpandedChecklists] = useState<{[key: number]: boolean}>({});

    useEffect(() => {
        if (id) {
            loadTrip(Number(id));
            loadChecklists(Number(id));
        }
    }, [id]);

    useEffect(() => {
        // Si la destination change, essayer de géocoder pour obtenir les coordonnées
        if (trip?.destination) {
            geocodeDestination(trip.destination);
        }
    }, [trip?.destination]);

    const geocodeDestination = async (destination: string) => {
        try {
            // Utilisation de l'API de géocodage Nominatim d'OpenStreetMap
            // Ajout d'un User-Agent pour respecter les conditions d'utilisation de l'API
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destination)}`,
                {
                    headers: {
                        "User-Agent": "TripFlow-App/1.0", // User-Agent obligatoire pour Nominatim
                        "Accept": "application/json"
                    }
                }
            );
            
            // Vérifier si la réponse est OK avant de parser le JSON
            if (!response.ok) {
                throw new Error(`Réponse API non valide: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                setMapCoordinates({
                    lat: parseFloat(lat),
                    lon: parseFloat(lon),
                });
            }
        } catch (error) {
            console.error("Erreur de géocodage:", error);
            // Garder les coordonnées par défaut en cas d'erreur
        }
    };

    const loadTrip = (tripId: number) => {
        setIsLoading(true);
        getTripById(tripId, (tripData) => {
            // Chargement du voyage
            if (tripData) {
                // Charger les étapes du voyage
                getTripSteps(tripId, (steps) => {
                    setTrip({ ...tripData, steps });
                    setIsLoading(false);
                    
                    if (tripData?.destination) {
                        geocodeDestination(tripData.destination);
                    }
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
            
            // Pour chaque checklist, charger ses éléments
            const newExpandedState: {[key: number]: boolean} = {};
            checklistsData.forEach(checklist => {
                // Par défaut, toutes les checklists sont repliées
                newExpandedState[checklist.id] = false;
                
                // Charger les éléments de la checklist
                getChecklistItems(checklist.id, (items) => {
                    setChecklistItems(prev => ({
                        ...prev,
                        [checklist.id]: items
                    }));
                });
            });
            
            setExpandedChecklists(newExpandedState);
        });
    };

    // Basculer l'état d'expansion d'une checklist
    const toggleChecklistExpansion = (checklistId: number) => {
        setExpandedChecklists(prev => ({
            ...prev,
            [checklistId]: !prev[checklistId]
        }));
    };
    
    // Fonctions de gestion des checklists
    const handleAddChecklist = () => {
        if (!trip) return;
        
        setNewChecklist({
            title: '',
            description: ''
        });
        setIsChecklistEditMode(false);
        setShowChecklistModal(true);
    };
    
    const handleEditChecklist = (checklist: Checklist) => {
        setCurrentChecklist(checklist);
        setNewChecklist({
            title: checklist.title,
            description: checklist.description || ''
        });
        setIsChecklistEditMode(true);
        setShowChecklistModal(true);
    };
    
    const handleDeleteChecklist = (checklistId: number) => {
        Alert.alert(
            "Supprimer la checklist",
            "Êtes-vous sûr de vouloir supprimer cette checklist ? Tous les éléments associés seront supprimés.",
            [
                { text: "Annuler", style: "cancel" },
                {
                    text: "Supprimer",
                    style: "destructive",
                    onPress: () => {
                        deleteChecklist(checklistId, (success) => {
                            if (success) {
                                // Recharger les checklists
                                loadChecklists(Number(id));
                                Alert.alert("Succès", "La checklist a été supprimée avec succès");
                            } else {
                                Alert.alert("Erreur", "Impossible de supprimer la checklist");
                            }
                        });
                    }
                }
            ]
        );
    };
    
    const handleSaveChecklist = () => {
        if (!trip) return;
        
        if (!newChecklist.title.trim()) {
            Alert.alert("Erreur", "Le titre de la checklist est obligatoire");
            return;
        }
        
        if (isChecklistEditMode && currentChecklist) {
            // Mode édition
            updateChecklist(
                currentChecklist.id,
                {
                    title: newChecklist.title,
                    description: newChecklist.description || undefined
                },
                (success) => {
                    if (success) {
                        setShowChecklistModal(false);
                        loadChecklists(Number(id));
                        Alert.alert("Succès", "La checklist a été modifiée avec succès");
                    } else {
                        Alert.alert("Erreur", "Impossible de modifier la checklist");
                    }
                }
            );
        } else {
            // Mode ajout
            addChecklist(
                {
                    trip_id: trip.id,
                    title: newChecklist.title,
                    description: newChecklist.description || undefined
                },
                (success, checklistId) => {
                    if (success) {
                        setShowChecklistModal(false);
                        loadChecklists(Number(id));
                        Alert.alert("Succès", "La checklist a été créée avec succès");
                    } else {
                        Alert.alert("Erreur", "Impossible de créer la checklist");
                    }
                }
            );
        }
    };
    
    // Fonctions de gestion des items de checklist
    const handleAddChecklistItem = (checklistId: number) => {
        setCurrentChecklistId(checklistId);
        setNewItem({
            text: '',
            is_checked: false
        });
        setIsItemEditMode(false);
        setShowItemModal(true);
    };
    
    const handleEditChecklistItem = (item: ChecklistItem) => {
        setCurrentItem(item);
        setCurrentChecklistId(item.checklist_id);
        setNewItem({
            text: item.text,
            is_checked: item.is_checked
        });
        setIsItemEditMode(true);
        setShowItemModal(true);
    };
    
    const handleDeleteChecklistItem = (itemId: number, checklistId: number) => {
        Alert.alert(
            "Supprimer cet élément",
            "Êtes-vous sûr de vouloir supprimer cet élément de la checklist ?",
            [
                { text: "Annuler", style: "cancel" },
                {
                    text: "Supprimer",
                    style: "destructive",
                    onPress: () => {
                        deleteChecklistItem(itemId, (success) => {
                            if (success) {
                                // Recharger les éléments de la checklist
                                getChecklistItems(checklistId, (items) => {
                                    setChecklistItems(prev => ({
                                        ...prev,
                                        [checklistId]: items
                                    }));
                                });
                                Alert.alert("Succès", "L'élément a été supprimé avec succès");
                            } else {
                                Alert.alert("Erreur", "Impossible de supprimer l'élément");
                            }
                        });
                    }
                }
            ]
        );
    };
    
    const handleSaveChecklistItem = () => {
        if (!currentChecklistId) return;
        
        if (!newItem.text.trim()) {
            Alert.alert("Erreur", "Le texte de l'élément est obligatoire");
            return;
        }
        
        if (isItemEditMode && currentItem) {
            // Mode édition
            updateChecklistItem(
                currentItem.id,
                {
                    text: newItem.text,
                    is_checked: newItem.is_checked
                },
                (success) => {
                    if (success) {
                        setShowItemModal(false);
                        getChecklistItems(currentChecklistId, (items) => {
                            setChecklistItems(prev => ({
                                ...prev,
                                [currentChecklistId]: items
                            }));
                        });
                        Alert.alert("Succès", "L'élément a été modifié avec succès");
                    } else {
                        Alert.alert("Erreur", "Impossible de modifier l'élément");
                    }
                }
            );
        } else {
            // Mode ajout
            addChecklistItem(
                {
                    checklist_id: currentChecklistId,
                    text: newItem.text,
                    is_checked: newItem.is_checked
                },
                (success) => {
                    if (success) {
                        setShowItemModal(false);
                        getChecklistItems(currentChecklistId, (items) => {
                            setChecklistItems(prev => ({
                                ...prev,
                                [currentChecklistId]: items
                            }));
                        });
                        Alert.alert("Succès", "L'élément a été ajouté avec succès");
                    } else {
                        Alert.alert("Erreur", "Impossible d'ajouter l'élément");
                    }
                }
            );
        }
    };
    
    const handleToggleChecklistItem = (itemId: number, checklistId: number) => {
        toggleChecklistItemCheck(itemId, (success) => {
            if (success) {
                // Recharger les éléments de la checklist
                getChecklistItems(checklistId, (items) => {
                    setChecklistItems(prev => ({
                        ...prev,
                        [checklistId]: items
                    }));
                });
            }
        });
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return "Non définie";
        const date = new Date(dateString);
        return date.toLocaleDateString("fr-FR");
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
        if (!trip) return;

        updateTrip(trip.id, { imageUri }, (success) => {
            if (success) {
                // Recharger les données du voyage pour afficher la nouvelle image
                loadTrip(trip.id);
                Alert.alert('Succès', 'Image ajoutée avec succès !');
            } else {
                Alert.alert('Erreur', 'Impossible de mettre à jour l\'image du voyage.');
            }
        });
    };

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

    // HTML pour afficher OpenStreetMap dans la WebView
    const getMapHTML = () => {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />
                <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
                <style>
                    html, body, #map {
                        height: 100%;
                        width: 100%;
                        margin: 0;
                        padding: 0;
                    }
                </style>
            </head>
            <body>
                <div id="map"></div>
                <script>
                    const map = L.map('map').setView([${mapCoordinates.lat}, ${mapCoordinates.lon}], 13);
                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    }).addTo(map);
                    L.marker([${mapCoordinates.lat}, ${mapCoordinates.lon}]).addTo(map)
                        .bindPopup("${trip?.destination || 'Destination'}")
                        .openPopup();
                </script>
            </body>
            </html>
        `;
    };

    // Gestion des étapes du voyage
    const handleAddStep = () => {
        if (!trip) return;
        
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
                                // Recharger les données du voyage
                                loadTrip(Number(id));
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
        if (!trip) return;
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
                        loadTrip(Number(id));
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
                    trip_id: trip.id,
                    name: newStep.name,
                    location: newStep.location || undefined,
                    startDate: newStep.startDate.toISOString(),
                    endDate: newStep.endDate.toISOString(),
                    description: newStep.description || undefined,
                },
                (success) => {
                    if (success) {
                        setShowStepModal(false);
                        loadTrip(Number(id));
                        Alert.alert("Succès", "L'étape a été ajoutée avec succès");
                    } else {
                        Alert.alert("Erreur", "Impossible d'ajouter l'étape");
                    }
                }
            );
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <Text>Chargement des détails du voyage...</Text>
            </View>
        );
    }

    if (!trip) {
        return (
            <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Voyage non trouvé</Text>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => router.back()}
                >
                    <Text style={styles.buttonText}>Retour</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.detailsContainer}>
                <TouchableOpacity onPress={handleChangeImage} style={styles.imageContainer}>
                    {trip.imageUri ? (
                        <Image
                            source={{ uri: trip.imageUri }}
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
                            {trip.imageUri ? "Modifier l'image" : "Ajouter une image"}
                        </Text>
                    </View>
                </TouchableOpacity>

                <Text style={styles.title}>{trip.title}</Text>

                {/* Bouton pour accéder au journal de bord */}
                <TouchableOpacity
                    style={styles.journalButton}
                    onPress={() => router.push({
                        pathname: '/journal',
                        params: { tripId: trip.id }
                    })}
                >
                    <Ionicons name="book-outline" size={24} color="white" />
                    <Text style={styles.journalButtonText}>Voir le journal de bord</Text>
                </TouchableOpacity>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Destination</Text>
                    <Text style={styles.sectionContent}>
                        {trip.destination || "Non renseignée"}
                    </Text>
                </View>

                {trip.destination && (
                    <View style={styles.mapSection}>
                        <Text style={styles.sectionTitle}>Carte</Text>
                        <View style={styles.map}>
                            <WebView
                                originWhitelist={['*']}
                                source={{ html: getMapHTML() }}
                                style={styles.webview}
                                scrollEnabled={false}
                                javaScriptEnabled={true}
                                domStorageEnabled={true}
                                androidHardwareAccelerationDisabled={false}
                            />
                        </View>
                        <Text style={styles.mapAttribution}>
                            © OpenStreetMap contributors
                        </Text>
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Dates du voyage</Text>
                    <Text style={styles.sectionContent}>
                        Du {formatDate(trip.startDate)} au{" "}
                        {formatDate(trip.endDate)}
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Budget</Text>
                    <Text style={styles.sectionContent}>
                        {trip.budget ? `${trip.budget} €` : "Non renseigné"}
                    </Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Notes</Text>
                    <Text style={styles.sectionContent}>
                        {trip.notes || "Aucune note"}
                    </Text>
                </View>

                {/* Section des étapes du voyage */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Étapes du voyage</Text>
                        <TouchableOpacity 
                            style={styles.addStepButton}
                            onPress={handleAddStep}
                        >
                            <Text style={styles.addStepButtonText}>+ Ajouter une étape</Text>
                        </TouchableOpacity>
                    </View>

                    {trip.steps && trip.steps.length > 0 ? (
                        trip.steps.map((step) => (
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

                {/* Section des checklists */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Checklists</Text>
                        <TouchableOpacity 
                            style={styles.addStepButton}
                            onPress={handleAddChecklist}
                        >
                            <Text style={styles.addStepButtonText}>+ Ajouter une checklist</Text>
                        </TouchableOpacity>
                    </View>

                    {checklists && checklists.length > 0 ? (
                        checklists.map((checklist) => (
                            <View key={checklist.id} style={styles.checklistItem}>
                                <TouchableOpacity 
                                    style={styles.checklistHeader}
                                    onPress={() => toggleChecklistExpansion(checklist.id)}
                                >
                                    <Text style={styles.checklistTitle}>{checklist.title}</Text>
                                    <Ionicons 
                                        name={expandedChecklists[checklist.id] ? "chevron-up" : "chevron-down"} 
                                        size={24} 
                                        color="#007AFF" 
                                    />
                                </TouchableOpacity>
                                {expandedChecklists[checklist.id] && (
                                    <View style={styles.checklistContent}>
                                        <Text style={styles.checklistDescription}>
                                            {checklist.description || "Aucune description"}
                                        </Text>
                                        {checklistItems[checklist.id] && checklistItems[checklist.id].length > 0 ? (
                                            checklistItems[checklist.id].map((item) => (
                                                <View key={item.id} style={styles.checklistItemRow}>
                                                    <TouchableOpacity 
                                                        style={styles.checklistItemTextContainer}
                                                        onPress={() => handleToggleChecklistItem(item.id, checklist.id)}
                                                    >
                                                        <Ionicons 
                                                            name={item.is_checked ? "checkbox-outline" : "square-outline"} 
                                                            size={24} 
                                                            color="#007AFF" 
                                                        />
                                                        <Text 
                                                            style={[
                                                                styles.checklistItemText, 
                                                                item.is_checked && styles.checklistItemTextChecked
                                                            ]}
                                                        >
                                                            {item.text}
                                                        </Text>
                                                    </TouchableOpacity>
                                                    <View style={styles.checklistItemActions}>
                                                        <TouchableOpacity 
                                                            style={[styles.checklistItemButton, styles.editChecklistItemButton]} 
                                                            onPress={() => handleEditChecklistItem(item)}
                                                        >
                                                            <Text style={styles.checklistItemButtonText}>Modifier</Text>
                                                        </TouchableOpacity>
                                                        <TouchableOpacity 
                                                            style={[styles.checklistItemButton, styles.deleteChecklistItemButton]} 
                                                            onPress={() => handleDeleteChecklistItem(item.id, checklist.id)}
                                                        >
                                                            <Text style={styles.checklistItemButtonText}>Supprimer</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                </View>
                                            ))
                                        ) : (
                                            <Text style={styles.emptyChecklistItems}>Aucun élément dans cette checklist</Text>
                                        )}
                                        <TouchableOpacity 
                                            style={styles.addChecklistItemButton}
                                            onPress={() => handleAddChecklistItem(checklist.id)}
                                        >
                                            <Text style={styles.addChecklistItemButtonText}>+ Ajouter un élément</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        ))
                    ) : (
                        <Text style={styles.emptyChecklists}>Aucune checklist pour ce voyage</Text>
                    )}
                </View>
            </ScrollView>

            <View style={styles.buttonsContainer}>
                <TouchableOpacity
                    style={[styles.button, styles.backButton]}
                    onPress={() => router.back()}
                >
                    <Text style={styles.buttonText}>Retour</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.editButton]}
                    onPress={() => router.push(`/${trip.id}/edit`)}
                >
                    <Text style={styles.buttonText}>Modifier</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.deleteButton]}
                    onPress={handleDelete}
                >
                    <Text style={styles.buttonText}>Supprimer</Text>
                </TouchableOpacity>
            </View>

            {/* Modal pour ajouter/modifier une étape */}
            <Modal
                visible={showStepModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowStepModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {editMode ? "Modifier l'étape" : "Ajouter une étape"}
                        </Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Nom du lieu"
                            value={newStep.name}
                            onChangeText={(text) => setNewStep({ ...newStep, name: text })}
                        />

                        <TextInput
                            style={styles.input}
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
                            style={[styles.input, styles.textArea]}
                            placeholder="Description"
                            value={newStep.description}
                            onChangeText={(text) => setNewStep({ ...newStep, description: text })}
                            multiline={true}
                            numberOfLines={4}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.button, styles.cancelButton]}
                                onPress={() => setShowStepModal(false)}
                            >
                                <Text style={styles.buttonText}>Annuler</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.button, styles.saveButton]}
                                onPress={handleSaveStep}
                            >
                                <Text style={styles.buttonText}>
                                    {editMode ? "Modifier" : "Ajouter"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal pour ajouter/modifier une checklist */}
            <Modal
                visible={showChecklistModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowChecklistModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {isChecklistEditMode ? "Modifier la checklist" : "Ajouter une checklist"}
                        </Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Titre de la checklist"
                            value={newChecklist.title}
                            onChangeText={(text) => setNewChecklist({ ...newChecklist, title: text })}
                        />

                        <TextInput
                            style={[styles.input, styles.textArea]}
                            placeholder="Description"
                            value={newChecklist.description}
                            onChangeText={(text) => setNewChecklist({ ...newChecklist, description: text })}
                            multiline={true}
                            numberOfLines={4}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.button, styles.cancelButton]}
                                onPress={() => setShowChecklistModal(false)}
                            >
                                <Text style={styles.buttonText}>Annuler</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.button, styles.saveButton]}
                                onPress={handleSaveChecklist}
                            >
                                <Text style={styles.buttonText}>
                                    {isChecklistEditMode ? "Modifier" : "Ajouter"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Modal pour ajouter/modifier un élément de checklist */}
            <Modal
                visible={showItemModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowItemModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {isItemEditMode ? "Modifier l'élément" : "Ajouter un élément"}
                        </Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Texte de l'élément"
                            value={newItem.text}
                            onChangeText={(text) => setNewItem({ ...newItem, text: text })}
                        />

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.button, styles.cancelButton]}
                                onPress={() => setShowItemModal(false)}
                            >
                                <Text style={styles.buttonText}>Annuler</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.button, styles.saveButton]}
                                onPress={handleSaveChecklistItem}
                            >
                                <Text style={styles.buttonText}>
                                    {isItemEditMode ? "Modifier" : "Ajouter"}
                                </Text>
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
    detailsContainer: {
        flex: 1,
        padding: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 20,
        textAlign: "center",
    },
    section: {
        backgroundColor: "white",
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    mapSection: {
        backgroundColor: "white",
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        overflow: 'hidden',
    },
    map: {
        width: '100%',
        height: 200,
        borderRadius: 8,
        marginTop: 8,
        overflow: 'hidden',
    },
    webview: {
        width: '100%',
        height: '100%',
        borderRadius: 8,
    },
    mapAttribution: {
        fontSize: 10,
        color: '#6c757d',
        textAlign: 'right',
        marginTop: 4,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 8,
        color: "#007AFF",
    },
    sectionContent: {
        fontSize: 16,
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
    backButton: {
        backgroundColor: "#6c757d",
    },
    editButton: {
        backgroundColor: "#007AFF",
    },
    deleteButton: {
        backgroundColor: "#FF3B30",
    },
    buttonText: {
        color: "white",
        fontWeight: "bold",
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    addStepButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
    },
    addStepButtonText: {
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
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        width: '90%',
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    input: {
        height: 40,
        borderColor: '#ddd',
        borderWidth: 1,
        borderRadius: 4,
        paddingHorizontal: 8,
        marginBottom: 12,
    },
    textArea: {
        height: 80,
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
    cancelButton: {
        backgroundColor: '#6c757d',
    },
    saveButton: {
        backgroundColor: '#007AFF',
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
    checklistItem: {
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
    checklistHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    checklistTitle: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    checklistContent: {
        marginTop: 8,
    },
    checklistDescription: {
        fontSize: 14,
        color: '#6c757d',
        marginBottom: 8,
    },
    checklistItemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    checklistItemTextContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checklistItemText: {
        fontSize: 16,
        marginLeft: 8,
    },
    checklistItemTextChecked: {
        textDecorationLine: 'line-through',
        color: '#6c757d',
    },
    checklistItemActions: {
        flexDirection: 'row',
    },
    checklistItemButton: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
        marginLeft: 4,
    },
    editChecklistItemButton: {
        backgroundColor: '#007AFF',
    },
    deleteChecklistItemButton: {
        backgroundColor: '#FF3B30',
    },
    checklistItemButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    emptyChecklistItems: {
        fontSize: 14,
        color: '#6c757d',
        textAlign: 'center',
        marginTop: 8,
    },
    addChecklistItemButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 4,
        marginTop: 8,
    },
    addChecklistItemButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    emptyChecklists: {
        fontSize: 14,
        color: '#6c757d',
        textAlign: 'center',
        marginTop: 8,
    },
});

export default TripDetailScreen;
