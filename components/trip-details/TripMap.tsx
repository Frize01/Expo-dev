import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { commonStyles } from '../../styles/common';

type TripMapProps = {
  destination: string;
  coordinates: {
    lat: number;
    lon: number;
  };
};

export const TripMap = ({ destination, coordinates }: TripMapProps) => {
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
          const map = L.map('map').setView([${coordinates.lat}, ${coordinates.lon}], 13);
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          }).addTo(map);
          L.marker([${coordinates.lat}, ${coordinates.lon}]).addTo(map)
            .bindPopup("${destination}")
            .openPopup();
        </script>
      </body>
      </html>
    `;
  };

  return (
    <View style={[commonStyles.section, styles.mapSection]}>
      <Text style={commonStyles.sectionTitle}>Carte</Text>
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
  );
};

const styles = StyleSheet.create({
  mapSection: {
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
});