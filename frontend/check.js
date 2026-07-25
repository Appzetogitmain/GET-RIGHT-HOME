const fs = require('fs');
const babel = require('@babel/parser');

try {
  const code = fs.readFileSync('src/homster/modules/worker/pages/Dashboard/index.jsx', 'utf-8');
  babel.parse(code, {
    sourceType: 'module',
    plugins: ['jsx']
  });
  console.log('No syntax errors');
} catch (e) {
  console.error(e);
}
