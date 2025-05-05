export type ChecklistItem = {
    id: number;
    checklist_id: number;
    text: string;
    is_checked: boolean;
    created_at?: string;
};

export type ChecklistItemInput = Omit<ChecklistItem, 'id' | 'created_at'>;