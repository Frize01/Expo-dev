import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import * as FileSystem from 'expo-file-system';
import { Image } from 'expo-image';
import * as Print from 'expo-print';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getJournalEntryById, getJournalMediaByEntryId, getTripById, getTripStepById, JournalEntry, JournalMedia } from '../../lib/db';

export default function JournalEntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [media, setMedia] = useState<JournalMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [tripTitle, setTripTitle] = useState('');
  const [stepName, setStepName] = useState('');
  const [exporting, setExporting] = useState(false);

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
        
        // Charger les informations du voyage
        getTripById(journalEntry.trip_id, (trip) => {
          if (trip) {
            setTripTitle(trip.title);
          }
        });
        
        // Charger les informations de l'étape si applicable
        if (journalEntry.step_id) {
          getTripStepById(journalEntry.step_id, (step) => {
            if (step) {
              setStepName(step.name);
            }
          });
        }
        
        // Charger les médias associés
        getJournalMediaByEntryId(journalEntry.id, (entryMedia) => {
          setMedia(entryMedia);
          setLoading(false);
        });
      } else {
        Alert.alert('Erreur', 'Entrée introuvable');
        router.back();
      }
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

  // Filtrer les médias par type
  const getImageMedia = () => {
    return media.filter(m => m.media_type === 'image');
  };

  // Partager l'entrée
  const shareEntry = async () => {
    try {
      await Share.share({
        message: `${entry?.title}\n${formatDate(entry?.entry_date || '')}\n\n${entry?.content || ''}`,
        title: entry?.title || 'Entrée de journal',
      });
    } catch (error) {
      console.error('Erreur lors du partage:', error);
    }
  };

  // Générer le contenu HTML pour le PDF
  const generateHtml = () => {
    const images = getImageMedia();
    
    let imagesHtml = '';
    if (images.length > 0) {
      imagesHtml = '<div style="display: flex; flex-wrap: wrap; justify-content: center; margin-top: 20px;">';
      
      images.forEach(img => {
        imagesHtml += `
          <div style="margin: 10px; max-width: 45%;">
            <img src="${img.uri}" style="width: 100%; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);" />
            ${img.description ? `<p style="margin-top: 5px; font-size: 12px; color: #666;">${img.description}</p>` : ''}
          </div>
        `;
      });
      
      imagesHtml += '</div>';
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${entry?.title}</title>
          <style>
            body {
              font-family: 'Helvetica', sans-serif;
              margin: 0;
              padding: 20px;
              color: #333;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 1px solid #eee;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .trip {
              font-size: 18px;
              color: #666;
              margin-bottom: 5px;
            }
            .step {
              font-size: 16px;
              color: #888;
              margin-bottom: 10px;
            }
            .date {
              font-size: 14px;
              color: #888;
              font-style: italic;
            }
            .content {
              line-height: 1.6;
              margin-bottom: 30px;
              white-space: pre-wrap;
            }
            .footer {
              margin-top: 50px;
              text-align: center;
              font-size: 12px;
              color: #999;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="title">${entry?.title}</div>
              <div class="trip">Voyage : ${tripTitle}</div>
              ${stepName ? `<div class="step">Étape : ${stepName}</div>` : ''}
              <div class="date">${formatDate(entry?.entry_date || '')}</div>
            </div>
            
            ${entry?.content ? `<div class="content">${entry.content}</div>` : ''}
            
            ${imagesHtml}
            
            <div class="footer">
              Exporté depuis TripFlow - ${new Date().toLocaleDateString('fr-FR')}
            </div>
          </div>
        </body>
      </html>
    `;
  };

  // Exporter en PDF
  const exportToPdf = async () => {
    try {
      setExporting(true);
      
      const html = generateHtml();
      const { uri } = await Print.printToFileAsync({ html });
      
      if (Platform.OS === 'ios') {
        await Sharing.shareAsync(uri);
      } else {
        const pdfName = `${entry?.title.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`;
        const destinationUri = FileSystem.documentDirectory + pdfName;
        
        await FileSystem.copyAsync({
          from: uri,
          to: destinationUri
        });
        
        await Sharing.shareAsync(destinationUri);
      }
      
      setExporting(false);
    } catch (error) {
      setExporting(false);
      console.error('Erreur lors de l\'export en PDF:', error);
      Alert.alert('Erreur', 'Impossible d\'exporter en PDF');
    }
  };

  // Exporter en album photo (page web simple)
  const exportAsPhotoAlbum = async () => {
    try {
      setExporting(true);
      
      const html = generateHtml();
      const tempFile = FileSystem.cacheDirectory + `album_${new Date().getTime()}.html`;
      
      await FileSystem.writeAsStringAsync(tempFile, html, {
        encoding: FileSystem.EncodingType.UTF8
      });
      
      // Utiliser Sharing.shareAsync au lieu de WebBrowser.openBrowserAsync pour éviter l'erreur FileUriExposedException
      if (Platform.OS === 'android') {
        // Sur Android, partager le fichier avec un intent approprié
        await Sharing.shareAsync(tempFile, {
          UTI: '.html',
          mimeType: 'text/html'
        });
      } else {
        // Sur iOS, on peut continuer à utiliser WebBrowser
        await WebBrowser.openBrowserAsync('file://' + tempFile);
      }
      
      setExporting(false);
    } catch (error) {
      setExporting(false);
      console.error('Erreur lors de l\'export en album photo:', error);
      Alert.alert('Erreur', 'Impossible d\'exporter en album photo');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff6b6b" />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    );
  }

  if (exporting) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff6b6b" />
        <Text style={styles.loadingText}>Préparation de l'export...</Text>
      </View>
    );
  }

  const images = getImageMedia();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{entry?.title}</Text>
        {stepName ? (
          <Text style={styles.subtitle}>
            <Text style={styles.tripText}>{tripTitle}</Text> · {stepName}
          </Text>
        ) : (
          <Text style={styles.subtitle}>{tripTitle}</Text>
        )}
        <Text style={styles.date}>{formatDate(entry?.entry_date || '')}</Text>
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.contentContainer}>
        {entry?.content && (
          <Text style={styles.entryContent}>{entry.content}</Text>
        )}

        {images.length > 0 && (
          <View style={styles.imagesContainer}>
            <Text style={styles.sectionTitle}>Photos</Text>
            <View style={styles.imageGrid}>
              {images.map((img, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image 
                    source={{ uri: img.uri }} 
                    style={styles.image} 
                    contentFit="cover"
                  />
                  {img.description && (
                    <Text style={styles.imageCaption}>{img.description}</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={shareEntry}>
          <Ionicons name="share-outline" size={22} color="#666" />
          <Text style={styles.actionText}>Partager</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={exportToPdf}>
          <Ionicons name="document-outline" size={22} color="#666" />
          <Text style={styles.actionText}>PDF</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={exportAsPhotoAlbum}>
          <Ionicons name="images-outline" size={22} color="#666" />
          <Text style={styles.actionText}>Album</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => router.push({
            pathname: `/journal/edit`,
            params: { id: entry?.id }
          })}
        >
          <Ionicons name="pencil-outline" size={22} color="#666" />
          <Text style={styles.actionText}>Modifier</Text>
        </TouchableOpacity>
      </View>
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
  tripText: {
    fontWeight: '500',
  },
  date: {
    fontSize: 14,
    color: '#888',
    marginTop: 6,
    fontStyle: 'italic',
  },
  scrollContainer: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  entryContent: {
    fontSize: 16,
    lineHeight: 24,
    color: '#444',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  imagesContainer: {
    marginTop: 8,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  imageWrapper: {
    width: '48%',
    marginBottom: 16,
  },
  image: {
    width: '100%',
    height: 150,
    borderRadius: 8,
  },
  imageCaption: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e1e4e8',
    justifyContent: 'space-around',
  },
  actionButton: {
    alignItems: 'center',
    padding: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
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
});