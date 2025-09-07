export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const truncateAddress = (address, start = 6, end = 4) => {
  if (!address) return "";
  return `${address.slice(0, start)}...${address.slice(-end)}`;
};

export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    return false;
  }
};

export const downloadFile = (data, filename, type = "text/plain") => {
  const blob = new Blob([data], { type });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const formatDate = (timestamp) => {
  return new Date(timestamp * 1000).toLocaleString();
};

export const calculateGasPrice = async (provider) => {
  try {
    const gasPrice = await provider.getGasPrice();
    return gasPrice.mul(120).div(100);
  } catch (error) {
    console.error("Failed to get gas price:", error);
    return ethers.utils.parseUnits("5", "gwei"); // Fallback
  }
};
