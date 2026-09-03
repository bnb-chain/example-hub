export const paymentProcessorAbi = [
  "function registerMerchant(address payoutAddress)",
  "function updatePayout(address newPayout)",
  "function merchantNonce(address merchant) view returns (uint256)",
  "function computeInvoiceId(address merchant,uint256 amount,string memo,uint256 nonce) view returns (bytes32)",
  "function paymentStatus(bytes32 invoiceId) view returns (uint8)",
  "function paymentDetails(bytes32 invoiceId) view returns (address,address,uint256,uint256,uint8,string)",
  "function pay(address merchant,uint256 amount,string memo,bytes32 invoiceId)",
  "event PaymentSettled(bytes32 indexed invoiceId,address indexed payer,address indexed merchant,uint256 amount,string memo)"
] as const;
