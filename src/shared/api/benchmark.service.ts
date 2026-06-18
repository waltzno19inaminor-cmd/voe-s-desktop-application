import { SP500_BENCHMARK_RATE } from '../constants';

let memoryCache: number | null = null;

/**
 * Returns the stable S&P 500 long-term historical average annualized yield.
 * Deprecates the broken Yahoo Finance API fetch to ensure high availability,
 * offline support, and eliminate CORS/rate-limiting runtime failures.
 */
export async function getSP500Benchmark(): Promise<number> {
    if (memoryCache !== null) return memoryCache;

    memoryCache = SP500_BENCHMARK_RATE;
    return SP500_BENCHMARK_RATE;
}
