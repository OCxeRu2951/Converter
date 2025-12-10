# メディア変換・LUFS測定ツール

趣味で作成した Node.js ベースのツールです。  

- `convert.js`：動画・音声ファイルの形式変換  
- `checker.js`：音声ファイルのラウドネス（LUFS）測定  

動作には**Node.js**と**ffmpeg**が必要です。

---

## 依存ライブラリ

本プロジェクトは `fluent-ffmpeg` を使用しています。  
依存関係はすべて `package.json` に記載してあるため、次のコマンドで一括インストールできます。

```bash
npm install
```

個別にインストールしたい場合はこちら：

```bash
npm install fluent-ffmpeg
```

※ ffmpeg 本体をインストールし、実行パスが通っている必要があります。

---

## 使い方

### 1. convert.js（形式変換）

```javascript
const input = "input.mov";
```

`input` に変換したい元ファイル名を指定してください。  
変換後は `output.[拡張子]` という名前で保存されます。

実行例：

```bash
node convert.js
```

---

### 2. checker.js（LUFS測定）

```javascript
const input = "input.mp4"; // wav / mp3 / mp4 など任意の音声ファイル
```

`input` に測定したいファイル名を指定してください。

実行例：

```bash
node checker.js
```

---

## 動作環境

- Node.js v16 以上推奨  
- ffmpeg がインストールされていること  
- macOS / Windows / Linux 対応  

---

## 注意事項

- LUFS 測定には ffmpeg の `loudnorm` フィルタを利用しています  
- 出力結果はターミナルに表示されます  
- 本ツールは個人用途向けです
