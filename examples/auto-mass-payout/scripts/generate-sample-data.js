const fs = require("fs");
const { ethers } = require("ethers");

// Generate sample recipient data for testing
function generateSampleData(count = 10) {
  const recipients = [];

  for (let i = 0; i < count; i++) {
    // Generate random wallet address
    const wallet = ethers.Wallet.createRandom();

    // Generate random amount between 0.01 and 10
    const amount = (Math.random() * 9.99 + 0.01).toFixed(6);

    recipients.push({
      address: wallet.address,
      amount: amount,
    });
  }

  return recipients;
}

// Generate CSV format
function generateCSV(recipients) {
  const header = "address,amount\n";
  const rows = recipients.map((r) => `${r.address},${r.amount}`).join("\n");
  return header + rows;
}

// Generate JSON format
function generateJSON(recipients) {
  return JSON.stringify(recipients, null, 2);
}

// Main execution
const sampleCount = process.argv[2] || 10;
const recipients = generateSampleData(parseInt(sampleCount));

// Save CSV file
const csvData = generateCSV(recipients);
fs.writeFileSync(`sample-recipients-${sampleCount}.csv`, csvData);

// Save JSON file
const jsonData = generateJSON(recipients);
fs.writeFileSync(`sample-recipients-${sampleCount}.json`, jsonData);

console.log(`✅ Generated sample data for ${sampleCount} recipients:`);
console.log(`- sample-recipients-${sampleCount}.csv`);
console.log(`- sample-recipients-${sampleCount}.json`);
console.log(
  `\nTotal amount: ${recipients
    .reduce((sum, r) => sum + parseFloat(r.amount), 0)
    .toFixed(6)}`
);
