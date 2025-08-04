import { spawn } from "child_process";

// Nhập câu chat (có thể thay đổi)
const userInput =
  "0xb0C22098741B3E4EF88eEb7d8b56c6E3945C0603 đánh giá bằng tiếng việt";

// Gọi Python script
const python = spawn("python", ["agent.py"]);

python.stdin.write(userInput + "\n");
python.stdin.end();

// Lắng nghe output từ Python
python.stdout.on("data", (data) => {
  console.log("Output:", data.toString("utf8"));
});

python.stderr.on("data", (data) => {
  console.error(`Error: ${data}`);
});

python.on("close", (code) => {
  console.log(`Python process exited with code ${code}`);
});
