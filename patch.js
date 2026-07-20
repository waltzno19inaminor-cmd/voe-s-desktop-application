const fs = require('fs');
const file = 'src/features/store/useStrategyTrades.ts';
let code = fs.readFileSync(file, 'utf8');

const hiddenStateCode = `
  const _hiddenStrategies = ref<StrategyProfile[]>([])
  const _hiddenTradesByStrategy = ref<Record<string, DiaryEntry[]>>({})
  const _hiddenInitialDeposits = ref<Record<string, number>>({})
  const _hiddenHiddenTradeIds = ref<Record<string, string[]>>({})
`;

code = code.replace(
  "  const isInitialized = ref(false)",
  "  const isInitialized = ref(false)\n" + hiddenStateCode
);

const newEnforceDemo = `
  function enforceDemoMainDiaryOnly() {
    const mainDiaryTrades = tradesByStrategy.value['MAIN_DIARY'] || []
    
    // Preserve other strategies in hidden state instead of deleting or merging them
    _hiddenStrategies.value = strategies.value.filter(s => s.id !== 'MAIN_DIARY')
    
    Object.entries(tradesByStrategy.value).forEach(([strategyId, trades]) => {
      if (strategyId !== 'MAIN_DIARY') {
        _hiddenTradesByStrategy.value[strategyId] = trades
      }
    })
    
    Object.entries(hiddenTradeIdsByStrategy.value).forEach(([strategyId, tradeIds]) => {
      if (strategyId !== 'MAIN_DIARY') {
        _hiddenHiddenTradeIds.value[strategyId] = tradeIds
      }
    })

    Object.entries(initialDepositsByStrategy.value).forEach(([strategyId, deposit]) => {
      if (strategyId !== 'MAIN_DIARY') {
        _hiddenInitialDeposits.value[strategyId] = deposit
      }
    })

    const initialDeposit = initialDepositsByStrategy.value['MAIN_DIARY'] ?? 1000
    strategies.value = [{ ...MAIN_DIARY_STRATEGY }]
    tradesByStrategy.value = { 'MAIN_DIARY': mainDiaryTrades }
    hiddenTradeIdsByStrategy.value = { 'MAIN_DIARY': hiddenTradeIdsByStrategy.value['MAIN_DIARY'] || [] }
    initialDepositsByStrategy.value = { 'MAIN_DIARY': initialDeposit }
    selectedStrategyId.value = 'MAIN_DIARY'
  }
`;

code = code.replace(/  function enforceDemoMainDiaryOnly\(\) \{[\s\S]*?    selectedStrategyId\.value = 'MAIN_DIARY'\n  \}/, newEnforceDemo.trim());

const newSave = `
  async function save() {
    const data: StrategyTradesData = {
      strategies: [...strategies.value, ..._hiddenStrategies.value],
      tradesByStrategy: { ...tradesByStrategy.value, ..._hiddenTradesByStrategy.value },
      initialDepositsByStrategy: { ...initialDepositsByStrategy.value, ..._hiddenInitialDeposits.value },
      hiddenTradeIdsByStrategy: { ...hiddenTradeIdsByStrategy.value, ..._hiddenHiddenTradeIds.value }
    }
    // Save to both Main and Backup for safety
    await saveToDisk('strategy_trades_v1', data)
    await saveToDisk('strategy_trades_v1_backup', data)
  }
`;

code = code.replace(/  async function save\(\) \{[\s\S]*?    await saveToDisk\('strategy_trades_v1_backup', data\)\n  \}/, newSave.trim());

fs.writeFileSync(file, code);
