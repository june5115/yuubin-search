# 〒 郵便番号検索 / Postal Code Search

日本の郵便番号と住所を双方向検索できるアプリです。
ブルータリズムデザインのUI。

## 機能

- **郵便番号 → 住所** : 郵便番号を入力すると住所が表示されます
- **住所 → 郵便番号** : 住所（漢字・カナ）を入力すると郵便番号が表示されます
- リアルタイム検索（入力中に自動検索）
- ひらがな・カタカナどちらでも検索可能

## セットアップ

```bash
# 依存パッケージのインストール
npm install

# 郵便データのダウンロード（日本郵政 KEN_ALL）
npm run setup
```

## 起動方法

### Web アプリ

```bash
npm start
```

ブラウザで http://localhost:3000 を開いてください。

### デスクトップアプリ（Electron）

```bash
npm run desktop
```

## データソース

- [日本郵便 郵便番号データ（KEN_ALL）](https://www.post.japanpost.jp/zipcode/download.html)
