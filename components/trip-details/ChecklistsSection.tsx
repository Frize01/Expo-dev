import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
    Checklist,
    ChecklistItem,
    addChecklist,
    addChecklistItem,
    deleteChecklist,
    deleteChecklistItem,
    getChecklistItems,
    toggleChecklistItemCheck,
    updateChecklist,
    updateChecklistItem
} from '../../lib/db';
import { commonStyles } from '../../styles/common';

type ChecklistsSectionProps = {
  tripId: number;
  checklists: Checklist[];
  onChecklistsUpdated: () => void;
};

export const ChecklistsSection = ({ 
  tripId, 
  checklists, 
  onChecklistsUpdated 
}: ChecklistsSectionProps) => {
  // États pour la gestion des checklists
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

  // Charger les éléments d'une checklist
  const loadChecklistItems = (checklistId: number) => {
    getChecklistItems(checklistId, (items) => {
      setChecklistItems(prev => ({
        ...prev,
        [checklistId]: items
      }));
    });
  };

  // Basculer l'état d'expansion d'une checklist
  const toggleChecklistExpansion = (checklistId: number) => {
    // Si on ouvre la checklist et qu'on n'a pas encore chargé ses éléments, on les charge
    if (!expandedChecklists[checklistId] && !checklistItems[checklistId]) {
      loadChecklistItems(checklistId);
    }

    setExpandedChecklists(prev => ({
      ...prev,
      [checklistId]: !prev[checklistId]
    }));
  };
  
  // Fonctions de gestion des checklists
  const handleAddChecklist = () => {
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
                onChecklistsUpdated();
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
            onChecklistsUpdated();
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
          trip_id: tripId,
          title: newChecklist.title,
          description: newChecklist.description || undefined
        },
        (success) => {
          if (success) {
            setShowChecklistModal(false);
            onChecklistsUpdated();
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
                loadChecklistItems(checklistId);
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
            loadChecklistItems(currentChecklistId);
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
            loadChecklistItems(currentChecklistId);
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
        loadChecklistItems(checklistId);
      }
    });
  };

  return (
    <>
      <View style={commonStyles.section}>
        <View style={styles.sectionHeader}>
          <Text style={commonStyles.sectionTitle}>Checklists</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={handleAddChecklist}
          >
            <Text style={styles.addButtonText}>+ Ajouter une checklist</Text>
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
                  
                  <View style={styles.checklistActions}>
                    <TouchableOpacity 
                      style={[styles.checklistActionButton, styles.editButton]} 
                      onPress={() => handleEditChecklist(checklist)}
                    >
                      <Text style={styles.checklistActionButtonText}>Modifier</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.checklistActionButton, styles.deleteButton]} 
                      onPress={() => handleDeleteChecklist(checklist.id)}
                    >
                      <Text style={styles.checklistActionButtonText}>Supprimer</Text>
                    </TouchableOpacity>
                  </View>

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
                            style={[styles.checklistItemButton, styles.editButton]} 
                            onPress={() => handleEditChecklistItem(item)}
                          >
                            <Text style={styles.checklistItemButtonText}>Modifier</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={[styles.checklistItemButton, styles.deleteButton]} 
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

      {/* Modal pour ajouter/modifier une checklist */}
      <Modal
        visible={showChecklistModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowChecklistModal(false)}
      >
        <View style={commonStyles.modalContainer}>
          <View style={commonStyles.modalContent}>
            <Text style={commonStyles.modalTitle}>
              {isChecklistEditMode ? "Modifier la checklist" : "Ajouter une checklist"}
            </Text>

            <TextInput
              style={commonStyles.input}
              placeholder="Titre de la checklist"
              value={newChecklist.title}
              onChangeText={(text) => setNewChecklist({ ...newChecklist, title: text })}
            />

            <TextInput
              style={[commonStyles.input, commonStyles.textArea]}
              placeholder="Description"
              value={newChecklist.description}
              onChangeText={(text) => setNewChecklist({ ...newChecklist, description: text })}
              multiline={true}
              numberOfLines={4}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[commonStyles.button, commonStyles.backButton]}
                onPress={() => setShowChecklistModal(false)}
              >
                <Text style={commonStyles.buttonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[commonStyles.button, commonStyles.primaryButton]}
                onPress={handleSaveChecklist}
              >
                <Text style={commonStyles.buttonText}>
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
        <View style={commonStyles.modalContainer}>
          <View style={commonStyles.modalContent}>
            <Text style={commonStyles.modalTitle}>
              {isItemEditMode ? "Modifier l'élément" : "Ajouter un élément"}
            </Text>

            <TextInput
              style={commonStyles.input}
              placeholder="Texte de l'élément"
              value={newItem.text}
              onChangeText={(text) => setNewItem({ ...newItem, text: text })}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[commonStyles.button, commonStyles.backButton]}
                onPress={() => setShowItemModal(false)}
              >
                <Text style={commonStyles.buttonText}>Annuler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[commonStyles.button, commonStyles.primaryButton]}
                onPress={handleSaveChecklistItem}
              >
                <Text style={commonStyles.buttonText}>
                  {isItemEditMode ? "Modifier" : "Ajouter"}
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
  checklistActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 10,
  },
  checklistActionButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginLeft: 4,
  },
  editButton: {
    backgroundColor: '#007AFF',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  checklistActionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  checklistItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 8,
  },
  checklistItemTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  checklistItemButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  emptyChecklistItems: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  addChecklistItemButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginTop: 8,
    alignSelf: 'flex-start',
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
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});