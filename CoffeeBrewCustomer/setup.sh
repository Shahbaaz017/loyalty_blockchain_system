#!/bin/bash

echo "--------------------------------------------------------------------"
echo "Updating Frontend: Adding 'Buy' (Earn Points) & 'Redeem' (Burn Points) Functionality"
echo "WARNING: This will overwrite MenuPage.tsx and Index.tsx (Rewards Logic Page)."
echo "Backup these files if you have important manual changes."
echo "--------------------------------------------------------------------"
sleep 3 # Give user a moment to read the warning

# Ensure we are in the main project directory
# cd /path/to/your/blockchain-loyalty-program 

if [ ! -d "frontend/src/pages" ]; then
  echo "Error: 'frontend/src/pages' directory not found. Is your project structure correct?"
  exit 1
fi

# --- 1. Update frontend/src/pages/MenuPage.tsx ---
echo "Overwriting frontend/src/pages/MenuPage.tsx to add 'Buy' functionality..."
cat <<'EOL_MENUPAGE_TSX' > frontend/src/pages/MenuPage.tsx
import React, { useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
// import { Coffee } from 'lucide-react'; // Assuming you might use icons from your RewardCard or similar

const initialMenuItems = [
  { id: 1, name: 'Espresso', description: 'Rich and aromatic, a true classic.', price: '2.50', pointsToEarn: 2 }, // Assuming 1 point per dollar, rounded
  { id: 2, name: 'Cappuccino', description: 'Espresso with steamed milk foam.', price: '3.50', pointsToEarn: 3 },
  { id: 3, name: 'Latte', description: 'A creamy blend of espresso and steamed milk.', price: '4.00', pointsToEarn: 4 },
  { id: 4, name: 'Croissant', description: 'Buttery and flaky, fresh from the oven.', price: '3.00', pointsToEarn: 3 },
  { id: 5, name: 'Blueberry Muffin', description: 'Packed with fresh blueberries.', price: '3.25', pointsToEarn: 3 },
  { id: 6, name: 'Iced Coffee', description: 'Chilled and refreshing.', price: '3.75', pointsToEarn: 4 },
];

export default function MenuPage() {
  const { ready, authenticated, user, login, getAccessToken } = usePrivy();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBuyingItemId, setIsBuyingItemId] = useState<number | null>(null);

  // This function might be better placed in a shared context or utility if used across pages
  const retrieveAuthToken = async (): Promise<string | null> => {
    if (!authenticated || !ready) { return null; }
    try { return await getAccessToken(); } 
    catch (e) { console.error("Error getting auth token for purchase:", e); return null; }
  };

  const handleBuyItem = async (itemId: number, pointsToEarn: number, itemName: string) => {
    if (!authenticated) {
      setError("Please log in to make a purchase and earn points.");
      login(); // Prompt login
      return;
    }
    setError(null); setStatusMessage(null); setIsBuyingItemId(itemId);

    const authToken = await retrieveAuthToken();
    if (!authToken) {
      setError("Could not authenticate your session. Please try logging in again.");
      setIsBuyingItemId(null);
      return;
    }

    setStatusMessage(`Processing purchase for ${itemName}...`);

    try {
      const backendApiUrl = import.meta.env.VITE_BACKEND_API_URL;
      if (!backendApiUrl) throw new Error("VITE_BACKEND_API_URL not configured");

      const response = await fetch(`${backendApiUrl}/coffee-coin/earn-points`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ pointsToEarn: pointsToEarn.toString() }), // Backend expects string for pointsToEarn
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || `Failed to earn points: ${response.status}`);
      }
      
      setStatusMessage(responseData.message || `${pointsToEarn} CoffeeCoins earned for ${itemName}! Your new balance is ${responseData.newBalance}.`);
      // TODO: Ideally, update a global balance state here or trigger a balance refresh
      // For now, user will see updated balance when they visit MyRewardsPage
      alert(`Success! ${responseData.message || `${pointsToEarn} CoffeeCoins earned! New Balance: ${responseData.newBalance}`}. Check 'My Rewards' for updated balance.`);

    } catch (e: any) {
      console.error(`Error buying item ${itemName}:`, e);
      setError(e.message || 'An unknown error occurred during purchase.');
      setStatusMessage(null);
    } finally {
      setIsBuyingItemId(null);
    }
  };

  return (
    <div className="page-container">
      <h2 className="text-3xl font-bold text-amber-900 text-center mb-8">Our Menu</h2>
      {statusMessage && <p className="text-center text-green-600 mb-4 p-2 bg-green-50 rounded">{statusMessage}</p>}
      {error && <p className="text-center text-red-600 mb-4 p-2 bg-red-50 rounded">{error}</p>}
      
      <div className="menu-grid">
        {initialMenuItems.map(item => (
          <div key={item.id} className="menu-item-card flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-semibold text-amber-800">{item.name}</h3>
              <p className="text-sm text-amber-700 mb-2">{item.description}</p>
              <p className="price text-lg font-bold text-amber-900">\${item.price}</p>
              <p className="text-xs text-green-700">Earn {item.pointsToEarn} CoffeeCoins!</p>
            </div>
            <button
              onClick={() => handleBuyItem(item.id, item.pointsToEarn, item.name)}
              disabled={!ready || isBuyingItemId === item.id}
              className="mt-4 w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 ease-in-out disabled:opacity-50"
            >
              {isBuyingItemId === item.id ? 'Processing...' : `Buy & Earn ${item.pointsToEarn} CFC`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
EOL_MENUPAGE_TSX
echo "frontend/src/pages/MenuPage.tsx overwritten."
echo ""

# --- 2. Update frontend/src/pages/Index.tsx (MyRewards Logic Page) ---
echo "Overwriting frontend/src/pages/Index.tsx to add 'Redeem' (Burn) functionality..."
cat <<'EOL_INDEX_TSX' > frontend/src/pages/Index.tsx
import React, { useState, useEffect } from 'react';
import { usePrivy, User } from '@privy-io/react-auth'; // Import User if needed for sendTransaction type
import { ethers, Interface, parseUnits, TransactionRequest } from 'ethers'; // Updated ethers imports
import MyRewardsPageUI from '../components/MyRewardsPage'; 

// Smart Contract Details
const COFFEE_COIN_CONTRACT_ADDRESS = import.meta.env.VITE_COFFEE_COIN_CONTRACT_ADDRESS || '0x113099845A71e603Cf514FCf5CDEda798e3183a1';
const COFFEE_COIN_ABI_BURN_FRAGMENT = [
  {
    "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }],
    "name": "burn", "outputs": [], "stateMutability": "nonpayable", "type": "function"
  }
];
// For balance check and other read operations, if we did them on frontend directly:
// const COFFEE_COIN_ABI_READ_FRAGMENTS = [
//   { "inputs": [{"internalType": "address", "name": "account", "type": "address"}], "name": "balanceOf", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"},
//   { "inputs": [], "name": "decimals", "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}], "stateMutability": "view", "type": "function"}
// ];

interface UserWalletDisplay {
  address: string;
  chainId?: string | number; 
  walletType?: string;
  chainType?: string;
}

interface AuthenticatedBackendData {
  message: string;
  privyDid: string;
  wallet?: UserWalletDisplay; 
}

const mockRewards = [
  { id: 'reward1', name: 'Free Artisan Espresso', pointsRequired: 25, description: 'Rich & Bold.', icon: 'Coffee' },
  { id: 'reward2', name: 'Gourmet Muffin - 50% Off', pointsRequired: 15, description: 'Freshly baked daily.', icon: 'Gift' },
  { id: 'reward3', name: '$2 Off Any Large Drink', pointsRequired: 20, description: 'Your choice, your discount.', icon: 'Coffee' },
  { id: 'reward4', name: 'Bag of House Blend Beans', pointsRequired: 75, description: 'Take the taste home (200g).', icon: 'Gift' },
];

export default function Index() {
  const { ready, authenticated, user, login, logout, linkEmail, getAccessToken, sendTransaction, exportWallet } = usePrivy();
  
  const [backendAuthData, setBackendAuthData] = useState<AuthenticatedBackendData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [coffeeCoinBalance, setCoffeeCoinBalance] = useState<string | null>(null);
  const [isRedeemingRewardId, setIsRedeemingRewardId] = useState<string | null>(null);
  
  const [frontendUserSepoliaWallet, setFrontendUserSepoliaWallet] = useState<UserWalletDisplay | null>(null);
  const sepoliaChainIdForApp = '11155111'; // String representation
  const sepoliaChainIdHexForPrivy = '0xaa36a7'; // Hex for Privy's sendTransaction

  useEffect(() => {
    if (authenticated && user && ready) {
      let identifiedWallet: UserWalletDisplay | null = null;
      const targetChainIdString = sepoliaChainIdForApp;
      const targetChainIdCAIP = `eip155:${targetChainIdString}`;

      const checkWallet = (walletObj: any) => {
        if (walletObj && typeof walletObj.address === 'string' && walletObj.walletClientType === 'privy' && walletObj.chainType === 'ethereum') {
          // For embedded wallet, chainId might not be on the object, but it's configured by PrivyProvider's defaultChainId.
          // We'll use our app's known chainId for Sepolia.
          return true;
        }
        return false;
      };

      if (user.wallet && checkWallet(user.wallet)) {
        identifiedWallet = {
          address: user.wallet.address, chainId: targetChainIdForApp,
          walletType: user.wallet.walletClientType, chainType: user.wallet.chainType,
        };
      } else if (user.linkedAccounts && user.linkedAccounts.length > 0) {
        const linkedEmbeddedWallet = user.linkedAccounts.find(acc => acc.type === 'wallet' && checkWallet(acc));
        if (linkedEmbeddedWallet) {
          const la = linkedEmbeddedWallet as any;
          identifiedWallet = {
            address: la.address, chainId: targetChainIdForApp,
            walletType: la.walletClientType, chainType: la.chainType,
          };
        }
      }
      setFrontendUserSepoliaWallet(identifiedWallet);
      if (!identifiedWallet) console.log("Index (Rewards): No Privy embedded Ethereum wallet found matching Sepolia criteria.");
    } else {
      setFrontendUserSepoliaWallet(null);
    }
  }, [authenticated, user, ready]);

  useEffect(() => {
    if (frontendUserSepoliaWallet?.address) {
      fetchCoffeeCoinBalance(frontendUserSepoliaWallet.address);
    } else {
      setCoffeeCoinBalance(null);
    }
  }, [frontendUserSepoliaWallet]);

  const retrieveAuthToken = async (): Promise<string | null> => {
    if (!authenticated || !ready) { return null; }
    try { return await getAccessToken(); } 
    catch (e) { console.error("Error getting auth token:", e); setError("Could not get auth token."); return null; }
  };

  const verifyAuthenticationWithBackend = async () => {
    setError(null); setBackendAuthData(null);
    const authToken = await retrieveAuthToken();
    if (!authToken) { return; }
    try {
      const backendApiUrl = import.meta.env.VITE_BACKEND_API_URL;
      if (!backendApiUrl) throw new Error("VITE_BACKEND_API_URL not set");
      const response = await fetch(`${backendApiUrl}/user/me`, { method: 'GET', headers: { 'Authorization': `Bearer ${authToken}` }});
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server auth verification failed: ${response.status}`);
      }
      setBackendAuthData(await response.json());
    } catch (e: any) { console.error("Error verifying server auth:", e); setError(e.message); }
  };

  const fetchCoffeeCoinBalance = async (walletAddress: string) => {
    if (!ethers.isAddress(walletAddress)) { setError("Invalid wallet for balance check."); setCoffeeCoinBalance(null); return; }
    try {
      const backendApiUrl = import.meta.env.VITE_BACKEND_API_URL;
      if (!backendApiUrl) throw new Error("VITE_BACKEND_API_URL not set");
      const response = await fetch(`${backendApiUrl}/coffee-coin/balance/${walletAddress}`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to fetch balance: ${response.status}`);
      }
      const data = await response.json();
      if (typeof data.balance === 'undefined') throw new Error("Invalid balance data");
      setCoffeeCoinBalance(data.balance);
    } catch (e: any) { console.error("Error fetching balance:", e); setCoffeeCoinBalance('Error'); setError(`Balance Error: ${e.message}`); }
  };

  useEffect(() => {
    if (authenticated && user && ready) { verifyAuthenticationWithBackend(); } 
    else { setBackendAuthData(null); }
  }, [authenticated, user, ready]);

  const handleRedeemClick = async (rewardId: string) => {
    setError(null); setStatusMessage(null); setIsRedeemingRewardId(rewardId);

    const rewardToRedeem = mockRewards.find(r => r.id === rewardId);
    if (!rewardToRedeem) { setError("Reward not found."); setIsRedeemingRewardId(null); return; }
    if (!frontendUserSepoliaWallet?.address) { setError("Wallet not identified."); setIsRedeemingRewardId(null); return; }
    if (!user || !sendTransaction) { setError("Privy user or sendTransaction not ready."); setIsRedeemingRewardId(null); return; }

    const currentBalance = coffeeCoinBalance ? parseInt(coffeeCoinBalance) : 0;
    if (currentBalance < rewardToRedeem.pointsRequired) {
      setError(`Not enough CoffeeCoins for ${rewardToRedeem.name}.`);
      setIsRedeemingRewardId(null); return;
    }

    if (!window.confirm(`Redeem "${rewardToRedeem.name}" for ${rewardToRedeem.pointsRequired} CoffeeCoins? This will send a blockchain transaction.`)) {
      setIsRedeemingRewardId(null); return;
    }

    setStatusMessage(`Preparing to redeem ${rewardToRedeem.name}...`);

    try {
      const contractInterface = new Interface(COFFEE_COIN_ABI_BURN_FRAGMENT);
      // Our CoffeeCoin has 0 decimals, so pointsRequired is the direct amount.
      const amountToBurn = BigInt(rewardToRedeem.pointsRequired); 
      const encodedCallData = contractInterface.encodeFunctionData("burn", [amountToBurn]);

      const transactionRequest: TransactionRequest = {
        to: COFFEE_COIN_CONTRACT_ADDRESS,
        chainId: sepoliaChainIdHexForPrivy, // Privy expects hex chain ID
        data: encodedCallData,
        // value: '0x0', // Not sending ETH
      };
      
      console.log("Initiating burn transaction via Privy:", transactionRequest);
      setStatusMessage("Please approve the transaction in your Privy wallet...");

      const txResult = await sendTransaction(transactionRequest); // Privy handles user signing
      
      console.log('Burn transaction submitted:', txResult);
      setStatusMessage(`Burn transaction sent! Hash: ${txResult.transactionHash.substring(0,10)}... Waiting for confirmation...`);

      // Optional: Wait for transaction receipt using ethers if Privy doesn't await mining.
      // This requires an ethers Provider. For simplicity, we'll assume Privy's UI handles user feedback on tx status.
      // const provider = new ethers.BrowserProvider(window.ethereum); // If user had external wallet
      // const receipt = await provider.waitForTransaction(txResult.transactionHash);
      // if (receipt && receipt.status === 1) { ... }

      // After user approves and Privy sends the tx, call backend to record it.
      const authToken = await retrieveAuthToken();
      if (!authToken) throw new Error("Auth token unavailable post-transaction.");

      const backendApiUrl = import.meta.env.VITE_BACKEND_API_URL;
      if (!backendApiUrl) throw new Error("VITE_BACKEND_API_URL not configured");
      
      const recordResponse = await fetch(`${backendApiUrl}/coffee-coin/record-redemption`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({
          rewardId: rewardToRedeem.id,
          pointsBurned: rewardToRedeem.pointsRequired.toString(),
          burnTransactionHash: txResult.transactionHash 
        })
      });

      if (!recordResponse.ok) {
        const errData = await recordResponse.json().catch(()=>({}));
        throw new Error(errData.error || `Failed to record redemption: ${recordResponse.status}`);
      }
      const recordData = await recordResponse.json();
      setStatusMessage(`Redemption successful! "${rewardToRedeem.name}" claimed. Voucher: ${recordData.voucherCode}`);
      
      // Refresh balance
      if(frontendUserSepoliaWallet?.address) fetchCoffeeCoinBalance(frontendUserSepoliaWallet.address);

    } catch (e: any) {
      console.error("Redemption process failed:", e);
      setError(`Redemption failed: ${e.message || 'Unknown error.'}`);
      setStatusMessage(null);
    } finally {
      setIsRedeemingRewardId(null);
    }
  };

  const handleActualLinkEmail = async () => { /* ... (same as before) ... */ };

  if (!ready) { return <div className="page-container text-center py-10"><p>Loading Rewards Program...</p></div>; }
  if (!authenticated) {
    return (
      <div className="page-container text-center py-10">
        <h2 className="text-2xl font-semibold text-amber-900 mb-4">Welcome to CoffeeDelight Rewards!</h2>
        <p className="text-amber-700 mb-6">Please log in using the button in the navigation bar to view your CoffeeCoins and redeem treats.</p>
      </div>
    );
  }
  
  return (
    <MyRewardsPageUI
      coffeeCoinBalance={coffeeCoinBalance}
      walletAddress={frontendUserSepoliaWallet?.address || null}
      rewards={mockRewards}
      statusMessage={statusMessage}
      error={error}
      onRedeemClick={handleRedeemClick}
      onLinkEmail={user && !user.email ? handleActualLinkEmail : undefined}
      isRedeemingRewardId={isRedeemingRewardId} 
    />
  );
}
EOL_INDEX_TSX
echo "frontend/src/pages/Index.tsx overwritten with Redeem functionality."
echo ""

# Navigate back to project root
cd ..

echo ""
echo "--------------------------------------------------------------------"
echo "Frontend 'Buy' (Earn) and 'Redeem' (Burn) Functionality Added!"
echo ""
echo "IMPORTANT Next Steps:"
echo "1. CRITICAL: Ensure 'frontend/.env' has VITE_PRIVY_APP_ID, VITE_BACKEND_API_URL,"
echo "   and add: VITE_COFFEE_COIN_CONTRACT_ADDRESS=${COFFEE_COIN_CONTRACT_ADDRESS:-0x113099845A71e603Cf514FCf5CDEda798e3183a1}"
echo "   (The script uses a default if not set, but explicit is better)."
echo ""
echo "2. Ensure your backend server is running (cd backend && npm run dev)."
echo "   It needs the /earn-points and /record-redemption endpoints."
echo ""
echo "3. Navigate into 'frontend': cd frontend"
echo "4. Run 'npm install' if you haven't recently (ethers might have specific version needs)."
echo "5. Run the frontend dev server: npm run dev"
echo ""
echo "6. Test Thoroughly:"
echo "   a. Go to the 'Menu' page. Log in if needed. Click a 'Buy' button."
echo "      - Check for success/error messages."
echo "      - Check backend console for minting logs."
echo "      - Go to 'My Rewards' page. Your CoffeeCoin balance should be higher."
echo "   b. On the 'My Rewards' page, try to 'Redeem' a reward you can afford."
echo "      - A Privy modal should pop up asking you to confirm the 'burn' transaction."
echo "      - Approve it. Check for success/error messages."
echo "      - Check Etherscan for the burn transaction."
echo "      - Check backend console for the /record-redemption log."
echo "      - Your CoffeeCoin balance on 'My Rewards' should decrease."
echo ""
echo "Git:"
echo "Once thoroughly tested, commit these significant changes:"
echo "  git add ."
echo "  git commit -m \"feat(frontend): Implement earn points (mint) and redeem rewards (burn) flows\""
echo "  git push origin main"
echo "--------------------------------------------------------------------"