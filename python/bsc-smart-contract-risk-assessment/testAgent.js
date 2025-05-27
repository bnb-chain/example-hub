"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var child_process_1 = require("child_process");
// Nhập câu chat (có thể thay đổi)
var userInput = "0xb0C22098741B3E4EF88eEb7d8b56c6E3945C0603 đánh giá bằng tiếng việt";
// Gọi Python script
var python = (0, child_process_1.spawn)("python", ["agent.py"]);
python.stdin.write(userInput + "\n");
python.stdin.end();
// Lắng nghe output từ Python
python.stdout.on("data", function (data) {
    console.log("Output:", data.toString("utf8"));
});
python.stderr.on("data", function (data) {
    console.error("Error: ".concat(data));
});
python.on("close", function (code) {
    console.log("Python process exited with code ".concat(code));
});
