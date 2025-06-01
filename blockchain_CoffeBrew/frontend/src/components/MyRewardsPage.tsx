// frontend/src/components/MyRewardsPage.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { usePrivy, useSendTransaction } from '@privy-io/react-auth'; // For Privy auth and transactions
import { useToast } from './ui/use-toast'; // For notifications
import { Button } from './ui/button'; // Standard button component
import TransactionHistory from './TransactionHistory'; // Component to show past transactions
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card'; // Card components for UI structure
import { 
    Gift, Send, Coins, Coffee, Percent, PackageCheck, ShoppingBag, 
    CheckCircle, AlertTriangleIcon, Zap 
} from 'lucide-react'; // Icons for visual flair
import { ethers, Interface, UnsignedTransaction } from 'ethers'; // Ethers.js for blockchain interactions

const CURRENCY_SYMBOL_POINTS = 'CFC'; // Symbol for your loyalty points (CoffeeCoins)

// Define the structure for a reward item
interface Reward {
  id: string; // Unique identifier for the reward
  title: string;
  description: string;
  pointsRequired: number; // How many CFC points are needed
  icon: React.ElementType; // Icon component for the reward card
}

// Sample data for available rewards with updated point costs
const rewardsData: Reward[] = [
  { 
    id: 'premium-coffee-beans-200', 
    title: '250g Premium Coffee Beans', 
    description: 'Exclusive single-origin roasted beans, perfect for home brewing.', 
    pointsRequired: 200, 
    icon: PackageCheck 
  },
  { 
    id: 'barista-workshop-voucher-350', 
    title: 'Barista Workshop Voucher', 
    description: 'A voucher for a 1-hour introductory barista skills workshop.', 
    pointsRequired: 350, 
    icon: Coffee 
  },
  { 
    id: 'merch-hoodie-500', 
    title: 'Exclusive CoffeeCoin Hoodie', 
    description: 'High-quality branded hoodie, show off your loyalty in style!', 
    pointsRequired: 500, 
    icon: ShoppingBag 
  },
  { 
    id: 'year-supply-discount-1000', 
    title: '10% Off Year Coffee Supply', 
    description: 'A massive 10% discount if you pre-pay for a year of your favorite coffee subscription.', 
    pointsRequired: 1000, 
    icon: Percent 
  },
  { 
    id: 'ultimate-coffee-experience-2500', 
    title: 'Ultimate Coffee Experience', 
    description: 'Private tasting session, meet the roasters, and a curated luxury gift box.', 
    pointsRequired: 2500, 
    icon: Zap 
  },
];

