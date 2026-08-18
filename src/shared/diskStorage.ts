import { 
    writeTextFile, 
    readTextFile, 
    mkdir, 
    exists, 
    BaseDirectory,
    remove
} from '@tauri-apps/plugin-fs';
import { dataDir, join } from '@tauri-apps/api/path';
import { message } from '@tauri-apps/plugin-dialog';

const JLJ_DATA_DIR = 'JLJData';
const BACKUP_SUFFIX = '_backup';
const SAFETY_BACKUP_SUFFIX = '_SAFETY_BACKUP';

let resolvedDataPath: string | null = null;

const isBackupKey = (fileName: string): boolean => {
    const normalized = fileName.toLowerCase();
    return normalized.endsWith(BACKUP_SUFFIX) || normalized.endsWith(SAFETY_BACKUP_SUFFIX.toLowerCase());
};

const getBackupKey = (fileName: string): string => `${fileName}${BACKUP_SUFFIX}`;

const getStorageCandidates = (fileName: string): string[] => {
    if (isBackupKey(fileName)) return [fileName];
    return [fileName, getBackupKey(fileName)];
};

const readLocalStorageJson = <T>(fileName: string): T | null => {
    if (typeof localStorage === 'undefined') return null;
    const localData = localStorage.getItem(fileName);
    if (!localData) return null;
    return JSON.parse(localData) as T;
};

const saveLocalStorageJson = (fileName: string, content: string): void => {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(fileName, content);
    if (!isBackupKey(fileName)) {
        localStorage.setItem(getBackupKey(fileName), content);
    }
};

const removeLocalStorageJson = (fileName: string): void => {
    if (typeof localStorage === 'undefined') return;
    for (const candidate of getStorageCandidates(fileName)) {
        localStorage.removeItem(candidate);
    }
};

/**
 * Ensures the JLJData directory exists in the dataDir.
 */
export const ensureDataDir = async (): Promise<string> => {
    if (resolvedDataPath) return resolvedDataPath;

    try {
        const appData = await dataDir();
        const dataPath = await join(appData, JLJ_DATA_DIR);
        
        const dirExists = await exists(dataPath);
        if (!dirExists) {
            await mkdir(dataPath, { recursive: true });
        }
        
        resolvedDataPath = dataPath;
        return dataPath;
    } catch (error: any) {
        console.error('[DiskStorage] Error in ensureDataDir:', error);
        await message(`Failed to access storage: ${error.message || error}`, { title: 'Storage Error', kind: 'error' });
        throw error;
    }
};

/**
 * Saves a JSON object to a file in the JLJData directory or falls back to localStorage.
 * @param fileName Name of the file (without .json extension)
 * @param data Data to save
 */
export const saveToDisk = async (fileName: string, data: any): Promise<void> => {
    const content = JSON.stringify(data, null, 2);
    try {
        const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
        if (isTauri) {
            const dataPath = await ensureDataDir();
            const path = await join(dataPath, `${fileName}.json`);
            await writeTextFile(path, content);
            
            if (!isBackupKey(fileName)) {
                const backupPath = await join(dataPath, `${getBackupKey(fileName)}.json`);
                await writeTextFile(backupPath, content);
            }
        } else {
            saveLocalStorageJson(fileName, content);
        }
    } catch (error: any) {
        console.error(`[DiskStorage] Error saving ${fileName}:`, error);
        try {
            saveLocalStorageJson(fileName, content);
        } catch (e) {
            console.error('[DiskStorage] LocalStorage fallback failed:', e);
        }
    }
};

/**
 * Loads a JSON object from a file in the JLJData directory or falls back to localStorage.
 * @param fileName Name of the file (without .json extension)
 */
export const loadFromDisk = async <T>(fileName: string): Promise<T | null> => {
    const candidates = getStorageCandidates(fileName);
    try {
        const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
        if (isTauri) {
            const dataPath = await ensureDataDir();
            
            for (const candidate of candidates) {
                const path = await join(dataPath, `${candidate}.json`);
                const fileExists = await exists(path);
                if (!fileExists) continue;
                
                try {
                    const content = await readTextFile(path);
                    return JSON.parse(content) as T;
                } catch (error) {
                    console.error(`[DiskStorage] Failed to read ${candidate}.json:`, error);
                }
            }
            
            for (const candidate of candidates) {
                try {
                    const localData = readLocalStorageJson<T>(candidate);
                    if (localData !== null) return localData;
                } catch (error) {
                    console.error(`[DiskStorage] Failed to read localStorage ${candidate}:`, error);
                }
            }
            
            return null;
        }
        
        for (const candidate of candidates) {
            try {
                const localData = readLocalStorageJson<T>(candidate);
                if (localData !== null) return localData;
            } catch (error) {
                console.error(`[DiskStorage] Failed to read localStorage ${candidate}:`, error);
            }
        }
        
        return null;
    } catch (error: any) {
        console.error(`Error loading ${fileName} from disk:`, error);
        for (const candidate of candidates) {
            try {
                const localData = readLocalStorageJson<T>(candidate);
                if (localData !== null) return localData;
            } catch (fallbackError) {
                console.error(`[DiskStorage] LocalStorage fallback failed for ${candidate}:`, fallbackError);
            }
        }
        return null;
    }
};

/**
 * Removes a file from the JLJData directory.
 */
export const removeFromDisk = async (fileName: string): Promise<void> => {
    try {
        const isTauri = typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__;
        if (!isTauri) {
            removeLocalStorageJson(fileName);
            return;
        }
        
        const dataPath = await ensureDataDir();
        for (const candidate of getStorageCandidates(fileName)) {
            const path = await join(dataPath, `${candidate}.json`);
            const fileExists = await exists(path);
            if (fileExists) {
                await remove(path);
            }
        }
        removeLocalStorageJson(fileName);
    } catch (error: any) {
        console.error(`Error removing ${fileName} from disk:`, error);
        await message(`Failed to remove file: ${error.message || error}`, { title: 'Delete Error', kind: 'error' });
    }
};

/**
 * Migration helper to move data from localStorage to disk.
 * Should be called once on app startup.
 */
export const migrateLocalStorageToDisk = async (keys: string[]): Promise<void> => {
    if (typeof window === 'undefined') return;
    
    for (const key of keys) {
        const localData = localStorage.getItem(key);
        if (localData) {
            try {
                const parsedData = JSON.parse(localData);
                const diskData = await loadFromDisk(key);
                
                if (!diskData) {
                    await saveToDisk(key, parsedData);
                    console.info(`[DiskStorage] Migrated ${key} to disk storage.`);
                } else {
                }
            } catch (error) {
                console.error(`[DiskStorage] Migration failed for ${key}:`, error);
            }
        }
    }
};
