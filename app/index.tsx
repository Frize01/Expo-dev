import React, { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { authenticateUser, createUser, initDatabase } from '../lib/db';

// Initialiser la base de données au démarrage
initDatabase();

const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    authenticateUser(username, password, (success) => {
      if (success) {
        Alert.alert('Succès', 'Connexion réussie !');
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
});

export default LoginScreen;
