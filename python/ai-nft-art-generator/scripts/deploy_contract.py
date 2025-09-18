import os
import sys
import argparse
from dotenv import load_dotenv
from pathlib import Path
from src.blockchain.nft_minter import NFTMinter
from src.utils.config import load_config

def main():
    parser = argparse.ArgumentParser(description='Deploy NFT Contract')
    parser.add_argument('--network', choices=['testnet', 'mainnet'], default='testnet',
                       help='Network to deploy to (default: testnet)')
    
    args = parser.parse_args()
    
    # Load environment variables
    load_dotenv()
    
    # Get private key from environment
    private_key = os.getenv('PRIVATE_KEY')
    if not private_key:
        print("Error: PRIVATE_KEY environment variable not set")
        sys.exit(1)
    
    # Load config
    config = load_config()
    
    # Override network if specified
    if args.network:
        config['blockchain']['network'] = args.network
    
    try:
        # Initialize minter
        minter = NFTMinter(config)
        
        # Deploy contract
        contract_address = minter.deploy_contract(private_key)
        print(f"\nContract successfully deployed!")
        print(f"Network: {args.network}")
        print(f"Address: {contract_address}")
        
        # Save contract address to file
        deploy_info = {
            'network': args.network,
            'address': contract_address
        }
        
        deploy_dir = Path(__file__).parent / 'deploy'
        deploy_dir.mkdir(exist_ok=True)
        
        with open(deploy_dir / f'contract_address_{args.network}.txt', 'w') as f:
            f.write(f"Network: {args.network}\n")
            f.write(f"Address: {contract_address}\n")
        
    except Exception as e:
        print(f"Error deploying contract: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    main()