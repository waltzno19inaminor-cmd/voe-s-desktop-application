export interface Diary {
    id?: string;
    authorId?: string;
    entries: DiaryEntry[];
}

export interface Execution {
    id: string;
    type: 'entry' | 'exit';
    side: 'Long' | 'Short' | 'Close';
    price: number;
    size: number;
    date: Date;
    timeZone?: string;
    label?: string;
}

export interface DiaryEntry {
    id?: string;
    date: Date;
    dateExit?: Date;
    timeZone?: string;
    asset?: string;
    side?: 'Long' | 'Short';
    entry?: number;
    exit?: number;
    stopLoss?: number;
    takeProfit?: number;
    size?: number;
    sizeInCurrency?: number;
    currency?: string;
    entryFee?: number;
    exitFee?: number;
    feeType?: '%' | string;
    result?: number;
    notes?: string;
    notesList?: DiaryNote[];
    images?: DiaryImage[];
    forumCategory?: {
        section: string;
        category: string;
    };
    linkedThreads?: string[];
    riskReward?: number;
    assetType?: 'Forex' | 'Stocks' | 'Crypto' | 'Metals';
    assetIcon?: string;
    profitInCurrency?: number;
    strategyId?: string;
    boardConditions?: (string | { id: string; info: { name: string; description: string } })[];
    boardScenarioEntry?: { 
        id: string; 
        info: { 
            name: string; 
            description: string;
            conditions?: { id: string; info: { name: string; description: string } }[];
        } 
    };
    boardScenarioExit?: { 
        id: string; 
        info: { 
            name: string; 
            description: string;
            conditions?: { id: string; info: { name: string; description: string } }[];
        } 
    };
    boardScenarioEntryId?: string;
    boardScenarioExitId?: string;
    emotions?: string[];
    emotionsEntry?: string[];
    emotionsDuring?: string[];
    emotionsExit?: string[];
    tacticalPhases?: {
        entry: string[];
        during: string[];
        exit: string[];
    };
    executions?: Execution[];
}

export interface DiaryImage {
    url?: string;
    context?: string;
    name?: string;
    tags?: string[];
    createdAt?: string;
    timestamp?: string;
    date?: string;
}

export interface DiaryNote {
    id: string;
    content: string;
    date: Date | string;
    title?: string;
}