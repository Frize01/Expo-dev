import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, Text, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getJournalEntriesByTripId, JournalEntry, getTripById, getJournalMediaByEntryId, JournalMedia } from '../../lib/db';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function JournalEntriesScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const router = useRouter();
  
  const [entries, setEntries] = useState<(JournalEntry & { media?: JournalMedia[] })[]>([]);
  const [tripTitle, setTripTitle] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!tripId) {
      Alert.alert('Erreur', 'Identifiant de voyage invalide');
      router.back();
      return;
    }

    // Récupérer les informations du voyage
    getTripById(parseInt(tripId), (trip) => {
      if (trip) {
        setTripTitle(trip.title);
      }
    });

    loadEntries();
  }, [tripId]);

  const loadEntries = () => {
    setLoading(true);
    getJournalEntriesByTripId(parseInt(tripId!), (journalEntries) => {
      // Pour chaque entrée, récupérer ses médias
      const entriesWithMedia: (JournalEntry & { media?: JournalMedia[] })[] = [];
      
      if (journalEntries.length === 0) {
        setEntries([]);
        setLoading(false);
        return;
      }

      let loadedCount = 0;
      journalEntries.forEach(entry => {
        getJournalMediaByEntryId(entry.id, (media) => {
          entriesWithMedia.push({
            ...entry,
            media
          });
          
          loadedCount++;
          if (loadedCount === journalEntries.length) {
            setEntries(entriesWithMedia);
            setLoading(false);
          }
        });
      });
    });
  };

  // Formater la date en français
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd MMMM yyyy', { locale: fr });
    } catch (error) {
      return dateString;
    }
  };

  // Trouver la première image pour l'entrée
  const getFirstImage = (media?: JournalMedia[]) => {
    if (!media || media.length === 0) return null;
    const image = media.find(m => m.media_type === 'image');
    return image ? image.uri : null;
  };

  const renderItem = ({ item }: { item: JournalEntry & { media?: JournalMedia[] } }) => {
    const firstImage = getFirstImage(item.media);
    const hasAudio = item.media?.some(m => m.media_type === 'audio');

    return (
      <TouchableOpacity
        style={styles.entryCard}
        onPress={() => router.push(`/journal/${item.id}`)}
      >
        <View style={styles.entryHeader}>
          <Text style={styles.entryTitle}>{item.title}</Text>
          <Text style={styles.entryDate}>{formatDate(item.entry_date)}</Text>
        </View>

        {firstImage && (
          <Image
            source={{ uri: firstImage }}
            style={styles.entryImage}
            contentFit="cover"
          />
        )}

        {item.content && (
          <Text style={styles.entryContent} numberOfLines={3}>
            {item.content}
          </Text>
        )}

        <View style={styles.entryFooter}>
          {hasAudio && (
            <View style={styles.mediaIndicator}>
              <Ionicons name="mic" size={16} color="#666" />
              <Text style={styles.mediaText}>Audio</Text>
            </View>
          )}
          
          <View style={styles.mediaIndicator}>
            <Ionicons name="images" size={16} color="#666" />
            <Text style={styles.mediaText}>
              {item.media?.filter(m => m.media_type === 'image').length || 0} photos
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Journal de voyage</Text>
        <Text style={styles.subtitle}>{tripTitle}</Text>
      </View>

      {loading ? (
        <View style={styles.emptyContainer}>
          <Text>Chargement...</Text>
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Aucune entrée dans le journal pour ce voyage</Text>
          <Text style={styles.emptySubText}>Ajoutez votre première entrée en appuyant sur le bouton +</Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
        />
      )}

      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => router.push({
          pathname: '/journal/new',
          params: { tripId }
        })}
      >
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>
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
  listContainer: {
    padding: 16,
  },
  entryCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  entryHeader: {
    padding: 16,
    paddingBottom: 8,
  },
  entryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  entryDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  entryImage: {
    width: '100%',
    height: 200,
  },
  entryContent: {
    padding: 16,
    paddingTop: 8,
    color: '#444',
  },
  entryFooter: {
    padding: 12,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  mediaIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  mediaText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  emptySubText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 64,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ff6b6b',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});