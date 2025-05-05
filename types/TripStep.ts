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