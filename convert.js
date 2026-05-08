const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs"); // ファイルシステム操作用に追加
const { exec } = require("child_process");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// ================================
//  ファイル選択機能 (新規追加)
// ================================
async function selectFile() {
  const supportedExts = [
    ".mp3",
    ".mp4",
    ".mov",
    ".wav",
    ".mkv",
    ".webm",
    ".flac",
    ".aac",
  ];
  const files = fs
    .readdirSync("./")
    .filter((file) => supportedExts.includes(path.extname(file).toLowerCase()));

  if (files.length === 0) {
    console.log("対象のファイルが見つかりませんでした。");
    process.exit(1);
  }

  console.log("\n処理するファイルを選択してください:");
  files.forEach((file, index) => {
    console.log(`[${index + 1}] ${file}`);
  });

  const choice = parseInt(await ask("> "), 10);
  const selectedFile = files[choice - 1];

  if (!selectedFile) {
    console.log("無効な選択です。");
    return await selectFile();
  }
  return selectedFile;
}

// ================================
//  Loudness 測定
// ================================
async function measureLoudness(inputPath, targetLUFS = -14) {
  return new Promise((resolve, reject) => {
    const cmd = `ffmpeg -i "${inputPath}" -af loudnorm=I=${targetLUFS}:print_format=json -f null - 2>&1`;

    exec(cmd, (err, stdout) => {
      if (err) return reject(err);
      const match = stdout.match(/\{[\s\S]*?\}/);
      if (!match) return reject("loudnorm 測定結果が取得できませんでした");
      resolve(JSON.parse(match[0]));
    });
  });
}

// ================================
//  CLI 入力ヘルパー
// ================================
async function ask(q) {
  return new Promise((resolve) => rl.question(q, resolve));
}

async function askTP(data) {
  return parseFloat(
    await ask(
      `測定されたLUFSは${data.input_i}です。\nTrue Peak(TP) をどれくらいに抑えますか？\n> `,
    ),
  );
}

async function askOutputType() {
  console.log("\n出力タイプを選択:");
  console.log("[1] 映像ファイル");
  console.log("[2] 音声ファイル");
  return parseInt(await ask("> "), 10);
}

async function askFileExtension(type) {
  if (type === 1) {
    console.log("\n映像ファイルの拡張子:");
    const map = { 1: "mp4", 2: "mov", 3: "webm", 4: "mkv" };
    Object.entries(map).forEach(([k, v]) => console.log(`[${k}] ${v}`));
    return map[parseInt(await ask("> "), 10)];
  } else {
    console.log("\n音声ファイルの拡張子:");
    const map = { 1: "wav", 2: "mp3", 3: "flac", 4: "aac", 5: "opus" };
    Object.entries(map).forEach(([k, v]) => console.log(`[${k}] ${v}`));
    return map[parseInt(await ask("> "), 10)];
  }
}

async function askVideoCodec() {
  console.log("\n映像コーデック:");
  console.log("[1] H.264 (libx264)");
  console.log("[2] H.265 (libx265)");
  console.log("[3] ProRes (prores_ks)");
  console.log("[4] VP9 (libvpx-vp9)");
  return parseInt(await ask("> "), 10);
}

async function askVideoPreset() {
  console.log("\n映像エンコード preset:");
  const map = {
    1: "ultrafast",
    2: "fast",
    3: "medium",
    4: "slow",
    5: "veryslow",
  };
  Object.entries(map).forEach(([k, v]) => console.log(`[${k}] ${v}`));
  return map[parseInt(await ask("> "), 10)];
}

async function askVideoMethod() {
  console.log("\n映像の品質方式:");
  console.log("[1] CRF");
  console.log("[2] Bitrate");
  return parseInt(await ask("> "), 10);
}

async function askAudioCodec() {
  console.log("\n音声コーデック:");
  console.log("[1] AAC");
  console.log("[2] Opus");
  console.log("[3] MP3");
  console.log("[4] PCM (wav)");
  console.log("[5] FLAC");
  return parseInt(await ask("> "), 10);
}

async function askAudioBitrate() {
  const map = { 1: "128k", 2: "192k", 3: "256k", 4: "320k" };
  console.log("\n音声ビットレート:");
  Object.entries(map).forEach(([k, v]) => console.log(`[${k}] ${v}`));
  return map[parseInt(await ask("> "), 10)];
}

