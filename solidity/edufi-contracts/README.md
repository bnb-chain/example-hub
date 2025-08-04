# EduFi-contracts

These contracts manage on-chain courses linked to domain ownership. Only users who own a valid domain from the DNS system can enroll in or access courses. The contracts handle course creation, enrollment, and progress tracking, integrating seamlessly with the DNS and referral systems.

## Getting Started

### Prerequisites

* Node.js and npm
* Hardhat
* A wallet like MetaMask
* Access to the BNB Chain testnet

### Installation

```bash
git clone https://github.com/Level3AI-hub/Level3-Contracts.git
cd Level3-Contracts
npm install
```

### Running the Project

Compile the contracts:

```bash
npx hardhat compile
```

Deploy the contracts to a local or test network:

```bash
npx hardhat run scripts/deploy.js --network <network_name>
```

## Usage

* Ensure the DNS system is deployed and a user owns a valid domain
* Deploy course contracts
* Use the exposed functions to create courses, enroll domain holders, and track progress

## Contributing

Contributions are welcome! Please fork the repo and submit a pull request.

## License

MIT License

## Contact

For questions or support, reach out to [yourname@domain.com](mailto:yourname@domain.com) or open an issue on GitHub.
