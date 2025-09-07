import { ethers } from "ethers";

// Contract configuration
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS_TESTNET;
const CONTRACT_ABI = [
  "function serviceFee() view returns (uint256)",
  "function calculateBNBTotal(tuple(address recipient, uint256 amount)[] payouts) view returns (uint256)",
  "function calculateTokenTotal(tuple(address recipient, uint256 amount)[] payouts) pure returns (uint256)",
  "function massPayoutBNB(tuple(address recipient, uint256 amount)[] payouts) payable",
  "function massPayoutToken(address token, tuple(address recipient, uint256 amount)[] payouts) payable",
  "function getContractStats() view returns (uint256 contractBalance, uint256 currentServiceFee, address currentFeeCollector)",
];

class ContractService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.contractAddress = CONTRACT_ADDRESS;
  }

  // Initialize the contract connection
  async initialize(walletProvider = null) {
    try {
      if (!this.contractAddress) {
        throw new Error("Contract address not found in environment variables");
      }

      // Use provided wallet or window.ethereum
      const provider = walletProvider || window.ethereum;
      if (!provider) {
        throw new Error("No wallet provider available");
      }

      this.provider = new ethers.providers.Web3Provider(provider);

      // Check if we're on the correct network (BSC Testnet = 97)
      const network = await this.provider.getNetwork();
      if (network.chainId !== 97) {
        throw new Error(
          `Wrong network. Please switch to BSC Testnet. Current: ${network.chainId}`
        );
      }

      this.signer = this.provider.getSigner();
      this.contract = new ethers.Contract(
        this.contractAddress,
        CONTRACT_ABI,
        this.signer
      );

      console.log("✅ Contract service initialized");
      console.log("📄 Contract Address:", this.contractAddress);
      console.log("🌐 Network:", network.name, `(${network.chainId})`);

      return true;
    } catch (error) {
      console.error("❌ Failed to initialize contract service:", error);
      throw error;
    }
  }

  // Get service fee
  async getServiceFee() {
    try {
      if (!this.contract) {
        await this.initialize();
      }

      const serviceFee = await this.contract.serviceFee();
      console.log("📊 Service Fee (wei):", serviceFee.toString());
      console.log(
        "📊 Service Fee (BNB):",
        ethers.utils.formatEther(serviceFee)
      );

      return serviceFee;
    } catch (error) {
      console.error("❌ Failed to get service fee:", error);
      // Return default service fee if contract call fails
      return ethers.utils.parseEther("0.001");
    }
  }

  // Calculate total BNB needed (including service fee)
  async calculateBNBTotal(payouts) {
    try {
      if (!this.contract) {
        await this.initialize();
      }

      const total = await this.contract.calculateBNBTotal(payouts);
      console.log("📊 Total BNB needed:", ethers.utils.formatEther(total));

      return total;
    } catch (error) {
      console.error("❌ Failed to calculate BNB total:", error);

      // Fallback calculation
      const serviceFee = ethers.utils.parseEther("0.001");
      const payoutTotal = payouts.reduce((sum, payout) => {
        return sum.add(payout.amount);
      }, ethers.BigNumber.from(0));

      return payoutTotal.add(serviceFee);
    }
  }

  // Calculate total token amount needed
  async calculateTokenTotal(payouts) {
    try {
      if (!this.contract) {
        await this.initialize();
      }

      const total = await this.contract.calculateTokenTotal(payouts);
      return total;
    } catch (error) {
      console.error("❌ Failed to calculate token total:", error);

      // Fallback calculation
      return payouts.reduce((sum, payout) => {
        return sum.add(payout.amount);
      }, ethers.BigNumber.from(0));
    }
  }

  // Execute BNB payout
  async executeBNBPayout(payouts, totalValue) {
    try {
      if (!this.contract) {
        await this.initialize();
      }

      const tx = await this.contract.massPayoutBNB(payouts, {
        value: totalValue,
      });

      return tx;
    } catch (error) {
      console.error("❌ Failed to execute BNB payout:", error);
      throw error;
    }
  }

  // Execute token payout
  async executeTokenPayout(tokenAddress, payouts, serviceFee) {
    try {
      if (!this.contract) {
        await this.initialize();
      }

      const tx = await this.contract.massPayoutToken(tokenAddress, payouts, {
        value: serviceFee,
      });

      return tx;
    } catch (error) {
      console.error("❌ Failed to execute token payout:", error);
      throw error;
    }
  }

  // Get contract stats
  async getContractStats() {
    try {
      if (!this.contract) {
        await this.initialize();
      }

      const stats = await this.contract.getContractStats();
      return {
        contractBalance: stats[0],
        currentServiceFee: stats[1],
        currentFeeCollector: stats[2],
      };
    } catch (error) {
      console.error("❌ Failed to get contract stats:", error);
      return null;
    }
  }

  // Estimate gas for transaction
  async estimateGas(method, params, options = {}) {
    try {
      if (!this.contract) {
        await this.initialize();
      }

      const gasEstimate = await this.contract.estimateGas[method](
        ...params,
        options
      );
      return gasEstimate;
    } catch (error) {
      console.error("❌ Failed to estimate gas:", error);
      // Return a reasonable default gas estimate
      return ethers.BigNumber.from("300000");
    }
  }
}

// Create singleton instance
const contractService = new ContractService();

export default contractService;

export const getServiceFee = () => contractService.getServiceFee();
export const calculateBNBTotal = (payouts) =>
  contractService.calculateBNBTotal(payouts);
export const calculateTokenTotal = (payouts) =>
  contractService.calculateTokenTotal(payouts);
export const executeBNBPayout = (payouts, totalValue) =>
  contractService.executeBNBPayout(payouts, totalValue);
export const executeTokenPayout = (tokenAddress, payouts, serviceFee) =>
  contractService.executeTokenPayout(tokenAddress, payouts, serviceFee);
