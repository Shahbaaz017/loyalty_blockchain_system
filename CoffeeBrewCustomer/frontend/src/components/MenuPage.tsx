// frontend/src/components/MenuPage.tsx
import React, { useState } from 'react';
import { Coffee, ShoppingBag, CheckCircle, AlertTriangle, CreditCard, Lock } from 'lucide-react';
import { usePrivy } from '@privy-io/react-auth';
import { useToast } from './ui/use-toast';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"; // Assuming Shadcn's Dialog from your components/ui folder
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// --- Currency Configuration ---
const CURRENCY_SYMBOL = '₹'; // Change this to your desired currency symbol
const POINTS_PER_CURRENCY_UNIT = 1; // e.g., 1 point per Rupee

interface MenuItemData {
  id: string;
  name: string;
  description?: string;
  price: number; // Store price as a number
  category: 'hot-drinks' | 'cold-drinks' | 'pastries' | 'snacks';
  icon: string;
}

const formatPrice = (price: number): string => {
  return `${CURRENCY_SYMBOL}${price.toFixed(2)}`;
};

const calculatePointsFromPrice = (price: number): number => {
  return Math.floor(price * POINTS_PER_CURRENCY_UNIT);
};

const menuItems: MenuItemData[] = [
    { id: '1', name: 'Signature Espresso', description: 'Rich, bold shot', price: 250.00, category: 'hot-drinks', icon: '☕' },
    { id: '2', name: 'Classic Latte', description: 'Smooth espresso, steamed milk', price: 300.00, category: 'hot-drinks', icon: '🥛' },
    { id: '3', name: 'Cappuccino Supreme', description: 'Espresso, steamed milk, foam', price: 320.00, category: 'hot-drinks', icon: '☕' },
    { id: '4', name: 'Caramel Macchiato', description: 'Vanilla, caramel drizzle', price: 350.00, category: 'hot-drinks', icon: '☕' },
    { id: '5', name: 'Iced Americano', description: 'Chilled espresso over ice', price: 260.00, category: 'cold-drinks', icon: '🧊' },
    { id: '6', name: 'Cold Brew', description: '24-hour slow-steeped', price: 280.00, category: 'cold-drinks', icon: '🧊' },
    { id: '7', name: 'Vanilla Frappé', description: 'Blended iced coffee, vanilla', price: 380.00, category: 'cold-drinks', icon: '🥤' },
    { id: '8', name: 'Almond Croissant', description: 'Buttery, almond filling', price: 180.00, category: 'pastries', icon: '🥐' },
    { id: '9', name: 'Blueberry Scone', description: 'Fresh-baked, wild blueberries', price: 150.00, category: 'pastries', icon: '🫐' },
    { id: '10', name: 'Chocolate Muffin', description: 'Double chocolate chip', price: 160.00, category: 'pastries', icon: '🧁' },
    { id: '11', name: 'Artisan Bagel', description: 'With cream cheese', price: 200.00, category: 'snacks', icon: '🥯' },
    { id: '12', name: 'Avocado Toast', description: 'Multigrain, fresh avocado', price: 400.00, category: 'snacks', icon: '🥑' }
];

const categories = [
    { id: 'hot-drinks', name: 'Hot Drinks', icon: '☕' },
    { id: 'cold-drinks', name: 'Cold Drinks', icon: '🧊' },
    { id: 'pastries', name: 'Fresh Pastries', icon: '🥐' },
    { id: 'snacks', name: 'Light Bites', icon: '🥯' }
];

