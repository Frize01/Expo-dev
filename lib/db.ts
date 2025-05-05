import { openDatabaseSync } from 'expo-sqlite';

const db = openDatabaseSync('app.db');

export const initDatabase = () => {
  db.execAsync(
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      password TEXT NOT NULL
    );`
  );
};

export const authenticateUser = async (
  username: string,
  password: string,
  callback: (success: boolean) => void
) => {
  try {
    const result = await db.getFirstAsync(
      'SELECT * FROM users WHERE username = ? AND password = ?;',
      [username, password]
    );
    callback(!!result);
  } catch (error) {
    console.error('Erreur SQLite :', error);
    callback(false);
  }
};

export const createUser = async (
  username: string,
  password: string,
  callback: (success: boolean) => void
) => {
  try {
    await db.runAsync(
      'INSERT INTO users (username, password) VALUES (?, ?);',
      [username, password]
    );
    callback(true);
  } catch (error) {
    console.error('Erreur SQLite :', error);
    callback(false);
  }
};