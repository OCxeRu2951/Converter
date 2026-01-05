const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const { exec } = require("child_process");
const readline = require("readline");

// CLI 入力
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

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

      const json = JSON.parse(match[0]);
      resolve(json);
    });
  });
}

// ================================
//  CLI 入力
// ================================
async function ask(q) {
  return new Promise((resolve) => rl.question(q, resolve));
}

async function askTP(data) {
  return parseFloat(
    await ask(
      `測定されたLUFSは${data.input_i}です。\nTrue Peak(TP) をどれくらいに抑えますか？\n> `
    )
  );
}

// 出力タイプ選択
async function askOutputType() {
  console.log("\n出力タイプを選択:");
  console.log("[1] 映像ファイル");
  console.log("[2] 音声ファイル");
  return parseInt(await ask("> "), 10);
}

// 拡張子選択
async function askFileExtension(type) {
  if (type === 1) {
    console.log("\n映像ファイルの拡張子:");
    console.log("[1] mp4");
    console.log("[2] mov");
    console.log("[3] webm");
    console.log("[4] mkv");

    const map = { 1: "mp4", 2: "mov", 3: "webm", 4: "mkv" };
    return map[parseInt(await ask("> "), 10)];
  }

  if (type === 2) {
    console.log("\n音声ファイルの拡張子:");
    console.log("[1] wav");
    console.log("[2] mp3");
    console.log("[3] flac");
    console.log("[4] aac");
    console.log("[5] opus");

    const map = {
      1: "wav",
      2: "mp3",
      3: "flac",
      4: "aac",
      5: "opus",
    };
    return map[parseInt(await ask("> "), 10)];
  }
}

// 映像コーデック
async function askVideoCodec() {
  console.log("\n映像コーデック:");
  console.log("[1] H.264 (libx264)");
  console.log("[2] H.265 (libx265)");
  console.log("[3] ProRes (prores_ks)");
  console.log("[4] VP9 (libvpx-vp9)");

  return parseInt(await ask("> "), 10);
}

// 映像 preset
async function askVideoPreset() {
  console.log("\n映像エンコード preset:");
  console.log("[1] ultrafast");
  console.log("[2] fast");
  console.log("[3] medium");
  console.log("[4] slow");
  console.log("[5] veryslow");

  const map = {
    1: "ultrafast",
    2: "fast",
    3: "medium",
    4: "slow",
    5: "veryslow",
  };
  return map[parseInt(await ask("> "), 10)];
}

// 映像 CRF / Bitrate
async function askVideoMethod() {
  console.log("\n映像の品質方式:");
  console.log("[1] CRF");
  console.log("[2] Bitrate");
  return parseInt(await ask("> "), 10);
}
async function askCRF() {
  return parseInt(await ask("CRF 値を入力 (例: 18〜23):\n> "), 10);
}
async function askVideoBitrate() {
  return await ask("動画ビットレート (例: 5M, 8000k):\n> ");
}

// 音声コーデック
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
  console.log("\n音声ビットレート:");
  console.log("[1] 128k");
  console.log("[2] 192k");
  console.log("[3] 256k");
  console.log("[4] 320k");
  const map = { 1: "128k", 2: "192k", 3: "256k", 4: "320k" };
  return map[parseInt(await ask("> "), 10)];
}
async function askSampleRate() {
  console.log("\nサンプルレート:");
  console.log("[1] 44100");
  console.log("[2] 48000");
  console.log("[3] 96000");
  const map = { 1: 44100, 2: 48000, 3: 96000 };
  return map[parseInt(await ask("> "), 10)];
}
async function askChannels() {
  console.log("\nチャンネル数:");
  console.log("[1] Mono");
  console.log("[2] Stereo");
  const map = { 1: 1, 2: 2 };
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
  opts
) {
  const filter = `loudnorm=
  I=${targetLUFS}:
  TP=${targetTP}:
  LRA=11:
  measured_I=${data.input_i}:
  measured_TP=${data.input_tp}:
  measured_LRA=${data.input_lra}:
  measured_thresh=${data.input_thresh}:
  offset=${data.target_offset}`;
  
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

    // ----------------------------------------
    // 映像出力
    // ----------------------------------------
    if (opts.outputType === 1) {
      out.push(`-c:v ${videoCodec}`);
      out.push(`-preset ${opts.videoPreset}`);

      if (opts.videoMethod === 1) out.push(`-crf ${opts.crf}`);
      else out.push(`-b:v ${opts.videoBitrate}`);

      if (videoCodec === "prores_ks") out.push("-profile:v 3");
    }

    // ----------------------------------------
    // 音声設定
    // ----------------------------------------
    out.push(`-c:a ${audioCodec}`);
    if (!["pcm_s16le", "flac"].includes(audioCodec)) {
      out.push(`-b:a ${opts.audioBitrate}`);
    }
    out.push(`-ar ${opts.sampleRate}`);
    out.push(`-ac ${opts.channels}`);

    // 映像なし（音声出力）
    if (opts.outputType === 2) {
      out.push("-vn");
    }

    out.push("-movflags +faststart");

    command
      .outputOptions(out)
      .on("end", () => {
        console.log("変換完了:", outputPath);
        resolve(outputPath);
      })
      .on("error", reject)
      .save(outputPath);
  });
}

// ================================
//  Main
// ================================
(async () => {
  const input = "input.mov";
  const targetLUFS = -14;

  console.log("LUFS を測定中...");
  const data = await measureLoudness(input, targetLUFS);

  const outputType = await askOutputType();
  const ext = await askFileExtension(outputType);
  let output = `output.${ext}`;

  const targetTP = await askTP(data);

  let videoCodec, videoPreset, videoMethod, crf, videoBitrate;

  // 映像出力なら映像設定を聞く
  if (outputType === 1) {
    videoCodec = await askVideoCodec();
    videoPreset = await askVideoPreset();
    videoMethod = await askVideoMethod();
    if (videoMethod === 1) crf = await askCRF();
    else videoBitrate = await askVideoBitrate();
  }

  // 音声設定
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
})();
