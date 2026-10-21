import os
import sys
import argparse
from src.generators.art_generator import ArtGenerator
from src.blockchain.nft_minter import NFTMinter
from src.utils.config import load_config

def main():
    parser = argparse.ArgumentParser(description='AI NFT Art Generator')
    parser.add_argument('action', choices=['generate', 'mint'], help='Action to perform')
    parser.add_argument('--count', type=int, default=1, help='Number of images to generate')
    parser.add_argument('--collection-dir', type=str, help='Directory containing the collection to mint')
    
    args = parser.parse_args()
    config = load_config()
    
    if args.action == 'generate':
        generator = ArtGenerator(config)
        generator.generate_batch(args.count)
    elif args.action == 'mint':
        if not args.collection_dir:
            print("Error: --collection-dir is required for minting")
            sys.exit(1)
        
        minter = NFTMinter(config)
        minter.mint_collection(args.collection_dir)

if __name__ == '__main__':
    main()