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
    isClosed?: boolean;
    status?: 'open' | 'closed' | string;
    timeZone?: string;
    asset?: string;
    side?: 'Long' | 'Short';
    entry?: number;
    exit?: number;
    stopLoss?: number;
    takeProfit?: number;
    sl?: number;
    tp?: number;
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
    strategyVersionId?: string;
    boardConditions?: (string | { id: string; info: { name: string; description: string; priority?: string } })[];
    boardRequiredConditionsEntry?: { id: string; info: { name: string; description: string; priority?: string } }[];
    boardRequiredConditionsExit?: { id: string; info: { name: string; description: string; priority?: string } }[];
    boardScenarioEntry?: { 
        id: string; 
        info: { 
            name: string; 
            description: string;
            conditions?: { id: string; info: { name: string; description: string; priority?: string } }[];
            requiredConditions?: { id: string; info: { name: string; description: string; priority?: string } }[];
        } 
    };
    boardScenarioExit?: { 
        id: string; 
        info: { 
            name: string; 
            description: string;
            conditions?: { id: string; info: { name: string; description: string; priority?: string } }[];
            requiredConditions?: { id: string; info: { name: string; description: string; priority?: string } }[];
        } 
    };
    boardScenarioEntryId?: string;
    boardScenarioExitId?: string;
    entryMethodType?: 'SINGLE' | 'PYRAMIDING' | 'AVERAGING_DOWN' | string;
    exitMethodType?: 'SINGLE' | 'EXIT_SCALE' | string;
    emotions?: string[];
    emotionsEntry?: string[];
    emotionsDuring?: string[];
    emotionsExit?: string[];
    tacticalPhases?: {
        entry: string[];
        during: string[];
        exit: string[];
    };
    tradeStudyMetrics?: Record<string, string | number | boolean | undefined | null | Record<string, any>>;
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
