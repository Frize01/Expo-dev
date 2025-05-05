import { openDatabaseSync } from "expo-sqlite";

const db = openDatabaseSync("app.db");

export const initDatabase = async () => {
    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      password TEXT NOT NULL
    );
  `);

    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS trips (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      destination TEXT,
      startDate TEXT,
      endDate TEXT,
      budget REAL,
      notes TEXT,
      imageUri TEXT,
      user_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS trip_steps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      location TEXT,
      startDate TEXT,
      endDate TEXT,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
    );
  `);

    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS journal_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL,
      step_id INTEGER,
      title TEXT NOT NULL,
      content TEXT,
      entry_date TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE,
      FOREIGN KEY (step_id) REFERENCES trip_steps(id) ON DELETE SET NULL
    );
  `);

    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS journal_media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id INTEGER NOT NULL,
      media_type TEXT NOT NULL,
      uri TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (entry_id) REFERENCES journal_entries(id) ON DELETE CASCADE
    );
  `);

    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS checklists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
    );
  `);

    await db.execAsync(`
    CREATE TABLE IF NOT EXISTS checklist_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      checklist_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      is_checked BOOLEAN NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (checklist_id) REFERENCES checklists(id) ON DELETE CASCADE
    );
  `);
};

/**
 * Réinitialise la base de données en supprimant et recréant toutes les tables
 * @returns Promise<void>
 */
export const resetDatabase = async (): Promise<void> => {
    try {
        // Supprimer les tables dans l'ordre inverse (à cause des clés étrangères)
        await db.execAsync(`DROP TABLE IF EXISTS checklist_items;`);
        await db.execAsync(`DROP TABLE IF EXISTS checklists;`);
        await db.execAsync(`DROP TABLE IF EXISTS journal_media;`);
        await db.execAsync(`DROP TABLE IF EXISTS journal_entries;`);
        await db.execAsync(`DROP TABLE IF EXISTS trip_steps;`);
        await db.execAsync(`DROP TABLE IF EXISTS trips;`);
        await db.execAsync(`DROP TABLE IF EXISTS users;`);

        // Recréer les tables
        await initDatabase();

        console.log("Base de données réinitialisée avec succès");
    } catch (error) {
        console.error("Erreur lors de la réinitialisation de la base de données:", error);
        throw error;
    }
};

export const authenticateUser = async (
    username: string,
    password: string,
    callback: (success: boolean) => void
) => {
    try {
        const result = await db.getFirstAsync(
            "SELECT * FROM users WHERE username = ? AND password = ?;",
            [username, password]
        );
        callback(!!result);
    } catch (error) {
        console.error("Erreur SQLite :", error);
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
            "INSERT INTO users (username, password) VALUES (?, ?);",
            [username, password]
        );
        callback(true);
    } catch (error) {
        console.error("Erreur SQLite :", error);
        callback(false);
    }
};

export const addTrip = async (
    tripData: {
        title: string;
        destination?: string;
        startDate?: string;
        endDate?: string;
        budget?: number;
        notes?: string;
        imageUri?: string;
        user_id?: number;
    },
    callback: (success: boolean, id?: number) => void
) => {
    try {
        const result = await db.runAsync(
            "INSERT INTO trips (title, destination, startDate, endDate, budget, notes, imageUri, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?);",
            [
                tripData.title,
                tripData.destination ?? null,
                tripData.startDate ?? null,
                tripData.endDate ?? null,
                tripData.budget ?? null,
                tripData.notes ?? null,
                tripData.imageUri ?? null,
                tripData.user_id ?? null,
            ]
        );
        callback(true, result.lastInsertRowId);
    } catch (error) {
        console.error("Erreur SQLite lors de l'ajout du voyage:", error);
        callback(false);
    }
};

export const getTrips = async (callback: (trips: any[]) => void) => {
    try {
        const result = await db.getAllAsync(
            "SELECT * FROM trips ORDER BY created_at DESC;"
        );
        callback(result);
    } catch (error) {
        console.error(
            "Erreur SQLite lors de la récupération des voyages:",
            error
        );
        callback([]);
    }
};

export const getTripById = async (
    id: number,
    callback: (trip: any | null) => void
) => {
    try {
        const result = await db.getFirstAsync(
            "SELECT * FROM trips WHERE id = ?;",
            [id]
        );
        callback(result || null);
    } catch (error) {
        console.error(
            "Erreur SQLite lors de la récupération du voyage:",
            error
        );
        callback(null);
    }
};

export const updateTrip = async (
    id: number,
    tripData: {
        title?: string;
        destination?: string;
        startDate?: string;
        endDate?: string;
        budget?: number;
        notes?: string;
        imageUri?: string;
    },
    callback: (success: boolean) => void
) => {
    try {
        const currentTrip = await db.getFirstAsync<{
            title: string;
            destination?: string;
            startDate?: string;
            endDate?: string;
            budget?: number;
            notes?: string;
            imageUri?: string;
        }>("SELECT * FROM trips WHERE id = ?;", [id]);

        if (!currentTrip) {
            callback(false);
            return;
        }

        await db.runAsync(
            `UPDATE trips SET
        title = ?,
        destination = ?,
        startDate = ?,
        endDate = ?,
        budget = ?,
        notes = ?,
        imageUri = ?
            WHERE id = ?;`,
            [
          tripData.title ?? currentTrip.title,
          tripData.destination ?? currentTrip.destination ?? null,
          tripData.startDate ?? currentTrip.startDate ?? null,
          tripData.endDate ?? currentTrip.endDate ?? null,
          tripData.budget ?? currentTrip.budget ?? null,
          tripData.notes ?? currentTrip.notes ?? null,
          tripData.imageUri ?? currentTrip.imageUri ?? null,
          id,
            ]
        );
        callback(true);
    } catch (error) {
        console.error("Erreur SQLite lors de la mise à jour du voyage:", error);
        callback(false);
    }
};

export const deleteTrip = async (
    id: number,
    callback: (success: boolean) => void
) => {
    try {
        await db.runAsync("DELETE FROM trips WHERE id = ?;", [id]);
        callback(true);
    } catch (error) {
        console.error("Erreur SQLite lors de la suppression du voyage:", error);
        callback(false);
    }
};

// Types pour les étapes du voyage
export type TripStep = {
    id: number;
    trip_id: number;
    name: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    created_at?: string;
};

export type TripStepInput = Omit<TripStep, 'id' | 'trip_id' | 'created_at'> & {
    trip_id: number;
};

// Ajout d'une étape du voyage
export const addTripStep = async (
    stepData: TripStepInput,
    callback: (success: boolean, id?: number) => void
) => {
    try {
        const result = await db.runAsync(
            "INSERT INTO trip_steps (trip_id, name, location, startDate, endDate, description) VALUES (?, ?, ?, ?, ?, ?);",
            [
                stepData.trip_id,
                stepData.name,
                stepData.location ?? null,
                stepData.startDate ?? null,
                stepData.endDate ?? null,
                stepData.description ?? null,
            ]
        );
        callback(true, result.lastInsertRowId);
    } catch (error) {
        console.error("Erreur SQLite lors de l'ajout de l'étape:", error);
        callback(false);
    }
};

// Récupération des étapes d'un voyage
export const getTripSteps = async (
    tripId: number,
    callback: (steps: TripStep[]) => void
) => {
    try {
        const result = await db.getAllAsync<TripStep>(
            "SELECT * FROM trip_steps WHERE trip_id = ? ORDER BY startDate ASC, created_at ASC;",
            [tripId]
        );
        callback(result);
    } catch (error) {
        console.error("Erreur SQLite lors de la récupération des étapes:", error);
        callback([]);
    }
};

// Récupération d'une étape spécifique
export const getTripStepById = async (
    stepId: number,
    callback: (step: TripStep | null) => void
) => {
    try {
        const result = await db.getFirstAsync<TripStep>(
            "SELECT * FROM trip_steps WHERE id = ?;",
            [stepId]
        );
        callback(result || null);
    } catch (error) {
        console.error("Erreur SQLite lors de la récupération de l'étape:", error);
        callback(null);
    }
};

// Mise à jour d'une étape
export const updateTripStep = async (
    stepId: number,
    stepData: Partial<Omit<TripStep, 'id' | 'trip_id' | 'created_at'>>,
    callback: (success: boolean) => void
) => {
    try {
        const currentStep = await db.getFirstAsync<TripStep>(
            "SELECT * FROM trip_steps WHERE id = ?;",
            [stepId]
        );

        if (!currentStep) {
            callback(false);
            return;
        }

        await db.runAsync(
            `UPDATE trip_steps SET
                name = ?,
                location = ?,
                startDate = ?,
                endDate = ?,
                description = ?
            WHERE id = ?;`,
            [
                stepData.name ?? currentStep.name,
                stepData.location ?? currentStep.location ?? null,
                stepData.startDate ?? currentStep.startDate ?? null,
                stepData.endDate ?? currentStep.endDate ?? null,
                stepData.description ?? currentStep.description ?? null,
                stepId,
            ]
        );
        callback(true);
    } catch (error) {
        console.error("Erreur SQLite lors de la mise à jour de l'étape:", error);
        callback(false);
    }
};

// Suppression d'une étape
export const deleteTripStep = async (
    stepId: number,
    callback: (success: boolean) => void
) => {
    try {
        await db.runAsync("DELETE FROM trip_steps WHERE id = ?;", [stepId]);
        callback(true);
    } catch (error) {
        console.error("Erreur SQLite lors de la suppression de l'étape:", error);
        callback(false);
    }
};

// Types pour les entrées de journal
export type JournalEntry = {
    id: number;
    trip_id: number;
    step_id?: number;
    title: string;
    content?: string;
    entry_date: string;
    created_at?: string;
};

export type JournalEntryInput = Omit<JournalEntry, 'id' | 'created_at'>;

// Type pour les médias du journal
export type JournalMedia = {
    id: number;
    entry_id: number;
    media_type: 'image' | 'audio';
    uri: string;
    description?: string;
    created_at?: string;
};

export type JournalMediaInput = Omit<JournalMedia, 'id' | 'created_at'>;

// Ajout d'une entrée de journal
export const addJournalEntry = async (
    entryData: JournalEntryInput,
    callback: (success: boolean, id?: number) => void
) => {
    try {
        const result = await db.runAsync(
            "INSERT INTO journal_entries (trip_id, step_id, title, content, entry_date) VALUES (?, ?, ?, ?, ?);",
            [
                entryData.trip_id,
                entryData.step_id ?? null,
                entryData.title,
                entryData.content ?? null,
                entryData.entry_date
            ]
        );
        callback(true, result.lastInsertRowId);
    } catch (error) {
        console.error("Erreur SQLite lors de l'ajout de l'entrée de journal:", error);
        callback(false);
    }
};

// Récupération des entrées de journal pour un voyage
export const getJournalEntriesByTripId = async (
    tripId: number,
    callback: (entries: JournalEntry[]) => void
) => {
    try {
        const result = await db.getAllAsync<JournalEntry>(
            "SELECT * FROM journal_entries WHERE trip_id = ? ORDER BY entry_date DESC, created_at DESC;",
            [tripId]
        );
        callback(result);
    } catch (error) {
        console.error("Erreur SQLite lors de la récupération des entrées de journal:", error);
        callback([]);
    }
};

// Récupération des entrées de journal pour une étape
export const getJournalEntriesByStepId = async (
    stepId: number,
    callback: (entries: JournalEntry[]) => void
) => {
    try {
        const result = await db.getAllAsync<JournalEntry>(
            "SELECT * FROM journal_entries WHERE step_id = ? ORDER BY entry_date DESC, created_at DESC;",
            [stepId]
        );
        callback(result);
    } catch (error) {
        console.error("Erreur SQLite lors de la récupération des entrées de journal pour l'étape:", error);
        callback([]);
    }
};

// Récupération d'une entrée de journal spécifique
export const getJournalEntryById = async (
    entryId: number,
    callback: (entry: JournalEntry | null) => void
) => {
    try {
        const result = await db.getFirstAsync<JournalEntry>(
            "SELECT * FROM journal_entries WHERE id = ?;",
            [entryId]
        );
        callback(result || null);
    } catch (error) {
        console.error("Erreur SQLite lors de la récupération de l'entrée de journal:", error);
        callback(null);
    }
};

// Mise à jour d'une entrée de journal
export const updateJournalEntry = async (
    entryId: number,
    entryData: Partial<Omit<JournalEntry, 'id' | 'trip_id' | 'created_at'>>,
    callback: (success: boolean) => void
) => {
    try {
        const currentEntry = await db.getFirstAsync<JournalEntry>(
            "SELECT * FROM journal_entries WHERE id = ?;",
            [entryId]
        );

        if (!currentEntry) {
            callback(false);
            return;
        }

        await db.runAsync(
            `UPDATE journal_entries SET
                step_id = ?,
                title = ?,
                content = ?,
                entry_date = ?
            WHERE id = ?;`,
            [
                entryData.step_id ?? currentEntry.step_id ?? null,
                entryData.title ?? currentEntry.title,
                entryData.content ?? currentEntry.content ?? null,
                entryData.entry_date ?? currentEntry.entry_date,
                entryId
            ]
        );
        callback(true);
    } catch (error) {
        console.error("Erreur SQLite lors de la mise à jour de l'entrée de journal:", error);
        callback(false);
    }
};

// Suppression d'une entrée de journal
export const deleteJournalEntry = async (
    entryId: number,
    callback: (success: boolean) => void
) => {
    try {
        // Les médias associés seront automatiquement supprimés grâce à ON DELETE CASCADE
        await db.runAsync("DELETE FROM journal_entries WHERE id = ?;", [entryId]);
        callback(true);
    } catch (error) {
        console.error("Erreur SQLite lors de la suppression de l'entrée de journal:", error);
        callback(false);
    }
};

// Ajout d'un média à une entrée de journal
export const addJournalMedia = async (
    mediaData: JournalMediaInput,
    callback: (success: boolean, id?: number) => void
) => {
    try {
        const result = await db.runAsync(
            "INSERT INTO journal_media (entry_id, media_type, uri, description) VALUES (?, ?, ?, ?);",
            [
                mediaData.entry_id,
                mediaData.media_type,
                mediaData.uri,
                mediaData.description ?? null
            ]
        );
        callback(true, result.lastInsertRowId);
    } catch (error) {
        console.error("Erreur SQLite lors de l'ajout du média au journal:", error);
        callback(false);
    }
};

// Récupération des médias pour une entrée de journal
export const getJournalMediaByEntryId = async (
    entryId: number,
    callback: (media: JournalMedia[]) => void
) => {
    try {
        const result = await db.getAllAsync<JournalMedia>(
            "SELECT * FROM journal_media WHERE entry_id = ? ORDER BY created_at ASC;",
            [entryId]
        );
        callback(result);
    } catch (error) {
        console.error("Erreur SQLite lors de la récupération des médias du journal:", error);
        callback([]);
    }
};

// Suppression d'un média
export const deleteJournalMedia = async (
    mediaId: number,
    callback: (success: boolean) => void
) => {
    try {
        await db.runAsync("DELETE FROM journal_media WHERE id = ?;", [mediaId]);
        callback(true);
    } catch (error) {
        console.error("Erreur SQLite lors de la suppression du média:", error);
        callback(false);
    }
};

// Types pour les checklists et les éléments
export type Checklist = {
    id: number;
    trip_id: number;
    title: string;
    description?: string;
    created_at?: string;
};

export type ChecklistInput = Omit<Checklist, 'id' | 'created_at'>;

export type ChecklistItem = {
    id: number;
    checklist_id: number;
    text: string;
    is_checked: boolean;
    created_at?: string;
};

export type ChecklistItemInput = Omit<ChecklistItem, 'id' | 'created_at'>;

// Ajout d'une checklist
export const addChecklist = async (
    checklistData: ChecklistInput,
    callback: (success: boolean, id?: number) => void
) => {
    try {
        const result = await db.runAsync(
            "INSERT INTO checklists (trip_id, title, description) VALUES (?, ?, ?);",
            [
                checklistData.trip_id,
                checklistData.title,
                checklistData.description ?? null
            ]
        );
        callback(true, result.lastInsertRowId);
    } catch (error) {
        console.error("Erreur SQLite lors de l'ajout de la checklist:", error);
        callback(false);
    }
};

// Récupération des checklists pour un voyage
export const getChecklistsByTripId = async (
    tripId: number,
    callback: (checklists: Checklist[]) => void
) => {
    try {
        const result = await db.getAllAsync<Checklist>(
            "SELECT * FROM checklists WHERE trip_id = ? ORDER BY created_at ASC;",
            [tripId]
        );
        callback(result);
    } catch (error) {
        console.error("Erreur SQLite lors de la récupération des checklists:", error);
        callback([]);
    }
};

// Récupération d'une checklist spécifique
export const getChecklistById = async (
    checklistId: number,
    callback: (checklist: Checklist | null) => void
) => {
    try {
        const result = await db.getFirstAsync<Checklist>(
            "SELECT * FROM checklists WHERE id = ?;",
            [checklistId]
        );
        callback(result || null);
    } catch (error) {
        console.error("Erreur SQLite lors de la récupération de la checklist:", error);
        callback(null);
    }
};

// Mise à jour d'une checklist
export const updateChecklist = async (
    checklistId: number,
    checklistData: Partial<Omit<Checklist, 'id' | 'trip_id' | 'created_at'>>,
    callback: (success: boolean) => void
) => {
    try {
        const currentChecklist = await db.getFirstAsync<Checklist>(
            "SELECT * FROM checklists WHERE id = ?;",
            [checklistId]
        );

        if (!currentChecklist) {
            callback(false);
            return;
        }

        await db.runAsync(
            `UPDATE checklists SET
                title = ?,
                description = ?
            WHERE id = ?;`,
            [
                checklistData.title ?? currentChecklist.title,
                checklistData.description ?? currentChecklist.description ?? null,
                checklistId
            ]
        );
        callback(true);
    } catch (error) {
        console.error("Erreur SQLite lors de la mise à jour de la checklist:", error);
        callback(false);
    }
};

// Suppression d'une checklist
export const deleteChecklist = async (
    checklistId: number,
    callback: (success: boolean) => void
) => {
    try {
        // Les éléments associés seront automatiquement supprimés grâce à ON DELETE CASCADE
        await db.runAsync("DELETE FROM checklists WHERE id = ?;", [checklistId]);
        callback(true);
    } catch (error) {
        console.error("Erreur SQLite lors de la suppression de la checklist:", error);
        callback(false);
    }
};

// Ajout d'un élément à une checklist
export const addChecklistItem = async (
    itemData: ChecklistItemInput,
    callback: (success: boolean, id?: number) => void
) => {
    try {
        const result = await db.runAsync(
            "INSERT INTO checklist_items (checklist_id, text, is_checked) VALUES (?, ?, ?);",
            [
                itemData.checklist_id,
                itemData.text,
                itemData.is_checked ? 1 : 0
            ]
        );
        callback(true, result.lastInsertRowId);
    } catch (error) {
        console.error("Erreur SQLite lors de l'ajout de l'élément à la checklist:", error);
        callback(false);
    }
};

// Récupération des éléments d'une checklist
export const getChecklistItems = async (
    checklistId: number,
    callback: (items: ChecklistItem[]) => void
) => {
    try {
        const result = await db.getAllAsync<ChecklistItem>(
            "SELECT * FROM checklist_items WHERE checklist_id = ? ORDER BY created_at ASC;",
            [checklistId]
        );
        callback(result.map(item => ({
            ...item,
            is_checked: !!item.is_checked // Convertir en booléen
        })));
    } catch (error) {
        console.error("Erreur SQLite lors de la récupération des éléments de la checklist:", error);
        callback([]);
    }
};

// Mise à jour d'un élément de checklist
export const updateChecklistItem = async (
    itemId: number,
    itemData: Partial<Omit<ChecklistItem, 'id' | 'checklist_id' | 'created_at'>>,
    callback: (success: boolean) => void
) => {
    try {
        const currentItem = await db.getFirstAsync<ChecklistItem>(
            "SELECT * FROM checklist_items WHERE id = ?;",
            [itemId]
        );

        if (!currentItem) {
            callback(false);
            return;
        }

        await db.runAsync(
            `UPDATE checklist_items SET
                text = ?,
                is_checked = ?
            WHERE id = ?;`,
            [
                itemData.text ?? currentItem.text,
                itemData.is_checked !== undefined ? (itemData.is_checked ? 1 : 0) : (currentItem.is_checked ? 1 : 0),
                itemId
            ]
        );
        callback(true);
    } catch (error) {
        console.error("Erreur SQLite lors de la mise à jour de l'élément de checklist:", error);
        callback(false);
    }
};

// Suppression d'un élément de checklist
export const deleteChecklistItem = async (
    itemId: number,
    callback: (success: boolean) => void
) => {
    try {
        await db.runAsync("DELETE FROM checklist_items WHERE id = ?;", [itemId]);
        callback(true);
    } catch (error) {
        console.error("Erreur SQLite lors de la suppression de l'élément de checklist:", error);
        callback(false);
    }
};

// Toggle l'état coché/non-coché d'un élément de checklist
export const toggleChecklistItemCheck = async (
    itemId: number,
    callback: (success: boolean) => void
) => {
    try {
        // Récupérer l'état actuel
        const currentItem = await db.getFirstAsync<ChecklistItem>(
            "SELECT * FROM checklist_items WHERE id = ?;",
            [itemId]
        );

        if (!currentItem) {
            callback(false);
            return;
        }

        // Inverser l'état
        const newCheckState = !currentItem.is_checked;

        await db.runAsync(
            "UPDATE checklist_items SET is_checked = ? WHERE id = ?;",
            [newCheckState ? 1 : 0, itemId]
        );
        callback(true);
    } catch (error) {
        console.error("Erreur SQLite lors du changement d'état de l'élément de checklist:", error);
        callback(false);
    }
};
