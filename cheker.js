const { exec } = require("child_process");

function checkLUFS(inputPath, targetLUFS = -14) {
  return new Promise((resolve, reject) => {
    const cmd = `ffmpeg -i "${inputPath}" -af loudnorm=I=${targetLUFS}:print_format=json -f null -`;

    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        reject("計測中にエラーが発生しました: " + err);
        return;
      }

      const output = stderr || stdout;

      // JSON 部分のみ抽出
      const jsonMatch = output.match(/\{[\s\S]*?\}/);
      if (!jsonMatch) {
        reject("loudnorm の JSON が取得できませんでした");
        return;
      }

      const data = JSON.parse(jsonMatch[0]);
      resolve(data);
    });
  });
}

// 使用例
(async () => {
  const input = "output.mp4"; // どんな音声でも可 (wav, mp3, mp4 など)
  try {
    const result = await checkLUFS(input);

    console.log("=== LUFS 測定結果 ===");
    console.log("Integrated LUFS:", result.input_i);
    console.log("True Peak:", result.input_tp);
    console.log("LRA:", result.input_lra);
    console.log("Threshold:", result.input_thresh);
    console.log("Offset:", result.target_offset);
  } catch (err) {
    console.error(err);
  }
})();
