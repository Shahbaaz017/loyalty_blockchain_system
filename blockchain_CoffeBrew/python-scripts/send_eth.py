import os
from web3 import Web3
from dotenv import load_dotenv
import time

# --- Load Configuration ---
load_dotenv()

sepolia_rpc_url = os.getenv("SEPOLIA_RPC_URL")
sender_private_key = os.getenv("SENDER_PRIVATE_KEY")
recipient_address = "0xDD1D9b2d870A0a14d79d57E8ab66216df7eA5b81"
amount_to_send_eth = 0.01

# --- Sanity Checks ---
if not sepolia_rpc_url:
    raise ValueError("SEPOLIA_RPC_URL not found in environment variables or .env file.")
if not sender_private_key:
    raise ValueError("SENDER_PRIVATE_KEY not found in environment variables or .env file.")

if not Web3.is_address(recipient_address):
    raise ValueError(f"Invalid recipient address: {recipient_address}")
recipient_address = Web3.to_checksum_address(recipient_address)

if not sender_private_key.startswith("0x"):
    sender_private_key = "0x" + sender_private_key

# --- Connect to Sepolia RPC ---
w3 = Web3(Web3.HTTPProvider(sepolia_rpc_url))

if not w3.is_connected():
    print("Error: Could not connect to Sepolia RPC.")
    exit()
else:
    print(f"Connected to Sepolia RPC: {sepolia_rpc_url}")
    print(f"Chain ID: {w3.eth.chain_id}")

# --- Prepare Sender Account ---
try:
    sender_account = w3.eth.account.from_key(sender_private_key)
    sender_address = sender_account.address
    print(f"Sender Address: {sender_address}")
except Exception as e:
    print(f"Invalid private key: {e}")
    exit()

# --- Check Balances ---
try:
    sender_balance_wei = w3.eth.get_balance(sender_address)
    recipient_balance_wei_before = w3.eth.get_balance(recipient_address)
    print(f"Sender Balance: {w3.from_wei(sender_balance_wei, 'ether')} Sepolia ETH")
    print(f"Recipient Balance (before): {w3.from_wei(recipient_balance_wei_before, 'ether')} Sepolia ETH")

    amount_to_send_wei = w3.to_wei(amount_to_send_eth, 'ether')
    if sender_balance_wei < amount_to_send_wei:
        print(f"Error: Insufficient balance. Needs at least {amount_to_send_eth} ETH (plus gas).")
        exit()
except Exception as e:
    print(f"Error checking balances: {e}")
    exit()

# --- Build, Sign, and Send Transaction ---
try:
    print(f"\nPreparing to send {amount_to_send_eth} ETH to {recipient_address}...")
    nonce = w3.eth.get_transaction_count(sender_address)
    gas_price = w3.eth.gas_price

    tx_fields = {
        'to': recipient_address,
        'value': amount_to_send_wei,
        'gas': 21000,
        'gasPrice': gas_price,
        'nonce': nonce,
        'chainId': 11155111
    }

    est_fee_eth = w3.from_wei(gas_price * tx_fields['gas'], 'ether')
    print(f"Gas Price: {w3.from_wei(gas_price, 'gwei')} Gwei")
    print(f"Estimated Transaction Fee: {est_fee_eth} ETH")

    signed_tx = w3.eth.account.sign_transaction(tx_fields, sender_private_key)
    print("Transaction signed. Sending...")

    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)  # NOTE: use `raw_transaction` not `rawTransaction`
    print(f"Transaction sent! Hash: {tx_hash.hex()}")

    print("Waiting for transaction confirmation (up to 120 seconds)...")
    tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

    if tx_receipt.status == 1:
        print("✅ Transaction confirmed successfully!")
        print(f"Block Number: {tx_receipt.blockNumber}")
        recipient_balance_wei_after = w3.eth.get_balance(recipient_address)
        print(f"Recipient Balance (after): {w3.from_wei(recipient_balance_wei_after, 'ether')} Sepolia ETH")
    else:
        print("❌ Transaction failed or was reverted.")
        print(f"Receipt: {tx_receipt}")

except Exception as e:
    print(f"❌ Transaction error: {e}")
    if hasattr(e, 'args') and e.args:
        print(f"Details: {e.args[0]}")
