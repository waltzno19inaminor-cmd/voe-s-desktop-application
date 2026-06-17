const fs = require('fs');

const data = JSON.parse(fs.readFileSync('./src/shared/assets/indicators.json', 'utf8'));

for (const cat of data.categories) {
  for (const indicator of cat.indicators) {
    if (indicator.type === 'indicator' && indicator.label !== 'SMA') {
      if (!indicator.params) {
        indicator.params = {};
      }
      indicator.params.needsConfig = true;
    }
  }
}

fs.writeFileSync('./src/shared/assets/indicators.json', JSON.stringify(data, null, 2));
