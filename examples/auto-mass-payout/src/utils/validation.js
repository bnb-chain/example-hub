import { ethers } from "ethers";

export const validateAddress = (address) => {
  try {
    return ethers.utils.isAddress(address);
  } catch {
    return false;
  }
};

export const validateAmount = (amount, decimals = 18) => {
  try {
    const parsed = ethers.utils.parseUnits(amount.toString(), decimals);
    return parsed.gt(0);
  } catch {
    return false;
  }
};

export const parseCSVData = (csvText) => {
  const lines = csvText.trim().split("\n");
  const results = [];
  const errors = [];

  const startIndex = lines[0].toLowerCase().includes("address") ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const [address, amount] = line.split(",").map((item) => item.trim());

    if (!address || !amount) {
      errors.push(`Line ${i + 1}: Missing address or amount`);
      continue;
    }

    if (!validateAddress(address)) {
      errors.push(`Line ${i + 1}: Invalid address ${address}`);
      continue;
    }

    if (!validateAmount(amount)) {
      errors.push(`Line ${i + 1}: Invalid amount ${amount}`);
      continue;
    }

    results.push({
      address: ethers.utils.getAddress(address),
      amount: amount,
      originalAmount: amount,
    });
  }

  return { results, errors };
};

export const formatTokenAmount = (amount, decimals = 18, symbol = "") => {
  try {
    const formatted = ethers.utils.formatUnits(amount, decimals);
    const number = parseFloat(formatted);

    if (number === 0) return "0";
    if (number < 0.001) return "< 0.001";
    if (number < 1)
      return number.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
    if (number < 1000)
      return number.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");

    // Format large numbers with K, M, B
    if (number >= 1000000000) return (number / 1000000000).toFixed(1) + "B";
    if (number >= 1000000) return (number / 1000000).toFixed(1) + "M";
    if (number >= 1000) return (number / 1000).toFixed(1) + "K";

    return number.toString();
  } catch (error) {
    return "0";
  }
};
