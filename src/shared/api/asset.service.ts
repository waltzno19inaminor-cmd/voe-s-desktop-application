import { saveToDisk, loadFromDisk } from '../diskStorage';
import globalAssetsDict from '../data/global_assets.json';

export type AssetType = 'Forex' | 'Stocks' | 'Crypto' | 'Metals';

export interface AssetInfo {
    symbol: string;
    name: string;
    type: AssetType;
    icon?: string;
    description?: string;
    id?: string; // For CoinGecko search
    exchange?: string;
    country?: string;
}

const REGISTRY_FILE = 'asset_registry_v2';

// Seed list of popular global assets to ensure robust offline functionality
const SEED_ASSETS: AssetInfo[] = []; // Unified into global_assets.json

let localRegistry: AssetInfo[] = [];

let initPromise: Promise<void> | null = null;

/**
 * Loads the registry from disk and merges with seed assets.
 * Implemented as a singleton to prevent race conditions during heavy JSON imports.
 */
export async function initAssetService(): Promise<void> {
    if (initPromise) return initPromise;
    
    initPromise = (async () => {
        const saved = await loadFromDisk<AssetInfo[]>(REGISTRY_FILE);
        
        // Combine everything: Dictionary (Priority) + User Saved
        // We put the globalAssetsDict FIRST so that its icons/descriptions override 
        // any older versions saved in the browser's persistent storage.
        const combined = [...(globalAssetsDict as AssetInfo[]), ...(saved || [])];
        
        // Strict Deduplication Filter
        const registryMap = new Map<string, AssetInfo>();
        
        for (const asset of combined) {
            if (!asset.symbol) continue;
            const key = asset.symbol.trim().toUpperCase();
            if (!registryMap.has(key)) {
                registryMap.set(key, { ...asset, symbol: key });
            }
        }

        localRegistry = Array.from(registryMap.values());

        if (!saved) {
            await saveToDisk(REGISTRY_FILE, localRegistry);
        }
    })();
    
    return initPromise;
}

/**
 * Searches for assets globally, prioritizing local registry.
 */
export async function searchAssets(query: string): Promise<AssetInfo[]> {
    // Ensure the service is fully initialized before searching
    await initAssetService();
    
    if (!query) return localRegistry.slice(0, 10);
    
    const q = query.toUpperCase();
    
    // Filter local registry first
    let localMatches = localRegistry.filter(a => 
        a.symbol.toUpperCase().includes(q) || 
        a.name.toUpperCase().includes(q)
    );

    // Metal keyword detection
    const metalKeywords: Record<string, string> = { 'GOLD': 'XAU', 'SILVER': 'XAG', 'PLATINUM': 'XPT', 'PALLADIUM': 'XPD', 'COPPER': 'HG' };
    for (const [key, sym] of Object.entries(metalKeywords)) {
        if (q.includes(key) && !localMatches.some(m => m.symbol.includes(sym))) {
            const metal = localRegistry.find(m => m.type === 'Metals' && m.symbol.includes(sym));
            if (metal) localMatches.unshift(metal);
        }
    }

    // If we have local matches, we still proceed to external fetch to enrich results,
    // but we return the deduplicated set.
    let externalMatches: AssetInfo[] = [];
    if (localMatches.length < 5) {
        try {
            externalMatches = await fetchExternalAssets(query);
        } catch (e) {
            console.error('[AssetService] External fetch failed:', e);
        }
    }

    const results = [...localMatches, ...externalMatches];
    
    // Unified Deduplication & Normalization
    const seen = new Set<string>();
    return results.filter(a => {
        const key = a.symbol.toUpperCase().trim();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    }).slice(0, 15).map(a => ({
        ...a,
        icon: a.icon || getIconForAsset(a.symbol, a.type)
    }));
}

/**
 * Fetches assets from external APIs.
 */
