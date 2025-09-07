const fs = require("fs");
const path = require("path");

// Create .env file if it doesn't exist
const envPath = path.join(__dirname, "..", ".env");
const envExamplePath = path.join(__dirname, "..", ".env.example");

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  fs.copyFileSync(envExamplePath, envPath);
  console.log("✅ Created .env file from .env.example");
  console.log("📝 Please update the .env file with your actual values");
} else if (fs.existsSync(envPath)) {
  console.log("✅ .env file already exists");
} else {
  console.log("❌ No .env.example file found");
}

// Create contracts directory for ABI files
const contractsDir = path.join(__dirname, "..", "src", "contracts");
if (!fs.existsSync(contractsDir)) {
  fs.mkdirSync(contractsDir, { recursive: true });
  console.log("✅ Created contracts directory");
}

console.log("🎉 Environment setup complete!");
