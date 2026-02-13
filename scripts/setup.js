const https = require('https');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const iconv = require('iconv-lite');

const KEN_ALL_URL = 'https://www.post.japanpost.jp/zipcode/dl/kogaki/zip/ken_all.zip';
const DATA_DIR = path.join(__dirname, '..', 'data');
const ZIP_PATH = path.join(DATA_DIR, 'ken_all.zip');
const OUTPUT_PATH = path.join(DATA_DIR, 'postal-data.json');

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(dest);
        return download(res.headers.location, dest).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`ダウンロード失敗: HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

function parseCSVLine(line) {
  const fields = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        fields.push(field);
        field = '';
      } else {
        field += ch;
      }
    }
  }
  fields.push(field);
  return fields;
}

async function setup() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  console.log('📥 KEN_ALL データをダウンロード中...');
  await download(KEN_ALL_URL, ZIP_PATH);
  console.log('✅ ダウンロード完了');

  console.log('📦 ZIP を展開中...');
  const zip = new AdmZip(ZIP_PATH);
  const entries = zip.getEntries();

  let csvContent = '';
  for (const entry of entries) {
    if (entry.entryName.toLowerCase().endsWith('.csv')) {
      const buffer = entry.getData();
      csvContent = iconv.decode(buffer, 'Shift_JIS');
    }
  }

  if (!csvContent) {
    throw new Error('CSVファイルが見つかりませんでした');
  }

  console.log('🔄 データを解析中...');
  const lines = csvContent.split('\r\n');
  const dataMap = new Map();

  for (const line of lines) {
    if (!line.trim()) continue;
    const cols = parseCSVLine(line);
    if (cols.length < 9) continue;

    const zip = cols[2];
    const pref = cols[6];
    const city = cols[7];
    let town = cols[8];
    const prefKana = cols[3];
    const cityKana = cols[4];
    let townKana = cols[5];

    // 特殊な町域名を処理
    if (town === '以下に掲載がない場合') {
      town = '';
      townKana = '';
    }
    if (town.includes('の次に番地がくる場合')) {
      town = '';
      townKana = '';
    }

    const key = `${zip}-${pref}-${city}-${town}`;
    if (!dataMap.has(key)) {
      dataMap.set(key, {
        z: zip,
        p: pref,
        c: city,
        t: town,
        pk: prefKana,
        ck: cityKana,
        tk: townKana,
      });
    }
  }

  const data = Array.from(dataMap.values());
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data), 'utf-8');

  // クリーンアップ
  fs.unlinkSync(ZIP_PATH);

  console.log(`✅ 完了！ ${data.length} 件のデータを処理しました`);
  console.log(`📁 出力先: ${OUTPUT_PATH}`);
}

setup().catch((err) => {
  console.error('❌ エラー:', err.message);
  process.exit(1);
});
