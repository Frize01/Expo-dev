/**
 * Service de géocodage utilisant l'API Nominatim d'OpenStreetMap
 */
export const geocodeDestination = async (destination: string): Promise<{lat: number, lon: number} | null> => {
    try {
        // Utilisation de l'API de géocodage Nominatim d'OpenStreetMap
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
            return {
                lat: parseFloat(lat),
                lon: parseFloat(lon),
            };
        }
        return null;
    } catch (error) {
        console.error("Erreur de géocodage:", error);
        return null;
    }
};