async function askSampleRate() {
  const map = { 1: 44100, 2: 48000, 3: 96000 };
  console.log("\nサンプルレート:");
  Object.entries(map).forEach(([k, v]) => console.log(`[${k}] ${v}`));
  return map[parseInt(await ask("> "), 10)];
}

async function askChannels() {
  const map = { 1: 1, 2: 2 };
  console.log("\nチャンネル数:");
  console.log("[1] Mono");
  console.log("[2] Stereo");
  return map[parseInt(await ask("> "), 10)];
}

// ================================
//  FFmpeg 処理
// ================================
async function convert(
  inputPath,
  outputPath,
  targetLUFS,
  targetTP,
  data,
  opts,
) {
  const filter = `loudnorm=I=${targetLUFS}:TP=${targetTP}:LRA=11:measured_I=${data.input_i}:measured_TP=${data.input_tp}:measured_LRA=${data.input_lra}:measured_thresh=${data.input_thresh}:offset=${data.target_offset}`;

  const audioCodecMap = {
    1: "aac",
    2: "libopus",
    3: "libmp3lame",
    4: "pcm_s16le",
    5: "flac",
  };
  const videoCodecMap = {
    1: "libx264",
    2: "libx265",
    3: "prores_ks",
    4: "libvpx-vp9",
  };

  const audioCodec = audioCodecMap[opts.audioCodec];
  const videoCodec =
    opts.outputType === 1 ? videoCodecMap[opts.videoCodec] : null;

  return new Promise((resolve, reject) => {
    const command = ffmpeg(inputPath).audioFilters(filter);
    const out = [];

    if (opts.outputType === 1) {
      out.push(`-c:v ${videoCodec}`, `-preset ${opts.videoPreset}`);
      if (opts.videoMethod === 1) out.push(`-crf ${opts.crf}`);
      else out.push(`-b:v ${opts.videoBitrate}`);
      if (videoCodec === "prores_ks") out.push("-profile:v 3");
    }

    out.push(`-c:a ${audioCodec}`);
    if (!["pcm_s16le", "flac"].includes(audioCodec)) {
      out.push(`-b:a ${opts.audioBitrate}`);
    }
    out.push(`-ar ${opts.sampleRate}`, `-ac ${opts.channels}`);

    if (opts.outputType === 2) out.push("-vn");
    out.push("-movflags +faststart");

    command
      .outputOptions(out)
      .on("start", (cmd) => console.log("\n実行コマンド:", cmd))
      .on("end", () => {
        console.log("\n変換完了:", outputPath);
        resolve(outputPath);
      })
      .on("error", (err) => {
        console.error("エラーが発生しました:", err.message);
        reject(err);
      })
      .save(outputPath);
  });
}

// ================================
//  Main
// ================================
(async () => {
  try {
    // 1. ファイルを選択
    const input = await selectFile();
    const targetLUFS = -14;

    console.log(`\n「${input}」の LUFS を測定中...`);
    const data = await measureLoudness(input, targetLUFS);

    // 2. 出力設定を聞く
    const outputType = await askOutputType();
    const ext = await askFileExtension(outputType);

    // 3. 元のファイル名から出力名を生成 (例: input.mp4 -> input_processed.mp4)
    const inputName = path.parse(input).name;
    const output = `${inputName}_processed.${ext}`;

    const targetTP = await askTP(data);

    let videoCodec, videoPreset, videoMethod, crf, videoBitrate;
    if (outputType === 1) {
      videoCodec = await askVideoCodec();
      videoPreset = await askVideoPreset();
      videoMethod = await askVideoMethod();
      if (videoMethod === 1)
        crf = await parseInt(await ask("CRF 値を入力 (18-23):\n> "), 10);
      else videoBitrate = await ask("動画ビットレート (例: 5M):\n> ");
    }

    const audioCodec = await askAudioCodec();
    const audioBitrate = await askAudioBitrate();
    const sampleRate = await askSampleRate();
    const channels = await askChannels();

    rl.close();

    await convert(input, output, targetLUFS, targetTP, data, {
      outputType,
      videoCodec,
      videoPreset,
      videoMethod,
      crf,
      videoBitrate,
      audioCodec,
      audioBitrate,
      sampleRate,
      channels,
    });
  } catch (error) {
    console.error("エラー:", error);
    rl.close();
  }
})();
