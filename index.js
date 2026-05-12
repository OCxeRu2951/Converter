const { spawn } = require("child_process");
const readline = require("readline");
const path = require("path");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(q) {
  return new Promise((resolve) => rl.question(q, resolve));
}

(async () => {
  console.log("=== Media Processor CLI ===");
  console.log("[1] Checker (詳細解析・LUFS測定)");
  console.log("[2] Converter (ラウドネス正規化・エンコード)");

  const choice = await ask("\nどちらを起動しますか？ > ");
  const trimmedChoice = choice.trim();

  let scriptName = "";
  if (trimmedChoice === "1") {
    scriptName = "checker.js";
  } else if (trimmedChoice === "2") {
    scriptName = "convert.js";
  } else {
    console.log("無効な選択です。終了します。");
    rl.close();
    process.exit(0);
  }

  // 重要: 子プロセスに標準入力を引き継ぐ前に、親のreadlineを閉じる
  rl.close();

  const scriptPath = path.join(__dirname, "src", scriptName);

  // stdio: "inherit" により、キーボード入力を直接子プロセスに繋ぐ
  const child = spawn("node", [scriptPath], { stdio: "inherit" });

  child.on("close", (code) => {
    process.exit(code);
  });
})();
