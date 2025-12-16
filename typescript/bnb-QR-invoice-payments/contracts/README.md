# Contracts

Solidity smart contracts are managed with [Foundry](https://book.getfoundry.sh/). The MVP ships two contracts:

- `PaymentProcessor.sol` – receives an ERC-20 stablecoin allowance and forwards payments to registered merchant payout wallets while emitting settlement events.
- `USDYMock.sol` – minimal mock token we treat as USDT for local testing on BNB Chain testnet.

## Quick start

```bash
cd contracts
forge install          # (only needed the first time)
forge build            # compile
forge test             # run the test suite in test/PaymentProcessor.t.sol
```

## Local deployment script

```
forge script script/DeployPaymentProcessor.s.sol:DeployPaymentProcessor \
  --rpc-url $BSC_TESTNET_RPC \
  --private-key $DEPLOYER_KEY \
  --broadcast \
  --verify --etherscan-api-key $BSCSCAN_KEY
```

Supply the deployed USDT mock (`USDYMock`) address as the `stablecoin` argument and an optional payout address for the deployer merchant. After deployment merchants can call `registerMerchant(newPayout)` and customers pay with `pay(merchant, amount, memo, invoiceId)` using the invoice hash `keccak256(abi.encode(merchant, amount, memo, nonce))`.

## Testing notes

- Tests live in `test/PaymentProcessor.t.sol` and cover successful settlement and error paths such as reused invoice IDs.
- `forge test` mints mock USDT (via USDYMock), registers merchants, and confirms the payment struct persists as expected. Feel free to expand the suite with new flows (refunds, fee logic, etc.).