const MyRewardsPage: React.FC = () => {
  // Privy hooks for authentication and user data
  const { ready, authenticated, user, login, getAccessToken, createWallet, exportWallet } = usePrivy();
  // Privy hook for sending transactions
  const { sendTransaction } = useSendTransaction();
  // Toast hook for notifications
  const { toast } = useToast();

  // State variables
  const [cfcBalance, setCfcBalance] = useState<string | null>(null); // User's CoffeeCoin balance
  const [isLoadingCfcBalance, setIsLoadingCfcBalance] = useState<boolean>(false);
  const [userEthBalance, setUserEthBalance] = useState<string | null>(null); // User's Sepolia ETH balance
  const [redeemingRewardId, setRedeemingRewardId] = useState<string | null>(null); // Tracks which reward is currently being redeemed

  // Fetch user's Sepolia ETH balance using a public RPC
  const fetchUserEthBalance = useCallback(async () => {
    if (!ready || !authenticated || !user?.wallet?.address) {
        setUserEthBalance(null); 
        return;
    }
    try {
        const publicRpcUrl = import.meta.env.VITE_SEPOLIA_PUBLIC_RPC_URL || "https://rpc.sepolia.org";
        const rpcProvider = new ethers.JsonRpcProvider(publicRpcUrl);
        const balanceWei = await rpcProvider.getBalance(user.wallet.address);
        setUserEthBalance(ethers.formatEther(balanceWei).substring(0, 7)); // Format to ETH and shorten
    } catch (error) {
        console.error("Failed to fetch user ETH balance:", error);
        setUserEthBalance("Error");
    }
  }, [ready, authenticated, user?.wallet]);

  // Fetch user's CoffeeCoin (CFC) balance from the backend
  const fetchCfcBalance = useCallback(async () => {
    if (!ready || !authenticated || !user?.wallet?.address) {
      if (ready && !authenticated) setCfcBalance(null);
      return;
    }
    setIsLoadingCfcBalance(true);
    try {
      const accessToken = await getAccessToken();
      if (!accessToken) { 
        setCfcBalance(null); 
        console.warn("Fetch CFC balance: No access token. User might need to log in."); 
        return; 
      }
      const response = await fetch(`/api/coffee-coin/balance/${user.wallet.address}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: 'Failed to parse CFC balance error from backend.' }));
        throw new Error(errData.error || `Failed to fetch CFC balance (status: ${response.status})`);
      }
      const data = await response.json();
      setCfcBalance(data.balance);
    } catch (error: any) {
      console.warn("Warning fetching CFC balance:", error.message); 
      setCfcBalance(null);
    } finally {
      setIsLoadingCfcBalance(false);
    }
  }, [ready, authenticated, user?.wallet?.address, getAccessToken]);

  // Fetch balances when user authentication status changes or wallet address becomes available
  useEffect(() => {
    if (authenticated && user?.wallet?.address) {
      fetchCfcBalance();
      fetchUserEthBalance();
    } else {
        // Clear balances if user logs out or wallet becomes unavailable
        setCfcBalance(null);
        setUserEthBalance(null);
    }
  }, [authenticated, user?.wallet?.address, fetchCfcBalance, fetchUserEthBalance]);

  // Handles the process of redeeming a reward
  const handleRedeemReward = async (reward: Reward) => {
    if (!ready || !authenticated || !user?.wallet || !user.wallet.address) {
      toast({ title: "Not Ready", description: "Please log in and ensure your wallet is connected.", variant: "destructive" });
      if (!authenticated) login(); 
      return;
    }

    const pointsToRedeem = reward.pointsRequired;
    const currentCfcBalanceBigInt = cfcBalance ? BigInt(cfcBalance) : BigInt(0);

    if (currentCfcBalanceBigInt < BigInt(pointsToRedeem)) {
      toast({ title: "Insufficient Balance", description: `You need ${pointsToRedeem} ${CURRENCY_SYMBOL_POINTS} for "${reward.title}", but you only have ${cfcBalance || 0} ${CURRENCY_SYMBOL_POINTS}.`, variant: "destructive" });
      return;
    }

    if (!window.confirm(`Redeem "${reward.title}" for ${reward.pointsRequired} ${CURRENCY_SYMBOL_POINTS}? This will use Sepolia ETH for gas fees.`)) {
      return; // User cancelled the confirmation
    }

    setRedeemingRewardId(reward.id); // Set loading state for the specific reward button
    toast({ title: `Redeeming "${reward.title}"`, description: "Preparing transaction..." });

    try {
      const privyWallet = user.wallet; // Already checked user.wallet exists
      console.log("Privy Wallet Object for Redemption:", JSON.stringify(privyWallet, null, 2)); // For debugging

      let numericChainId: number;
      if (typeof privyWallet.chainId === 'string' && privyWallet.chainId.startsWith('eip155:')) {
        numericChainId = parseInt(privyWallet.chainId.split(':')[1], 10);
      } else if (typeof privyWallet.chainId === 'number') {
        numericChainId = privyWallet.chainId;
      } else {
        const sepoliaChainId = 11155111; // Sepolia's chain ID
        console.warn("Could not determine chainId from privyWallet. Defaulting to Sepolia:", privyWallet.chainId);
        toast({title: "Chain ID Warning", description: `Assuming Sepolia (ID: ${sepoliaChainId}). If this is incorrect, the transaction may fail or go to the wrong network.`, variant: "default", duration: 7000});
        numericChainId = sepoliaChainId; 
      }
      console.log("Using Numeric Chain ID for transaction:", numericChainId);

      const coffeeCoinAddress = import.meta.env.VITE_COFFEE_COIN_CONTRACT_ADDRESS;
      const contractABI = ["function burn(uint256 amount)"]; // Minimal ABI for burn
      if (!coffeeCoinAddress) {
        throw new Error("CoffeeCoin contract address (VITE_COFFEE_COIN_CONTRACT_ADDRESS) is not configured in your frontend environment.");
      }

      const iface = new Interface(contractABI);
      const encodedData = iface.encodeFunctionData("burn", [BigInt(pointsToRedeem)]);

      const unsignedTx: UnsignedTransaction = { 
        to: coffeeCoinAddress,
        chainId: numericChainId,
        data: encodedData,
        value: 0n, // No ETH value sent with the burn transaction
      };
      
      console.log("Prepared Unsigned Transaction for Privy:", unsignedTx);
      // Use Privy's sendTransaction hook. It uses the active wallet from `user.wallet`.
      const txResult = await sendTransaction(unsignedTx); 

      const txHash = txResult.hash;
      toast({ title: "Redemption Sent", description: `Transaction: ${txHash.substring(0,10)}... Waiting for on-chain confirmation.` });

      let receiptStatus = 0; // 0: unknown/failed, 1: success
      try {
        // Wait for the transaction to be mined using a public RPC
        const publicRpcUrl = import.meta.env.VITE_SEPOLIA_PUBLIC_RPC_URL || "https://rpc.sepolia.org";
        const receiptProvider = new ethers.JsonRpcProvider(publicRpcUrl);
        console.log(`Waiting for transaction receipt for hash: ${txHash} on ${publicRpcUrl}`);
        const txReceipt = await receiptProvider.waitForTransaction(txHash, 1, 90000); // Wait 1 conf, timeout 90s
        if (txReceipt && txReceipt.status === 1) {
          receiptStatus = 1;
          console.log("Transaction confirmed successfully on-chain:", txReceipt);
        } else {
          console.error("On-chain transaction receipt indicated failure or was null:", txReceipt);
        }
      } catch (receiptError: any) {
        console.error("Error waiting for transaction receipt:", receiptError.message);
        toast({title: "Receipt Confirmation Pending", description: "Transaction sent. Could not confirm status immediately. Please check a block explorer or refresh balances later.", variant:"default", duration: 7000});
        // Depending on app requirements, you might still attempt to record with backend or assume failure here.
        // For now, if receipt check fails, we treat the on-chain part as potentially failed/unknown.
      }

      if (receiptStatus === 1) {
        toast({
          title: "Redemption Successful!",
          description: ( <div className="flex items-center"><CheckCircle className="mr-2 h-5 w-5 text-green-500" />Successfully redeemed points for "{reward.title}".</div> ),
          duration: 7000,
        });
        
        const accessToken = await getAccessToken();
        if (!accessToken) { 
          console.warn("No access token available after successful burn. Cannot record redemption on backend."); 
          fetchCfcBalance(); // Refresh CFC balance
          fetchUserEthBalance(); // Refresh ETH balance
          return; // Exit before trying to record
        }

        // Inform the backend about the successful redemption
        const recordResponse = await fetch('/api/coffee-coin/record-redemption', {
            method: 'POST', 
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
            body: JSON.stringify({ 
                rewardId: reward.id, 
                pointsBurned: pointsToRedeem.toString(), 
                burnTransactionHash: txHash 
            })
        });

        if (!recordResponse.ok) {
            const recordErr = await recordResponse.json().catch(() => ({error: "Could not parse backend error response when recording redemption."}));
            console.warn("Failed to record redemption on backend:", recordErr.error);
            toast({ title: "Backend Record Issue", description: `Your points were burned on-chain, but there was an issue recording the redemption with our server: ${recordErr.error || 'Unknown backend error'}. Please contact support if your reward is not processed.`, variant: "default", duration: 10000});
        } else {
            const recordData = await recordResponse.json();
            console.log("Redemption successfully recorded on backend:", recordData);
            if(recordData.voucherCode) {
                toast({ title: "Voucher Code Generated!", description: `Your voucher code for "${reward.title}": ${recordData.voucherCode}`, duration: 15000});
            }
        }
        fetchCfcBalance(); // Refresh CFC balance
        fetchUserEthBalance(); // Refresh ETH balance as gas was used
      } else {
        throw new Error(`On-chain redemption transaction may have failed or its status is unknown (Hash: ${txHash}). Please check a block explorer.`);
      }
    } catch (error: any) {
      console.error("Redemption error details:", error); // Log the full error object
      let errorMessage = error.message || "An error occurred during the redemption process.";
      // Try to extract more specific messages from Privy/Ethers error objects
      if (typeof error === 'object' && error !== null) {
        if ('data' in error && typeof (error as any).data === 'object' && (error as any).data !== null && 'message' in (error as any).data) {
            errorMessage = (error as any).data.message; // Often from Privy hooks if it's an RPC error they wrapped
        } else if ('reason' in error) {
            errorMessage = (error as any).reason; // Ethers.js smart contract revert reason
        }
      }
      
      toast({ 
        title: "Redemption Process Failed", 
        description: ( <div className="flex items-start"><AlertTriangleIcon className="h-5 w-5 mr-2 text-red-500 shrink-0"/> <span className="break-all">{errorMessage}</span> </div> ), 
        variant: "destructive", duration: 10000 
      });
    } finally {
      setRedeemingRewardId(null); // Clear loading state for the specific reward button
    }
  };

  // Initial loading state for the page
  if (!ready) {
    return <div className="container mx-auto p-4 text-center text-gray-500">Initializing Loyalty Program...</div>;
  }
  
  const numericCfcBalance = cfcBalance ? BigInt(cfcBalance) : BigInt(0);

  return (
    <div className="container mx-auto p-4 space-y-8">
      <h1 className="text-3xl font-bold text-coffee-brown mb-6 text-center">My Rewards Dashboard</h1>
      
      {/* Login prompt if not authenticated */}
      {!authenticated ? (
        <Card className="max-w-md mx-auto shadow-md">
          <CardHeader><CardTitle>Welcome!</CardTitle><CardDescription>Please log in to manage your CoffeeCoins and redeem rewards.</CardDescription></CardHeader>
          <CardContent className="flex justify-center"><Button onClick={login}><Send className="mr-2 h-4 w-4" /> Login with Privy</Button></CardContent>
        </Card>
      ) : (
        // Main content for authenticated users
        <>
          {/* Balance Display Card */}
          <Card className="max-w-lg mx-auto shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center"><Coins className="mr-3 h-7 w-7 text-amber-500" /> Your CoffeeCoin Balance</CardTitle>
              {user?.wallet && <CardDescription>Wallet: {user.wallet.address.substring(0,6)}...{user.wallet.address.substring(user.wallet.address.length - 4)}</CardDescription>}
            </CardHeader>
            <CardContent className="text-center">
              {isLoadingCfcBalance ? 
                <p className="text-4xl text-gray-400 font-bold animate-pulse">Loading CFC...</p> : 
                <p className="text-5xl text-amber-600 font-bold">{cfcBalance !== null ? cfcBalance : '--'} <span className="text-3xl">{CURRENCY_SYMBOL_POINTS}</span></p>
              }
              <div className="mt-3 text-sm text-gray-600">
                Sepolia ETH: {userEthBalance !== null ? `${userEthBalance} ETH` : "Loading..."}
                {userEthBalance === "0.00000" && <span className="ml-1 text-orange-600 font-medium">(Low gas!)</span>}
              </div>
              <div className="mt-2 space-x-2">
                {!user?.wallet && ready && <Button onClick={createWallet} size="sm" variant="outline">Create Wallet</Button>}
                {user?.wallet && <Button variant="link" onClick={exportWallet} size="sm" className="text-xs px-1 text-gray-500 hover:text-gray-700">Export Wallet</Button>}
              </div>
            </CardContent>
          </Card>
          
          {/* Available Rewards Section */}
          <div className="my-10">
            <h2 className="text-2xl font-semibold text-coffee-dark mb-6 text-center">Available Rewards to Redeem</h2>
            {rewardsData.length === 0 ? (
                <p className="text-center text-gray-500">No rewards are available at the moment. Please check back soon!</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {rewardsData.map((reward) => {
                  const RewardIcon = reward.icon;
                  const canAfford = user?.wallet && !isLoadingCfcBalance && cfcBalance !== null && numericCfcBalance >= BigInt(reward.pointsRequired);
                  const buttonDisabled = redeemingRewardId === reward.id || !user?.wallet || isLoadingCfcBalance || !canAfford;
                  
                  return (
                    <Card key={reward.id} className="shadow-lg flex flex-col hover:shadow-xl transition-shadow duration-300 bg-white overflow-hidden rounded-lg">
                      <CardHeader className="items-center text-center pt-6 pb-3 bg-slate-50 border-b">
                        <div className="p-3 bg-amber-100 rounded-full mb-2 inline-flex ring-4 ring-amber-200">
                            <RewardIcon className="h-10 w-10 text-amber-600" />
                        </div>
                        <CardTitle className="text-xl text-slate-800">{reward.title}</CardTitle>
                      </CardHeader>
                      <CardContent className="flex-grow text-center py-4 px-4">
                        <CardDescription className="text-sm text-slate-600 mb-3 h-10 line-clamp-2">{reward.description}</CardDescription>
                        <p className="text-3xl font-bold text-amber-700">
                            {reward.pointsRequired} <span className="text-xl font-medium align-baseline">{CURRENCY_SYMBOL_POINTS}</span>
                        </p>
                      </CardContent>
                      <CardFooter className="p-4 border-t bg-slate-50">
                        <Button 
                            onClick={() => handleRedeemReward(reward)} 
                            disabled={buttonDisabled}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 text-base"
                        >
                          {redeemingRewardId === reward.id ? (
                            <><svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Redeeming...</>
                          ) : ( <><Gift className="mr-2 h-5 w-5" /> Redeem Reward</> )}
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Transaction History Component */}
          <TransactionHistory />
        </>
      )}
    </div>
  );
};

export default MyRewardsPage;