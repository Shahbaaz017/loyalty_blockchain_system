import React, { useState, useEffect } from 'react';
import { usePrivy, User } from '@privy-io/react-auth'; // Import User if needed by sendTransaction later
import { ethers, Interface, TransactionRequest } from 'ethers'; // Updated ethers imports
import MyRewardsPageUI from '../components/MyRewardsPage'; // Your presentational component from the UI AI

// Smart Contract Details - Ensure VITE_COFFEE_COIN_CONTRACT_ADDRESS is in your .env
const COFFEE_COIN_CONTRACT_ADDRESS = import.meta.env.VITE_COFFEE_COIN_CONTRACT_ADDRESS || '0x113099845A71e603Cf514FCf5CDEda798e3183a1'; // Fallback, but .env is better
const COFFEE_COIN_ABI_BURN_FRAGMENT = [
  {
    "inputs": [{ "internalType": "uint256", "name": "amount", "type": "uint256" }],
    "name": "burn", "outputs": [], "stateMutability": "nonpayable", "type": "function"
  }
];

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

// Mock rewards data - this will be used by MyRewardsPageUI
const mockRewards = [
  { id: 'reward1', name: 'Free Artisan Espresso', pointsRequired: 25, description: 'Rich & Bold.', icon: 'Coffee' }, // Assuming MyRewardsPageUI expects 'icon'
  { id: 'reward2', name: 'Gourmet Muffin - 50% Off', pointsRequired: 15, description: 'Freshly baked daily.', icon: 'Gift' },
  { id: 'reward3', name: '$2 Off Any Large Drink', pointsRequired: 20, description: 'Your choice, your discount.', icon: 'Coffee' },
  { id: 'reward4', name: 'Bag of House Blend Beans', pointsRequired: 75, description: 'Take the taste home (200g).', icon: 'Gift' },
  { id: 'pastry', name: 'Fresh Croissant', pointsRequired: 20, description: 'Buttery, flaky, and perfectly golden', icon: 'Coffee' },
  { id: 'cappuccino', name: 'Deluxe Cappuccino', pointsRequired: 30, description: 'Rich espresso with perfectly steamed milk foam', icon: 'Coffee' }
];

