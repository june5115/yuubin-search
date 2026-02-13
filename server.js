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

// 郵便データ読み込み
let postalData = [];
const dataPath = path.join(__dirname, 'data', 'postal-data.json');

if (fs.existsSync(dataPath)) {
  console.log('📂 郵便データを読み込み中...');
  const raw = fs.readFileSync(dataPath, 'utf-8');
  postalData = JSON.parse(raw);
  console.log(`✅ ${postalData.length} 件のデータを読み込みました`);
} else {
  console.warn('⚠️  郵便データが見つかりません。先に npm run setup を実行してください');
}

// 静的ファイル
app.use(express.static(path.join(__dirname, 'public')));

// API: データ状態チェック
app.get('/api/status', (_req, res) => {
  res.json({
    ready: postalData.length > 0,
    count: postalData.length,
  });
});

// API: 郵便番号 → 住所
app.get('/api/zip/:code', (req, res) => {
  const code = req.params.code.replace(/[-\s]/g, '');
  if (!/^\d{3,7}$/.test(code)) {
    return res.json({ results: [], error: '有効な郵便番号を入力してください' });
  }
  const results = postalData
    .filter((d) => d.z.startsWith(code))
    .slice(0, 100)
    .map((d) => ({
      zip: d.z,
      pref: d.p,
      city: d.c,
      town: d.t,
    }));
  res.json({ results });
});

// API: 住所 → 郵便番号
app.get('/api/address', (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) {
    return res.json({ results: [], error: '2文字以上入力してください' });
  }

  const qKata = toKatakana(q);

  const results = postalData
    .filter((d) => {
      const address = d.p + d.c + d.t;
      const addressKana = d.pk + d.ck + d.tk;
      return address.includes(q) || addressKana.includes(qKata);
    })
    .slice(0, 100)
    .map((d) => ({
      zip: d.z,
      pref: d.p,
      city: d.c,
      town: d.t,
    }));
  res.json({ results });
});

app.listen(PORT, () => {
  console.log(`🚀 サーバー起動: http://localhost:${PORT}`);
});

module.exports = app;
