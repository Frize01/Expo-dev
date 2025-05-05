import { ChecklistItem } from './ChecklistItem';

export type Checklist = {
    id: number;
    trip_id: number;
    title: string;
    description?: string;
    created_at?: string;
    items?: ChecklistItem[];
};

export type ChecklistInput = Omit<Checklist, 'id' | 'created_at' | 'items'>;