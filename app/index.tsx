import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { authenticateUser, createUser, initDatabase, resetDatabase } from '../lib/db';

// Initialiser la base de données au démarrage
initDatabase();

const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleResetDatabase = () => {
    Alert.alert(
      'Réinitialisation de la base de données',
      'Êtes-vous sûr de vouloir réinitialiser la base de données ? Toutes les données seront perdues.',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Réinitialiser', 
          style: 'destructive',
          onPress: async () => {
            try {
              await resetDatabase();
              Alert.alert('Succès', 'La base de données a été réinitialisée avec succès.');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de réinitialiser la base de données.');
            }
          }
        }
      ]
    );
  };

  const handleLogin = () => {
    authenticateUser(username, password, (success) => {
      if (success) {
        Alert.alert('Succès', 'Connexion réussie !');
        router.push('/HomeScreen'); // Naviguer vers l'écran d'accueil
      } else {
        Alert.alert('Erreur', 'Nom d\'utilisateur ou mot de passe incorrect.');
      }
    });
  };

  const handleSignUp = () => {
    // Exemple de logique pour la création d'un compte
    if (!username || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs.');
      return;
    }

    createUser(username, password, (success) => {
      if (success) {
        Alert.alert('Succès', 'Compte créé avec succès !');
      } else {
        Alert.alert('Erreur', 'Impossible de créer le compte. Veuillez réessayer.');
      }
    });
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.resetButton} 
        onPress={handleResetDatabase}
      >
        <Text style={styles.resetButtonText}>⟲ Réinitialiser BDD</Text>
      </TouchableOpacity>
      
      <Text style={styles.title}>Connexion</Text>
      <TextInput
        style={styles.input}
        placeholder="Nom d'utilisateur"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <View style={{ gap: 10 }}>
        <Button title="Se connecter" onPress={handleLogin} />
        <Button title="Créer un compte" onPress={handleSignUp} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  resetButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: '#ff6b6b',
    padding: 8,
    borderRadius: 5,
  },
  resetButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  }
});

export default LoginScreen;
