use reqwest::header::USER_AGENT;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

pub struct BenchmarkState(pub Mutex<BenchmarkStateInner>);

pub struct BenchmarkStateInner {
    pub has_fetched: bool,
    pub cached_rate: f64,
    pub cached_risk_free: f64,
    pub cached_betas: HashMap<String, f64>,
    pub cached_period: Option<(i64, i64)>,
}

impl Default for BenchmarkState {
    fn default() -> Self {
        Self(Mutex::new(BenchmarkStateInner {
            has_fetched: false,
            cached_rate: 25.21,
            cached_risk_free: 5.00,
            cached_betas: HashMap::new(),
            cached_period: None,
        }))
    }
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct BenchmarkResponse {
    pub benchmark_rate: f64,
    pub beta: f64,
    pub risk_free_rate: f64,
    pub is_fallback: bool,
}

#[derive(Serialize, Deserialize, Debug)]
struct CacheData {
    benchmark_rate: f64,
    beta: f64,
    risk_free_rate: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct StrategyBenchmarkCache {
    beta: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct StrategyCacheData {
    benchmark_rate: f64,
    risk_free_rate: f64,
    strategies: HashMap<String, StrategyBenchmarkCache>,
    #[serde(default)]
    period_start_ts: Option<i64>,
    #[serde(default)]
    period_end_ts: Option<i64>,
}

#[derive(Deserialize, Debug)]
struct YahooChartResponse {
    chart: Option<ChartBody>,
}

#[derive(Deserialize, Debug)]
struct ChartBody {
    result: Option<Vec<ChartResult>>,
}

#[derive(Deserialize, Debug)]
struct ChartResult {
    meta: Option<ChartMeta>,
    timestamp: Option<Vec<i64>>,
    indicators: Option<ChartIndicators>,
}

#[derive(Deserialize, Debug)]
struct ChartMeta {
    #[serde(rename = "regularMarketPrice")]
    regular_market_price: Option<f64>,
}

#[derive(Deserialize, Debug)]
struct ChartIndicators {
    quote: Option<Vec<ChartQuote>>,
    #[serde(rename = "adjclose")]
    adjclose: Option<Vec<ChartAdjustedQuote>>,
}

#[derive(Deserialize, Debug)]
struct ChartQuote {
    close: Option<Vec<Option<f64>>>,
}

#[derive(Deserialize, Debug)]
struct ChartAdjustedQuote {
    adjclose: Option<Vec<Option<f64>>>,
}

fn days_from_civil(year: i64, month: i64, day: i64) -> i64 {
    let adjusted_year = year - if month <= 2 { 1 } else { 0 };
    let era = if adjusted_year >= 0 {
        adjusted_year / 400
    } else {
        (adjusted_year - 399) / 400
    };
    let year_of_era = adjusted_year - era * 400;
    let month_prime = month + if month > 2 { -3 } else { 9 };
    let day_of_year = (153 * month_prime + 2) / 5 + day - 1;
    let day_of_era = year_of_era * 365 + year_of_era / 4 - year_of_era / 100 + day_of_year;
    era * 146097 + day_of_era - 719468
}

fn civil_year_from_days(days_since_epoch: i64) -> i64 {
    let adjusted_days = days_since_epoch + 719468;
    let era = if adjusted_days >= 0 {
        adjusted_days / 146097
    } else {
        (adjusted_days - 146096) / 146097
    };
    let day_of_era = adjusted_days - era * 146097;
    let year_of_era =
        (day_of_era - day_of_era / 1460 + day_of_era / 36524 - day_of_era / 146096) / 365;
    let year = year_of_era + era * 400;
    let day_of_year = day_of_era - (365 * year_of_era + year_of_era / 4 - year_of_era / 100);
    let month_prime = (5 * day_of_year + 2) / 153;
    let month = month_prime + if month_prime < 10 { 3 } else { -9 };
    year + if month <= 2 { 1 } else { 0 }
}

fn last_completed_calendar_year_period() -> (i64, i64) {
    let now_seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;
    let current_year = civil_year_from_days(now_seconds.div_euclid(86_400));
    let completed_year = current_year - 1;

    (
        days_from_civil(completed_year, 1, 1) * 86_400,
        days_from_civil(current_year, 1, 1) * 86_400,
    )
}

#[tauri::command]
pub async fn get_benchmark_and_beta(
    strategy_returns: Vec<f64>,
    strategy_id: Option<String>,
    start_ts: Option<i64>,
    end_ts: Option<i64>,
    state: tauri::State<'_, BenchmarkState>,
    app: tauri::AppHandle,
) -> Result<BenchmarkResponse, String> {
    let benchmark_period = last_completed_calendar_year_period();
    let _ = (start_ts, end_ts);
    let strategy_key = strategy_id
        .as_deref()
        .map(str::trim)
        .filter(|id| !id.is_empty())
        .unwrap_or("MAIN_DIARY")
        .to_string();

    // 1. Check in-memory state lock for this concrete strategy.
    {
        let lock = state.0.lock().unwrap();
        if lock.has_fetched && lock.cached_period == Some(benchmark_period) {
            if let Some(beta) = lock.cached_betas.get(&strategy_key) {
                return Ok(BenchmarkResponse {
                    benchmark_rate: lock.cached_rate,
                    beta: *beta,
                    risk_free_rate: lock.cached_risk_free,
                    is_fallback: false,
                });
            }
        }
    }

    let load_strategy_cache = |path: &std::path::PathBuf| -> Option<StrategyCacheData> {
        let json_str = std::fs::read_to_string(path).ok()?;
        if let Ok(cache) = serde_json::from_str::<StrategyCacheData>(&json_str) {
            return Some(cache);
        }
        if let Ok(legacy) = serde_json::from_str::<CacheData>(&json_str) {
            let mut strategies = HashMap::new();
            strategies.insert(
                "MAIN_DIARY".to_string(),
                StrategyBenchmarkCache { beta: legacy.beta },
            );
            return Some(StrategyCacheData {
                benchmark_rate: legacy.benchmark_rate,
                risk_free_rate: legacy.risk_free_rate,
                strategies,
                period_start_ts: None,
                period_end_ts: None,
            });
        }
        None
    };

    let save_strategy_cache = |path: &std::path::PathBuf,
                               strategy: &str,
                               period: (i64, i64),
                               rate: f64,
                               beta: f64,
                               risk_free: f64| {
        let mut cache = load_strategy_cache(path).unwrap_or(StrategyCacheData {
            benchmark_rate: rate,
            risk_free_rate: risk_free,
            strategies: HashMap::new(),
            period_start_ts: Some(period.0),
            period_end_ts: Some(period.1),
        });
        cache.benchmark_rate = rate;
        cache.risk_free_rate = risk_free;
        cache.period_start_ts = Some(period.0);
        cache.period_end_ts = Some(period.1);
        cache
            .strategies
            .insert(strategy.to_string(), StrategyBenchmarkCache { beta });

        if let Ok(json_str) = serde_json::to_string_pretty(&cache) {
            let _ = std::fs::write(path, json_str);
        }
    };

    let load_cached_strategy = |path: &std::path::PathBuf,
                                strategy: &str,
                                period: (i64, i64)|
     -> Option<BenchmarkResponse> {
        let cache = load_strategy_cache(path)?;
        if cache.period_start_ts != Some(period.0) || cache.period_end_ts != Some(period.1) {
            return None;
        }
        cache
            .strategies
            .get(strategy)
            .map(|entry| BenchmarkResponse {
                benchmark_rate: cache.benchmark_rate,
                beta: entry.beta,
                risk_free_rate: cache.risk_free_rate,
                is_fallback: true,
            })
    };

    let cache_response_in_memory = |response: &BenchmarkResponse, strategy: &str| {
        let mut lock = state.0.lock().unwrap();
        lock.has_fetched = true;
        lock.cached_rate = response.benchmark_rate;
        lock.cached_risk_free = response.risk_free_rate;
        lock.cached_period = Some(benchmark_period);
        lock.cached_betas
            .insert(strategy.to_string(), response.beta);
    };

    // Helper to get cache file path
    let get_cache_path = || -> Result<std::path::PathBuf, String> {
        let app_data = app.path().data_dir().map_err(|e| e.to_string())?;
        let jlj_dir = app_data.join("JLJData");
        std::fs::create_dir_all(&jlj_dir).map_err(|e| e.to_string())?;
        Ok(jlj_dir.join("benchmark_rust_cache_v2.json"))
    };

    // 2. Reuse a local cache for strategies with too little data instead of overwriting
    // their previous beta with the baseline default.
    if strategy_returns.len() < 2 {
        if let Ok(cache_path) = get_cache_path() {
            if let Some(response) =
                load_cached_strategy(&cache_path, &strategy_key, benchmark_period)
            {
                cache_response_in_memory(&response, &strategy_key);
                return Ok(response);
            }
        }
    }

    // 3. Attempt live fetch from Yahoo Finance
    let bench_beta_res = fetch_live_benchmark_and_beta(
        &strategy_returns,
        Some(benchmark_period.0),
        Some(benchmark_period.1),
    )
    .await;
    let risk_free_res =
        fetch_live_risk_free_rate(Some(benchmark_period.0), Some(benchmark_period.1)).await;

    match bench_beta_res {
        Ok((rate, beta)) => {
            let risk_free = risk_free_res.unwrap_or(5.00);
            if let Ok(cache_path) = get_cache_path() {
                save_strategy_cache(
                    &cache_path,
                    &strategy_key,
                    benchmark_period,
                    rate,
                    beta,
                    risk_free,
                );
            }

            let response = BenchmarkResponse {
                benchmark_rate: rate,
                beta,
                risk_free_rate: risk_free,
                is_fallback: false,
            };
            cache_response_in_memory(&response, &strategy_key);
            Ok(response)
        }
        Err(e) => {
            log::warn!("[benchmark] Live fetch failed for strategy {}: {}, attempting to load from local JSON cache...", strategy_key, e);

            if let Ok(cache_path) = get_cache_path() {
                if let Some(response) =
                    load_cached_strategy(&cache_path, &strategy_key, benchmark_period)
                {
                    cache_response_in_memory(&response, &strategy_key);
                    return Ok(response);
                }
            }

            log::warn!("[benchmark] Local JSON cache unavailable for strategy {}, falling back to baseline defaults.", strategy_key);
            let response = BenchmarkResponse {
                benchmark_rate: 25.21,
                beta: 0.85,
                risk_free_rate: 5.00,
                is_fallback: true,
            };
            cache_response_in_memory(&response, &strategy_key);
            Ok(response)
        }
    }
}

async fn fetch_live_benchmark_and_beta(
    strategy_returns: &[f64],
    start_ts: Option<i64>,
    end_ts: Option<i64>,
) -> Result<(f64, f64), String> {
    let url = if let (Some(start), Some(end)) = (start_ts, end_ts) {
        format!("https://query2.finance.yahoo.com/v8/finance/chart/^GSPC?interval=1d&period1={}&period2={}", start - (10 * 86400), end + (2 * 86400))
    } else {
        "https://query2.finance.yahoo.com/v8/finance/chart/^GSPC?interval=1d&range=1y".to_string()
    };
    let client = reqwest::Client::new();
    let res = client
        .get(&url)
        .header(USER_AGENT, "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let data = res
        .json::<YahooChartResponse>()
        .await
        .map_err(|e| format!("JSON parse failed: {}", e))?;

    let result = data
        .chart
        .and_then(|c| c.result)
        .and_then(|mut r| r.pop())
        .ok_or_else(|| "No chart result found".to_string())?;

    let mut benchmark_rate = 25.21;
    let mut beta = 0.85;

    if let Some(indicators) = result.indicators {
        let ChartIndicators { quote, adjclose } = indicators;
        let timestamps = result.timestamp.unwrap_or_default();

        if let Some(mut quotes) = quote {
            if let Some(chart_quote) = quotes.pop() {
                let close_prices = chart_quote.close.unwrap_or_default();
                let adjusted_prices = adjclose
                    .and_then(|mut rows| rows.pop())
                    .and_then(|row| row.adjclose);
                let prices = adjusted_prices.unwrap_or(close_prices);

                // The request includes padding so the previous year's final close is
                // available as the correct starting anchor for the calendar year.
                let all_price_points: Vec<(i64, f64)> = timestamps
                    .into_iter()
                    .zip(prices.into_iter())
                    .filter_map(|(timestamp, price)| {
                        let price = price?;
                        if !price.is_finite() || price <= 0.0 {
                            return None;
                        }
                        Some((timestamp, price))
                    })
                    .collect();

                let price_points: Vec<(i64, f64)> = all_price_points
                    .iter()
                    .copied()
                    .filter(|(timestamp, _)| {
                        !start_ts.is_some_and(|start| *timestamp < start)
                            && !end_ts.is_some_and(|end| *timestamp >= end)
                    })
                    .collect();

                let benchmark_start = start_ts
                    .and_then(|start| {
                        all_price_points
                            .iter()
                            .rev()
                            .find(|(timestamp, _)| *timestamp < start)
                            .copied()
                    })
                    .or_else(|| price_points.first().copied());
                let benchmark_end = end_ts
                    .and_then(|end| {
                        all_price_points
                            .iter()
                            .rev()
                            .find(|(timestamp, _)| *timestamp < end)
                            .copied()
                    })
                    .or_else(|| price_points.last().copied());

                if let (Some(first), Some(last)) = (benchmark_start, benchmark_end) {
                    if first.1 > 0.0 {
                        benchmark_rate = ((last.1 / first.1) - 1.0) * 100.0;
                    }
                } else {
                    log::warn!("[benchmark_diagnostic] No valid S&P 500 prices found inside the completed calendar year.");
                }

                if price_points.len() > 1 {
                    let market_returns: Vec<f64> = price_points
                        .windows(2)
                        .filter_map(|window| {
                            let previous = window[0].1;
                            let current = window[1].1;
                            (previous > 0.0).then_some((current / previous) - 1.0)
                        })
                        .collect();

                    let n_strat = strategy_returns.len();
                    if n_strat >= 2 && !market_returns.is_empty() {
                        let n_take = n_strat.min(market_returns.len());
                        let s_slice = &strategy_returns[n_strat - n_take..];
                        let m_slice = &market_returns[market_returns.len() - n_take..];

                        let mean_s: f64 = s_slice.iter().sum::<f64>() / (n_take as f64);
                        let mean_m: f64 = m_slice.iter().sum::<f64>() / (n_take as f64);
                        let mut covariance_sum = 0.0;
                        let mut market_variance_sum = 0.0;

                        for i in 0..n_take {
                            let strategy_delta = s_slice[i] - mean_s;
                            let market_delta = m_slice[i] - mean_m;
                            covariance_sum += strategy_delta * market_delta;
                            market_variance_sum += market_delta * market_delta;
                        }

                        if market_variance_sum > 0.0 {
                            let calc_beta = covariance_sum / market_variance_sum;
                            if calc_beta.is_finite() {
                                beta = calc_beta.clamp(-3.0, 5.0);
                            }
                        }
                    }
                }
            }
        }
    } else {
        log::warn!("[benchmark_diagnostic] `result.indicators` was None.");
    }

    Ok((benchmark_rate, beta))
}

async fn fetch_live_risk_free_rate(
    start_ts: Option<i64>,
    end_ts: Option<i64>,
) -> Result<f64, String> {
    let url = if let (Some(start), Some(end)) = (start_ts, end_ts) {
        format!("https://query2.finance.yahoo.com/v8/finance/chart/^IRX?interval=1d&period1={}&period2={}", start, end)
    } else {
        "https://query2.finance.yahoo.com/v8/finance/chart/^IRX?interval=1d&range=5d".to_string()
    };
    let client = reqwest::Client::new();
    let res = client
        .get(&url)
        .header(USER_AGENT, "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let data = res
        .json::<YahooChartResponse>()
        .await
        .map_err(|e| format!("JSON parse failed: {}", e))?;

    let result = data
        .chart
        .and_then(|c| c.result)
        .and_then(|mut r| r.pop())
        .ok_or_else(|| "No chart result found".to_string())?;

    if let Some(meta) = &result.meta {
        if let Some(price) = meta.regular_market_price {
            if price > 0.0 && start_ts.is_none() {
                return Ok(price);
            }
        }
    }

    if let Some(indicators) = result.indicators {
        if let Some(mut quotes) = indicators.quote {
            if let Some(quote) = quotes.pop() {
                if let Some(closes) = quote.close {
                    let valid_prices: Vec<f64> = closes.into_iter().filter_map(|p| p).collect();
                    if start_ts.is_some() && !valid_prices.is_empty() {
                        let sum: f64 = valid_prices.iter().sum();
                        let mean = sum / (valid_prices.len() as f64);
                        if mean > 0.0 {
                            return Ok(mean);
                        }
                    } else if let Some(&last_close) = valid_prices.last() {
                        if last_close > 0.0 {
                            return Ok(last_close);
                        }
                    }
                }
            }
        }
    }

    Ok(5.00)
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct DailyDataPoint {
    pub timestamp: i64,
    pub value: f64,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct HistoricalCurves {
    pub benchmark: Vec<DailyDataPoint>,
    pub risk_free: Vec<DailyDataPoint>,
}

#[tauri::command]
pub async fn get_historical_curves(
    strategy_id: String,
    start_ts: i64,
    end_ts: i64,
    app: tauri::AppHandle,
) -> Result<HistoricalCurves, String> {
    let strategy_key = strategy_id.trim();
    if strategy_key.is_empty() {
        return Err("Invalid strategy ID".to_string());
    }

    let get_cache_dir = || -> Result<std::path::PathBuf, String> {
        let app_data = app.path().data_dir().map_err(|e| e.to_string())?;
        let jlj_dir = app_data.join("JLJData");
        std::fs::create_dir_all(&jlj_dir).map_err(|e| e.to_string())?;
        Ok(jlj_dir)
    };

    let jlj_dir = get_cache_dir()?;
    let cache_path = jlj_dir.join(format!("historical_curves_v2_{}.json", strategy_key));

    // Try reading cache
    if let Ok(json_str) = std::fs::read_to_string(&cache_path) {
        if let Ok(cached) = serde_json::from_str::<HistoricalCurves>(&json_str) {
            let has_start = cached
                .benchmark
                .first()
                .map_or(false, |p| p.timestamp <= start_ts + 86400);
            let has_end = cached
                .benchmark
                .last()
                .map_or(false, |p| p.timestamp >= end_ts - 86400);
            if has_start && has_end {
                return Ok(cached);
            }
        }
    }

    let fetch_curve = |symbol: String| async move {
        // Yahoo expects timestamps in seconds.
        let url = format!(
            "https://query2.finance.yahoo.com/v8/finance/chart/{}?period1={}&period2={}&interval=1d",
            symbol, start_ts - (7 * 86400), end_ts + (7 * 86400) // add padding
        );
        let client = reqwest::Client::new();
        let res = client
            .get(&url)
            .header(
                reqwest::header::USER_AGENT,
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            )
            .send()
            .await
            .map_err(|e| format!("Request failed: {}", e))?;

        let data = res
            .json::<YahooChartResponse>()
            .await
            .map_err(|e| format!("JSON parse failed: {}", e))?;

        let result = data
            .chart
            .and_then(|c| c.result)
            .and_then(|mut r| r.pop())
            .ok_or_else(|| "No chart result found".to_string())?;

        let mut points = Vec::new();
        if let (Some(timestamps), Some(indicators)) = (result.timestamp, result.indicators) {
            let ChartIndicators { quote, adjclose } = indicators;
            if let Some(mut quotes) = quote {
                if let Some(chart_quote) = quotes.pop() {
                    let close_prices = chart_quote.close.unwrap_or_default();
                    let adjusted_prices = adjclose
                        .and_then(|mut rows| rows.pop())
                        .and_then(|row| row.adjclose);
                    let prices = adjusted_prices.unwrap_or(close_prices);

                    for (ts, price) in timestamps.into_iter().zip(prices.into_iter()) {
                        if let Some(p) = price.filter(|value| value.is_finite() && *value > 0.0) {
                            points.push(DailyDataPoint {
                                timestamp: ts,
                                value: p,
                            });
                        }
                    }
                }
            }
        }
        Ok::<Vec<DailyDataPoint>, String>(points)
    };

    let benchmark_points = fetch_curve("^GSPC".to_string()).await.unwrap_or_default();
    let risk_free_points = fetch_curve("^IRX".to_string()).await.unwrap_or_default();

    let curves = HistoricalCurves {
        benchmark: benchmark_points,
        risk_free: risk_free_points,
    };

    // Save cache
    if let Ok(json_str) = serde_json::to_string_pretty(&curves) {
        let _ = std::fs::write(&cache_path, json_str);
    }

    Ok(curves)
}
