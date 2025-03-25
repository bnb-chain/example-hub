from eth_account import Account
import os
from dotenv import load_dotenv

load_dotenv()
Account.enable_unaudited_hdwallet_features()


# For Mnemonic Passphrase
def get_wallet():
    mnemonic = os.getenv("MNEMONIC")
    account = Account.from_mnemonic(mnemonic, account_path="m/44'/60'/0'/0/0")
    return account


# For Private Key String (Private key is a 256-bit (32 bytes) random integer)
# def get_wallet():
#     private_key = os.getenv("PRIVATE_KEY")
#     if not private_key:
#         raise ValueError("PRIVATE_KEY not found in environment.")
#     account = Account.from_key(private_key)
#     return account