export default function Index() {
  const { ready, authenticated, user, login, logout, linkEmail, getAccessToken, sendTransaction } = usePrivy();
  
  const [backendAuthData, setBackendAuthData] = useState<AuthenticatedBackendData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [coffeeCoinBalance, setCoffeeCoinBalance] = useState<string | null>(null);
  const [isRedeemingRewardId, setIsRedeemingRewardId] = useState<string | null>(null);
  
  const [frontendUserSepoliaWallet, setFrontendUserSepoliaWallet] = useState<UserWalletDisplay | null>(null);
  const sepoliaChainIdForApp = '11155111'; // Defined in component scope, used for consistency
  const sepoliaChainIdHexForPrivy = '0xaa36a7'; // Hex for Privy's sendTransaction

  useEffect(() => {
    if (authenticated && user && ready) {
      let identifiedWallet: UserWalletDisplay | null = null;
      // sepoliaChainIdForApp is accessible here from the outer component scope

      // console.log("Index (Rewards Logic): User authenticated. Processing user object:", JSON.parse(JSON.stringify(user)));

      const isTargetWallet = (walletObj: any): boolean => {
        if (!walletObj || typeof walletObj.address !== 'string') return false;
        const isPrivyEmbedded = walletObj.walletClientType === 'privy';
        const isEthereumType = walletObj.chainType === 'ethereum';
        if (isPrivyEmbedded && isEthereumType) {
          // console.log(`DEBUG isTargetWallet: Wallet (Address: ${walletObj.address}) IS a Privy embedded Ethereum wallet.`);
          return true;
        }
        return false;
      };

      if (user.wallet && isTargetWallet(user.wallet)) {
        identifiedWallet = {
          address: user.wallet.address,
          chainId: sepoliaChainIdForApp, // Using the correctly scoped constant
          walletType: user.wallet.walletClientType,
          chainType: user.wallet.chainType,
        };
        // console.log("Index (Rewards Logic): Identified target wallet from user.wallet:", identifiedWallet);
      } else if (user.linkedAccounts && user.linkedAccounts.length > 0) {
        // console.log("Index (Rewards Logic): user.wallet did not match or not present. Checking linkedAccounts...");
        const linkedWalletFromAccounts = user.linkedAccounts.find(acc => acc.type === 'wallet' && isTargetWallet(acc));
        
        if (linkedWalletFromAccounts) {
          const walletData = linkedWalletFromAccounts as any; 
          identifiedWallet = {
            address: walletData.address,
            chainId: sepoliaChainIdForApp, // Using the correctly scoped constant
            walletType: walletData.walletClientType,
            chainType: walletData.chainType,
          };
          // console.log("Index (Rewards Logic): Identified target wallet from user.linkedAccounts:", identifiedWallet);
        }
      }

      if (identifiedWallet) {
        setFrontendUserSepoliaWallet(identifiedWallet);
      } else {
        // console.log("Index (Rewards Logic): FINAL: NO Privy embedded Ethereum wallet found matching criteria.");
        setFrontendUserSepoliaWallet(null);
      }
    } else {
      setFrontendUserSepoliaWallet(null);
    }
  }, [authenticated, user, ready, sepoliaChainIdForApp]); // sepoliaChainIdForApp is stable, but good practice if it could change

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
        const errData = await response.json().catch(() => ({ error: 'Failed to parse server error.' })); // Provide default for parsing error
        throw new Error(errData.error || `Server auth verification failed: ${response.status}`);
      }
      setBackendAuthData(await response.json());
      // setStatusMessage("Server session verified!"); // Can be a bit noisy, enable if needed
    } catch (e: any) { console.error("Error verifying server auth:", e); setError(e.message || "Unknown error verifying session."); }
  };

  const fetchCoffeeCoinBalance = async (walletAddress: string) => {
    if (!ethers.isAddress(walletAddress)) { setError("Invalid wallet for balance check."); setCoffeeCoinBalance(null); return; }
    // setStatusMessage(`Fetching balance for ${walletAddress.substring(0,10)}...`);
    try {
      const backendApiUrl = import.meta.env.VITE_BACKEND_API_URL;
      if (!backendApiUrl) throw new Error("VITE_BACKEND_API_URL not set");
      const response = await fetch(`${backendApiUrl}/coffee-coin/balance/${walletAddress}`);
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Failed to parse balance server error.' }));
        throw new Error(errData.error || `Failed to fetch balance: ${response.status}`);
      }
      const data = await response.json();
      if (typeof data.balance === 'undefined') throw new Error("Invalid balance data from backend");
      setCoffeeCoinBalance(data.balance);
      // setStatusMessage("Balance updated.");
    } catch (e: any) { console.error("Error fetching balance:", e); setCoffeeCoinBalance('Error'); setError(`Balance Error: ${e.message || "Unknown balance error."}`); }
  };

  useEffect(() => {
    if (authenticated && user && ready) { verifyAuthenticationWithBackend(); } 
    else { setBackendAuthData(null); }
  }, [authenticated, user, ready]);

  const handleRedeemClick = async (rewardId: string) => {
    setError(null); setStatusMessage(null); setIsRedeemingRewardId(rewardId);

    const rewardToRedeem = mockRewards.find(r => r.id === rewardId);
    if (!rewardToRedeem) { setError("Reward not found."); setIsRedeemingRewardId(null); return; }
    if (!frontendUserSepoliaWallet?.address) { setError("Wallet not identified for redemption."); setIsRedeemingRewardId(null); return; }
    if (!user || !sendTransaction) { setError("Privy user session or transaction function not ready."); setIsRedeemingRewardId(null); return; }

    const currentBalance = coffeeCoinBalance ? parseInt(coffeeCoinBalance) : 0;
    if (currentBalance < rewardToRedeem.pointsRequired) {
      setError(`Not enough CoffeeCoins for ${rewardToRedeem.name}. You need ${rewardToRedeem.pointsRequired}, have ${currentBalance}.`);
      setIsRedeemingRewardId(null); return;
    }

    if (!window.confirm(`Redeem "${rewardToRedeem.name}" for ${rewardToRedeem.pointsRequired} CoffeeCoins? This will send a blockchain transaction.`)) {
      setIsRedeemingRewardId(null); return;
    }

    setStatusMessage(`Processing redemption for ${rewardToRedeem.name}...`);

    try {
      const contractInterface = new Interface(COFFEE_COIN_ABI_BURN_FRAGMENT);
      const amountToBurn = BigInt(rewardToRedeem.pointsRequired); 
      const encodedCallData = contractInterface.encodeFunctionData("burn", [amountToBurn]);

      // Ensure your VITE_COFFEE_COIN_CONTRACT_ADDRESS is set in .env for this to be reliable
      if (!COFFEE_COIN_CONTRACT_ADDRESS) {
          throw new Error("CoffeeCoin contract address is not configured in .env (VITE_COFFEE_COIN_CONTRACT_ADDRESS)");
      }

      const transactionRequest = { // Explicitly type if available from ethers or Privy
        to: COFFEE_COIN_CONTRACT_ADDRESS,
        chainId: sepoliaChainIdHexForPrivy, 
        data: encodedCallData,
        // value: '0x0', // Not sending ETH
      } as ethers.TransactionRequest; // Cast for type if needed, ensure properties match
      
      console.log("Initiating burn transaction via Privy:", transactionRequest);
      setStatusMessage("Please approve the transaction in your Privy wallet...");

      const txResult = await sendTransaction(transactionRequest);
      
      console.log('Burn transaction submitted:', txResult);
      setStatusMessage(`Burn transaction sent! Hash: ${txResult.transactionHash.substring(0,10)}... Waiting for blockchain confirmation...`);

      // Backend call to record redemption
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
        const errData = await recordResponse.json().catch(()=>({error: 'Failed to parse record redemption error'}));
        throw new Error(errData.error || `Failed to record redemption: ${recordResponse.status}`);
      }
      const recordData = await recordResponse.json();
      setStatusMessage(`Redemption successful! "${rewardToRedeem.name}" claimed. Voucher: ${recordData.voucherCode}`);
      
      if(frontendUserSepoliaWallet?.address) fetchCoffeeCoinBalance(frontendUserSepoliaWallet.address);

    } catch (e: any) {
      console.error("Redemption process failed:", e);
      setError(`Redemption failed: ${e.message || 'Unknown error.'}`);
      setStatusMessage(null);
    } finally {
      setIsRedeemingRewardId(null);
    }
  };

  const handleActualLinkEmail = async () => { 
    if (!ready || !linkEmail) { setError("Privy not ready or email linking not available."); return; }
    try { await linkEmail(); } 
    catch(e:any) { console.error("Error initiating email link:", e); setError("Failed to start email linking."); }
  };

  if (!ready) { return <div className="page-container text-center py-10"><p>Loading Rewards Program...</p></div>; }
  if (!authenticated) {
    return (
      <div className="page-container text-center py-10">
        <h2 className="text-2xl font-semibold text-amber-900 mb-4">Welcome to CoffeeDelight Rewards!</h2>
        <p className="text-amber-700 mb-6">Please log in using the button in the navigation bar to view your CoffeeCoins and redeem exclusive treats.</p>
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