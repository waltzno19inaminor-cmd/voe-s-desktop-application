/**
 * Category classification for metrics in analytics and diagnostics.
 */
export type MetricCategory =
  | 'Primary'
  | 'Advanced'
  | 'Expert'
  | 'Risk'
  | 'Statistical'
  | 'Execution'
  | 'In-Trade'
  | 'General'
  | (string & {});

/**
 * Standard evaluation status flags for a metric.
 */
export type MetricEvalStatus =
  | 'optimal'
  | 'stable'
  | 'neutral'
  | 'critical'
  | 'warning'
  | (string & {});

/**
 * Benchmark threshold definition for metric evaluation.
 */
export interface MetricBenchmark {
  /** Display label for the benchmark (e.g. '>= 1.5x', '< $0') */
  label: string;
  /** Qualitative evaluation text (e.g. 'Optimal', 'Drawdown') */
  eval: string;
  /** Optional CSS class for badge/text styling (e.g. 'text-emerald-500 font-bold') */
  class?: string;
  /** Optional minimum numeric threshold */
  min?: number;
  /** Optional maximum numeric threshold */
  max?: number;
}

/**
 * Localized text labels for a single locale (RU or EN).
 */
export interface MetricLocalizedText {
  /** Metric label / title */
  label: string;
  /** Metric sub-caption */
  sub?: string;
  /** Metric description */
  desc?: string;
  /** Formula string representation */
  formula?: string;
  /** Benchmark target text */
  benchmark?: string;
  /** Qualitative evaluation description */
  evaluation?: string;
}

/**
 * Bilingual localization package containing both RU and EN versions.
 */
export interface MetricI18nLabels {
  ru: MetricLocalizedText;
  en: MetricLocalizedText;
}

/**
 * Dictionary of raw values or metrics passed to dynamic evaluation functions.
 */
export type MetricValuesRecord = Record<string, any>;

/**
 * Comprehensive configuration interface for any metric across the application.
 * Contains all necessary fields, formatting callbacks, evaluation logic, and UI metadata.
 */
export interface MetricConfig<TVal = MetricValuesRecord> {
  /** Unique key identifier for the metric (e.g. 'winRate', 'profitFactor', 'sharpeRatio') */
  key: string;

  /** Primary label or title of the metric */
  label: string;

  /** Secondary subtitle or short descriptive caption */
  sub?: string;

  /** Detailed description explaining what the metric measures and its trading significance */
  desc?: string;

  /** Mathematical or logical formula representation */
  formula?: string;

  /** Category grouping for layout organization */
  category?: MetricCategory;

  /** Direct static string or numeric value (if not computed dynamically) */
  value?: number | string | null;

  /** Raw numeric value used for calculations and chart progress */
  rawValue?: number | null;

  /** Pre-formatted string representation of the value */
  formattedValue?: string;

  /** Unit of measurement (e.g. '$', '%', 'x', 'R', 'hrs', 'pts') */
  unit?: string;

  /** Prefix string attached to formatted value (e.g. '+', '-', '$') */
  prefix?: string;

  /** Suffix string attached to formatted value (e.g. '%', 'x', 'R') */
  suffix?: string;

  /** Dynamic function to derive formatted string value from metric values record */
  valStr?: (m: TVal) => string;

  /** Dynamic function to derive formatted tooltip text from metric values record */
  tooltipValStr?: (m: TVal) => string;

  /** Dynamic function returning Tailwind/CSS class name for value text color */
  colorClass?: (m: TVal) => string;

  /** Dynamic function returning HEX/RGB/HSL color string based on theme mode */
  colorVal?: (m: TVal, isDark: boolean) => string;

  /** Dynamic function or static string for qualitative evaluation string (e.g. 'Optimal') */
  evalStr?: ((m: TVal) => string) | string;

  /** Dynamic function or static string for qualitative evaluation CSS class */
  evalClass?: ((m: TVal) => string) | string;

  /** Primary benchmark target text */
  benchmarkText?: string;

  /** Array of benchmark thresholds and evaluation rules */
  benchmarks?: MetricBenchmark[];

  /** Standard evaluation status tag */
  status?: MetricEvalStatus;

  /** Progress value normalized between 0 and 100 for visual bar indicators */
  progress?: number;

  /** Target benchmark numeric value */
  targetValue?: number;

  /** Trend direction indicator */
  trend?: 'up' | 'down' | 'neutral';

  /** Magnitude or percentage of trend change (e.g. '+3.5%') */
  trendDelta?: number | string;

  /** Icon name or visual key */
  icon?: string;

  /** Active selection state flag */
  isSelected?: boolean;

  /** Flag indicating whether metric is excluded from specific score calculations */
  isExcluded?: boolean;

  /** Bilingual i18n labels bundle */
  i18n?: MetricI18nLabels;
}

/**
 * Result of computing a single metric for a trade.
 */
export interface MetricComputationResult {
  rawValue: number | null;
  formattedValue: string;
  status: MetricEvalStatus;
  evaluationText: string;
  evalClass?: string;
  benchmarkText: string;
  benchmarks?: MetricBenchmark[];
  progress?: number;
  colorVal?: string;
}

/**
 * Standard interface for individual metric module files in `analytics/metrics/`.
 */
export interface MetricEngine<TTrade = any, TContext = any> {
  key: string;
  category?: MetricCategory;
  i18n: MetricI18nLabels;
  calculate: (trade: TTrade, context?: TContext, locale?: 'ru' | 'en') => MetricComputationResult;
}

/**
 * Props for the ExMetricCard Vue component.
 */
export interface MetricCardProps {
  /** Metric configuration containing definition and formatters */
  metric: MetricConfig;

  /** Global or local values dictionary passed into dynamic functions */
  values?: MetricValuesRecord;

  /** Dark theme toggle flag (defaults to true) */
  isDark?: boolean;

  /** Compact minimal display mode */
  minimal?: boolean;

  /** Transparent background mode */
  transparent?: boolean;

  /** Active selection highlight */
  selected?: boolean;

  /** Whether to render formula and benchmark details inside card footer */
  showDetails?: boolean;
}
