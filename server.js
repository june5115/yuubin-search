const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ひらがな → カタカナ変換
function toKatakana(str) {
  return str.replace(/[\u3041-\u3096]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );
}

// 郵便データ読み込み（コンパクト形式）
const searchIndex = [];
const zipIndex = {};
const dataPath = path.join(__dirname, 'data', 'postal-data.json');

if (fs.existsSync(dataPath)) {
  console.log('📂 郵便データを読み込み中...');
  const raw = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const kanaMap = raw._k || {};
  const grouped = raw.d || {};

  for (const [pref, cities] of Object.entries(grouped)) {
    const prefKana = kanaMap[pref] || '';
    for (const [city, towns] of Object.entries(cities)) {
      const cityKana = kanaMap[city] || '';
      for (const [town, townKana, zip] of towns) {
        const entry = { zip, pref, city, town, prefKana, cityKana, townKana };
        searchIndex.push(entry);
        if (!zipIndex[zip]) zipIndex[zip] = [];
        zipIndex[zip].push(entry);
      }
    }
  }
  console.log(`✅ ${searchIndex.length} 件のデータを読み込みました`);
} else {
  console.warn('⚠️  郵便データが見つかりません。先に npm run setup を実行してください');
}

// 静的ファイル
app.use(express.static(path.join(__dirname, 'public')));

// API: データ状態チェック
app.get('/api/status', (_req, res) => {
  res.json({
    ready: searchIndex.length > 0,
    count: searchIndex.length,
  });
});

// API: 郵便番号 → 住所
app.get('/api/zip/:code', (req, res) => {
  const code = req.params.code.replace(/[-\s]/g, '');
  if (!/^\d{3,7}$/.test(code)) {
    return res.json({ results: [], error: '有効な郵便番号を入力してください' });
  }

  let results;
  if (code.length === 7 && zipIndex[code]) {
    results = zipIndex[code];
  } else {
    results = searchIndex.filter((d) => d.zip.startsWith(code)).slice(0, 100);
  }

  res.json({
    results: results.map((d) => ({
      zip: d.zip,
      pref: d.pref,
      city: d.city,
      town: d.town,
    })),
  });
});

// API: 住所 → 郵便番号
app.get('/api/address', (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) {
    return res.json({ results: [], error: '2文字以上入力してください' });
  }

  const qKata = toKatakana(q);

  const results = searchIndex
    .filter((d) => {
      const address = d.pref + d.city + d.town;
      const addressKana = d.prefKana + d.cityKana + d.townKana;
      return address.includes(q) || addressKana.includes(qKata);
    })
    .slice(0, 100)
    .map((d) => ({
      zip: d.zip,
      pref: d.pref,
      city: d.city,
      town: d.town,
    }));
  res.json({ results });
});

app.listen(PORT, () => {
  console.log(`🚀 サーバー起動: http://localhost:${PORT}`);
});

module.exports = app;