const MenuPage: React.FC = () => {
  const { toast } = useToast();
  const { authenticated, ready, login, getAccessToken } = usePrivy();
  const [processingPurchaseId, setProcessingPurchaseId] = useState<string | null>(null);
  
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [selectedItemForPayment, setSelectedItemForPayment] = useState<MenuItemData | null>(null);
  const [isSimulatingPayment, setIsSimulatingPayment] = useState(false);

  const getItemsByCategory = (categoryId: string) => menuItems.filter(item => item.category === categoryId);

  const handleBuyButtonClick = (item: MenuItemData) => {
    if (!ready) {
      toast({ title: "System Not Ready", description: "Please wait a moment and try again.", variant: "destructive" }); return;
    }
    if (!authenticated) {
      toast({ title: "Not Logged In", description: "Please log in to make a purchase and earn points.", variant: "destructive" });
      login();
      return;
    }
    setSelectedItemForPayment(item);
    setShowPaymentDialog(true);
  };

  const processPointsMinting = async (item: MenuItemData, pointsToEarn: number) => {
    if (!item) {
        console.error("processPointsMinting called without an item.");
        return; 
    }

    setProcessingPurchaseId(item.id);
    setIsSimulatingPayment(false); 
    setShowPaymentDialog(false); 

    try {
      const accessToken = await getAccessToken();
      if (!accessToken) {
          toast({ title: "Authentication Error", description: "Your session may have expired. Please log in again.", variant: "destructive" });
          login(); // Prompt re-login
          throw new Error("Access token not available.");
      }

      const response = await fetch('/api/coffee-coin/earn-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({ pointsToEarn }),
      });

      if (!response.ok) {
        let errorBody = `Minting points failed. Server responded with ${response.status}`;
        try { 
          const errData = await response.json(); 
          errorBody = errData.error || JSON.stringify(errData).substring(0,100) || errorBody; 
        } catch (e) { 
          try {errorBody = (await response.text()).substring(0,100) || errorBody} 
          catch(e){/*ignore if text fails too*/} 
        }
        throw new Error(errorBody);
      }
      const data = await response.json();
      toast({
        title: "Purchase & Points Successful!",
        description: (
          <div className="flex items-center">
            <CheckCircle className="mr-2 h-5 w-5 text-green-500" />
            You earned {pointsToEarn} CoffeeCoins for {item.name}! New balance: {data.newBalance}.
          </div>
        ),
      });
    } catch (error: any) {
      console.error("Error minting points:", error);
      toast({ title: "Minting Points Failed", description: error.message || "An unexpected error occurred.", variant: "destructive" });
    } finally {
      setProcessingPurchaseId(null);
      setSelectedItemForPayment(null);
    }
  };

  const handleSimulatedPayment = () => {
    if (!selectedItemForPayment) return;
    setIsSimulatingPayment(true);
    toast({title: "Processing Payment...", description: "Please wait while we securely process your payment."})

    setTimeout(() => {
      toast({
        title: "Payment Successful!",
        description: `Now minting your ${calculatePointsFromPrice(selectedItemForPayment.price)} points for ${selectedItemForPayment.name}.`,
        variant: "default"
      });
      // Proceed to mint points after simulated payment
      processPointsMinting(selectedItemForPayment, calculatePointsFromPrice(selectedItemForPayment.price));
    }, 2500); 
  };

  return (
    <>
      {selectedItemForPayment && (
        <Dialog open={showPaymentDialog} onOpenChange={(isOpen) => {
            if (!isOpen && !isSimulatingPayment) { // If closed manually and not during payment simulation
                setSelectedItemForPayment(null); // Clear item
            }
            setShowPaymentDialog(isOpen);
        }}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="flex items-center text-lg font-medium">
                <CreditCard className="mr-2 h-5 w-5 text-blue-600" /> Secure Checkout
              </DialogTitle>
              <DialogDescription>
                Complete your purchase for <span className="font-semibold">{selectedItemForPayment.name}</span>.
                <br/>
                Total Amount: <span className="font-semibold">{formatPrice(selectedItemForPayment.price)}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <p className="text-xs text-center text-gray-500 mb-2">This is a simulated payment environment. Do not enter real card details.</p>
              <div className="space-y-3">
                <div>
                    <Label htmlFor="card-number" className="text-sm font-medium">Card Number</Label>
                    <Input id="card-number" defaultValue="4242 4242 4242 4242" placeholder="0000 0000 0000 0000" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <Label htmlFor="expiry" className="text-sm font-medium">Expiry (MM/YY)</Label>
                        <Input id="expiry" defaultValue="12/28" placeholder="MM/YY" />
                    </div>
                    <div>
                        <Label htmlFor="cvc" className="text-sm font-medium">CVC</Label>
                        <Input id="cvc" defaultValue="123" placeholder="123" />
                    </div>
                </div>
                 <div>
                    <Label htmlFor="name" className="text-sm font-medium">Name on Card</Label>
                    <Input id="name" defaultValue="Loyal Coffee Lover" placeholder="Full Name" />
                </div>
              </div>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row sm:justify-between gap-2 pt-4">
                <DialogClose asChild>
                    <Button type="button" variant="outline" onClick={() => setIsSimulatingPayment(false)} disabled={isSimulatingPayment}>
                    Cancel
                    </Button>
                </DialogClose>
              <Button type="button" onClick={handleSimulatedPayment} disabled={isSimulatingPayment} className="bg-blue-600 hover:bg-blue-700 text-white sm:w-auto w-full">
                {isSimulatingPayment ? (
                  <><svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Processing Payment...</>
                ) : (
                  <><Lock className="mr-2 h-4 w-4" /> Pay {formatPrice(selectedItemForPayment.price)} & Earn Points</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
        <div className="bg-gradient-to-r from-coffee-brown to-coffee-dark text-cream shadow-lg">
          <div className="max-w-6xl mx-auto px-4 py-12">
            <div className="text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Coffee className="w-8 h-8 text-yellow-300" />
                <h1 className="text-4xl font-bold text-cream">Our Menu</h1>
                <Coffee className="w-8 h-8 text-yellow-300" />
              </div>
              <p className="text-amber-100 text-lg">
                Crafted with passion, served with love. Discover your new favorite!
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-12">
          {categories.map((category) => {
            const itemsInCategory = getItemsByCategory(category.id);
            return (
              <div key={category.id} className="mb-12">
                <div className="text-center mb-8">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <span className="text-3xl">{category.icon}</span>
                    <h2 className="text-3xl font-bold text-coffee-brown">{category.name}</h2>
                    <span className="text-3xl">{category.icon}</span>
                  </div>
                  <div className="w-24 h-1 bg-gradient-to-r from-amber-400 to-orange-400 mx-auto rounded"></div>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {itemsInCategory.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-xl shadow-lg border border-amber-100 p-6 flex flex-col justify-between hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                    >
                      <div>
                        <div className="text-center mb-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-amber-200 to-orange-200 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                            <span className="text-2xl">{item.icon}</span>
                          </div>
                          <h3 className="text-xl font-semibold text-coffee-brown mb-2">{item.name}</h3>
                          {item.description && (
                            <p className="text-coffee-light text-sm mb-3 leading-relaxed">{item.description}</p>
                          )}
                        </div>
                        <div className="text-center mb-4">
                          <div className="inline-flex items-center justify-center bg-gradient-to-r from-amber-600 to-orange-600 text-white px-6 py-2 rounded-full font-bold text-lg shadow-md">
                            {formatPrice(item.price)}
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleBuyButtonClick(item)}
                        disabled={processingPurchaseId === item.id || !ready}
                        className="w-full bg-coffee-brown hover:bg-coffee-dark text-cream font-semibold mt-4"
                      >
                        {processingPurchaseId === item.id ? (
                          <div className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle opacity="0.25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path opacity="0.75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Minting Points...
                          </div>
                        ) : (
                          <>
                            <ShoppingBag className="mr-2 h-5 w-5" /> Buy & Earn {calculatePointsFromPrice(item.price)} Points
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="bg-gradient-to-r from-amber-100 to-orange-100 py-12">
          <div className="max-w-4xl mx-auto text-center px-4">
            <h3 className="text-2xl font-bold text-coffee-brown mb-4">
              Earn CoffeeCoins with Every Purchase!
            </h3>
            <p className="text-coffee-light mb-6">
              Join our loyalty program and start earning rewards today. Every sip gets you closer to your next free treat!
            </p>
            <a href="/rewards" className="inline-flex items-center bg-coffee-brown hover:bg-coffee-dark text-cream px-6 py-3 rounded-lg font-semibold transition-colors">
              Join Rewards Program
              <Coffee className="w-5 h-5 ml-2" />
            </a>
          </div>
        </div>
      </div>
    </>
  );
};

export default MenuPage;