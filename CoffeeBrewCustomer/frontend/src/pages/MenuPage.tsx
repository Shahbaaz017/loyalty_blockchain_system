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
