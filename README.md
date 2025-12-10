# 概要

```convert.js```でファイルの変換、```checker.js```でLUFSの測定が可能です。  
注意：動作にはNode.jsが必要です。

## ライブラリ

```fluent-ffmpeg```が必要になります。

```必須ライブラリ
npm install fluent-ffmpeg
```

## 使い方

### convert.js

```JavaScript
const input = "input.mov";
```

```input```は出力前のファイル名を指定してください。
出力後はoutput.[拡張子]で出力されます。

### cheker.js

```input```に測定したいファイル名を指定してください。

```JavaScript
  const input = "input.mp4"; // どんな音声でも可 (wav, mp3, mp4 など)
```
