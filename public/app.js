document.addEventListener('DOMContentLoaded', () => {
  const modeBtns = document.querySelectorAll('.mode-btn');
  const zipMode = document.getElementById('zip-mode');
  const addressMode = document.getElementById('address-mode');
  const zipInput = document.getElementById('zip-input');
  const addressInput = document.getElementById('address-input');
  const searchBtn = document.getElementById('search-btn');
  const resultsEl = document.getElementById('results');
  const statusBar = document.getElementById('status-bar');
  const statusText = statusBar.querySelector('.status-bar__text');

  let currentMode = 'zip';
  let debounceTimer = null;

  // ステータスチェック
  checkStatus();

  // モード切替
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

  // 検索ボタン
  searchBtn.addEventListener('click', search);

  // Enterキーで検索
  zipInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') search();
  });
  addressInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') search();
  });

  // 郵便番号入力のオートフォーマット
  zipInput.addEventListener('input', () => {
    let val = zipInput.value.replace(/[^\d]/g, '');
    if (val.length > 3) {
      val = val.slice(0, 3) + '-' + val.slice(3, 7);
    }
    zipInput.value = val;

    // 入力中にリアルタイム検索（デバウンス付き）
    clearTimeout(debounceTimer);
    if (val.replace('-', '').length >= 3) {
      debounceTimer = setTimeout(search, 400);
    }
  });

  // 住所入力のリアルタイム検索
  addressInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    if (addressInput.value.trim().length >= 2) {
      debounceTimer = setTimeout(search, 400);
    }
  });

  async function search() {
    showLoading();

    try {
      let url;
      if (currentMode === 'zip') {
        const zip = zipInput.value.replace(/[^\d]/g, '');
        if (!zip || zip.length < 3) {
          showError('3桁以上の郵便番号を入力してください');
          return;
        }
        url = `/api/zip/${zip}`;
      } else {
        const q = addressInput.value.trim();
        if (q.length < 2) {
          showError('2文字以上の住所を入力してください');
          return;
        }
        url = `/api/address?q=${encodeURIComponent(q)}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (data.error) {
        showError(data.error);
        return;
      }

      displayResults(data.results);
    } catch (err) {
      showError('通信エラーが発生しました');
    }
  }

  function displayResults(items) {
    if (!items || items.length === 0) {
      resultsEl.innerHTML = `
        <div class="results__empty">
          該当する結果がありませんでした
        </div>
      `;
      return;
    }

    const countText =
      items.length >= 100
        ? `${items.length}+ 件の結果（上位100件を表示）`
        : `${items.length} 件の結果`;

    const cards = items
      .map((item) => {
        const zip = `${item.zip.slice(0, 3)}-${item.zip.slice(3)}`;
        const town = item.town || '';
        return `
        <div class="result-card">
          <div class="result-card__zip">〒${zip}</div>
          <div class="result-card__address">
            <span class="result-card__pref">${item.pref}</span>
            ${item.city}${town}
          </div>
        </div>
      `;
      })
      .join('');

    resultsEl.innerHTML = `
      <div class="results__count">${countText}</div>
      ${cards}
    `;
  }

  function showPlaceholder() {
    resultsEl.innerHTML = `
      <div class="results__placeholder">
        <span class="results__icon">↑</span>
        <p>検索キーワードを入力してください</p>
      </div>
    `;
  }

  function showLoading() {
    resultsEl.innerHTML = `
      <div class="results__loading">検索中...</div>
    `;
  }

  function showError(msg) {
    resultsEl.innerHTML = `
      <div class="results__error">${msg}</div>
    `;
  }

  async function checkStatus() {
    try {
      const res = await fetch('/api/status');
      const data = await res.json();

      if (data.ready) {
        statusBar.classList.add('status-bar--ready');
        statusBar.classList.remove('status-bar--error');
        statusText.textContent = `READY — ${data.count.toLocaleString()} ENTRIES LOADED`;
      } else {
        statusBar.classList.add('status-bar--error');
        statusText.textContent = 'DATA NOT FOUND — RUN: npm run setup';
      }
    } catch {
      statusBar.classList.add('status-bar--error');
      statusText.textContent = 'CONNECTION ERROR';
    }
  }
});
