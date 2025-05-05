import { Checklist } from './Checklist';
import { TripStep } from './TripStep';

export type Trip = {
    id: number;
    title: string;
    destination?: string;
    startDate?: string;
    endDate?: string;
    budget?: number;
    notes?: string;
    imageUri?: string;
    latitude?: number;
    longitude?: number;
    steps?: TripStep[];
    checklists?: Checklist[];
};