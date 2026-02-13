let searchIndex = [];
let zipIndex = {};
let dataReady = false;

const statusBar = document.getElementById('status-bar');
const statusText = statusBar.querySelector('.status-bar__text');

// データ読み込み
async function loadData() {
  statusText.textContent = 'LOADING DATA...';

  try {
    const res = await fetch('/postal-data.json');
    const grouped = await res.json();

    for (const [pref, cities] of Object.entries(grouped)) {
      for (const [city, towns] of Object.entries(cities)) {
        for (const [town, zip] of towns) {
          const entry = { zip, pref, city, town };
          searchIndex.push(entry);
          if (!zipIndex[zip]) zipIndex[zip] = [];
          zipIndex[zip].push(entry);
        }
      }
    }

    dataReady = true;
    statusBar.classList.add('status-bar--ready');
    statusBar.classList.remove('status-bar--error');
    statusText.textContent = `READY — ${searchIndex.length.toLocaleString()} ENTRIES LOADED`;
  } catch {
    statusBar.classList.add('status-bar--error');
    statusText.textContent = 'DATA LOAD ERROR';
  }
}

// 検索ロジック
function searchByZip(code) {
  if (code.length === 7 && zipIndex[code]) {
    return zipIndex[code];
  }
  return searchIndex.filter((d) => d.zip.startsWith(code)).slice(0, 100);
}

function searchByAddress(q) {
  return searchIndex
    .filter((d) => {
      const address = d.pref + d.city + d.town;
      return address.includes(q);
    })
    .slice(0, 100);
}

// UI
const modeBtns = document.querySelectorAll('.mode-btn');
const zipMode = document.getElementById('zip-mode');
const addressMode = document.getElementById('address-mode');
const zipInput = document.getElementById('zip-input');
const addressInput = document.getElementById('address-input');
const searchBtn = document.getElementById('search-btn');
const resultsEl = document.getElementById('results');

let currentMode = 'zip';
let debounceTimer = null;

modeBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    modeBtns.forEach((b) => b.classList.remove('mode-btn--active'));
    btn.classList.add('mode-btn--active');
    currentMode = btn.dataset.mode;

    if (currentMode === 'zip') {
      zipMode.classList.remove('search-box__mode--hidden');
      addressMode.classList.add('search-box__mode--hidden');
      zipInput.focus();
    } else {
      zipMode.classList.add('search-box__mode--hidden');
      addressMode.classList.remove('search-box__mode--hidden');
      addressInput.focus();
    }
    showPlaceholder();
  });
});

searchBtn.addEventListener('click', search);
zipInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') search(); });
addressInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') search(); });

zipInput.addEventListener('input', () => {
  let val = zipInput.value.replace(/[^\d]/g, '');
  if (val.length > 3) val = val.slice(0, 3) + '-' + val.slice(3, 7);
  zipInput.value = val;

  clearTimeout(debounceTimer);
  if (val.replace('-', '').length >= 3) {
    debounceTimer = setTimeout(search, 300);
  }
});

addressInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  if (addressInput.value.trim().length >= 2) {
    debounceTimer = setTimeout(search, 300);
  }
});

function search() {
  if (!dataReady) {
    showError('データ読み込み中です...');
    return;
  }

  let results;
  if (currentMode === 'zip') {
    const zip = zipInput.value.replace(/[^\d]/g, '');
    if (!zip || zip.length < 3) {
      showError('3桁以上の郵便番号を入力してください');
      return;
    }
    results = searchByZip(zip);
  } else {
    const q = addressInput.value.trim();
    if (q.length < 2) {
      showError('2文字以上の住所を入力してください');
      return;
    }
    results = searchByAddress(q);
  }

  displayResults(results);
}

function displayResults(items) {
  if (!items || items.length === 0) {
    resultsEl.innerHTML = '<div class="results__empty">該当する結果がありませんでした</div>';
    return;
  }

  const countText = items.length >= 100
    ? `${items.length}+ 件の結果（上位100件を表示）`
    : `${items.length} 件の結果`;

  const cards = items.map((item) => {
    const zip = `${item.zip.slice(0, 3)}-${item.zip.slice(3)}`;
    return `
      <div class="result-card">
        <div class="result-card__zip">〒${zip}</div>
        <div class="result-card__address">
          <span class="result-card__pref">${item.pref}</span>
          ${item.city}${item.town || ''}
        </div>
      </div>`;
  }).join('');

  resultsEl.innerHTML = `<div class="results__count">${countText}</div>${cards}`;
}

function showPlaceholder() {
  resultsEl.innerHTML = `
    <div class="results__placeholder">
      <span class="results__icon">↑</span>
      <p>検索キーワードを入力してください</p>
    </div>`;
}

function showError(msg) {
  resultsEl.innerHTML = `<div class="results__error">${msg}</div>`;
}

// 起動
loadData();