async function fetchExternalAssets(query: string): Promise<AssetInfo[]> {
    // 1. Try CoinGecko for Crypto
    const cryptoPromise = fetch(`https://api.coingecko.com/api/v3/search?query=${query}`)
        .then(res => res.json())
        .then(data => (data.coins || []).map((c: any) => ({
            symbol: c.symbol,
            name: c.name,
            type: 'Crypto',
            icon: c.thumb,
            id: c.id
        })));

    // 2. Try Twelve Data for Stocks/Forex/Metals (Public CORS-friendly endpoint)
    const marketPromise = fetch(`https://api.twelvedata.com/symbol_search?symbol=${query}`)
        .then(res => res.json())
        .then(data => {
            if (!data.data || !Array.isArray(data.data)) return [];
            return data.data.map((q: any) => {
                let type: AssetType = 'Stocks';
                const iType = (q.instrument_type || '').toUpperCase();
                
                if (iType.includes('CURRENCY') && !iType.includes('DIGITAL')) type = 'Forex';
                if (iType.includes('DIGITAL') || iType.includes('CRYPTO')) type = 'Crypto';
                if (['XAU/USD', 'XAG/USD', 'XPT/USD', 'XPD/USD', 'HG1!'].includes(q.symbol)) type = 'Metals';
                
                return {
                    symbol: q.symbol,
                    name: q.instrument_name || q.symbol,
                    type: type,
                    exchange: q.exchange,
                    country: q.country,
                    icon: getIconForAsset(q.symbol, type)
                } as AssetInfo;
            });
        })
        .catch(() => []); // Fallback on failure

    const results = await Promise.allSettled([cryptoPromise, marketPromise]);
    
    const assets: AssetInfo[] = [];
    results.forEach(res => {
        if (res.status === 'fulfilled') {
            assets.push(...res.value);
        }
    });

    return assets;
}

/**
 * Infers icon URL based on asset type and symbol.
 */
export function getIconForAsset(symbol: string, type: AssetType): string | undefined {
    // 1. Prioritize pre-fetched or known good icons from the local registry
    if (symbol) {
        const registeredAsset = localRegistry.find(a => a.symbol.toUpperCase() === symbol.toUpperCase());
        if (registeredAsset && registeredAsset.icon) {
            return registeredAsset.icon;
        }
    }

    if (type === 'Forex') {
        const base = (symbol || '').slice(0, 2).toLowerCase();
        return `https://flagcdn.com/w80/${base}.png`;
    }
    if (type === 'Stocks') {
        let strSym = ((symbol || '').split('.')[0] || '').toUpperCase();
        
        // Aliases to ensure specific high-profile logos match correctly in the endpoint
        const aliasMapping: Record<string, string> = {
            'BRK.B': 'BRK-A', 
            'META': 'META'
        };
        
        if (aliasMapping[strSym]) strSym = aliasMapping[strSym] as string;
        
        // High-Reliability Logo Provider (.webp format)
        return `https://companiesmarketcap.com/img/company-logos/64/${strSym}.webp`;
    }
    if (type === 'Metals') {
        const s = (symbol || '').toUpperCase();
        if (s.includes('XAU')) return '/assets_icons/commodity-gold-bars.png';
        if (s.includes('XAG')) return '/assets_icons/commodity-silver-bars.svg';
        if (s.includes('XPT')) return '/assets_icons/commodity-metal-bars.svg';
        if (s.includes('XPD')) return '/assets_icons/commodity-metal-bars.svg';
        if (s.includes('HG')) return '/assets_icons/commodity-copper-ingots.svg';
    }
    if (type === 'Crypto') {
        const s = (symbol || '').toUpperCase();
        if (s === 'BTC') return 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png';
        if (s === 'ETH') return 'https://assets.coingecko.com/coins/images/279/small/ethereum.png';
        if (s === 'SOL') return 'https://assets.coingecko.com/coins/images/4128/small/solana.png';
        return `https://assets.coingecko.com/coins/images/1/small/${s.toLowerCase()}.png`; // Fallback attempt
    }
    return undefined;
}
