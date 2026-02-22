export interface Diary {
    id?: string;
    authorId?: string;
    entries: DiaryEntry[];
}

export interface DiaryEntry {
    id?: string;
    date: Date;
    dateExit?: Date;
    asset?: string;
    side?: string;
    entry?: number;
    exit?: number;
    stopLoss?: number;
    takeProfit?: number;
    size?: number;
    sizeInCurrency?: number;
    currency?: string;
    result?: number;
    notes?: string;
    images?: DiaryImage[];
}

export interface DiaryImage {
    url?: string;
    context?: string;
}