// frontend/src/components/TransactionHistory.tsx
import React, { useEffect, useState } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import { useToast } from './ui/use-toast';
import { Skeleton } from './ui/skeleton';
import { Button } from './ui/button';
import { AlertTriangle, ArrowDownLeft, ArrowUpRight, Gift, PlusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface TransactionEvent {
  transactionHash: string;
  blockNumber: number;
  timestamp?: number;
  type: 'earned' | 'redeemed' | 'sent' | 'received';
  amount: string;
  from: string;
  to: string;
  tokenSymbol: string;
}

const TransactionHistory: React.FC = () => {
  const { toast } = useToast();
  const { authenticated, ready, user, getAccessToken, login } = usePrivy();
  const [history, setHistory] = useState<TransactionEvent[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const explorerBaseUrl = 'https://sepolia.etherscan.io/tx/';

  useEffect(() => {
    const fetchHistory = async () => {
      if (!ready) return;
      if (!authenticated || !user?.wallet?.address) {
        setHistory([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const accessToken = await getAccessToken();
        if (!accessToken) {
          setError("Authentication error. Please log in again.");
          login();
          return;
        }

        const response = await fetch('/api/coffee-coin/transaction-history', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || `Failed to fetch history. Status: ${response.status}`);
        }

        const data: TransactionEvent[] = await response.json();
        setHistory(data);
      } catch (err: any) {
        console.error("Error fetching transaction history:", err);
        setError(err.message || "An unexpected error occurred while fetching history.");
        toast({
          title: "Error Fetching History",
          description: err.message || "Could not load your CoffeeCoin transactions.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (ready) {
        fetchHistory();
    }
  }, [authenticated, ready, user?.wallet?.address, getAccessToken, toast, login]);

  const renderIconAndText = (event: TransactionEvent) => {
    let icon, text, colorClass;
    const amountDisplay = `${event.amount} ${event.tokenSymbol}`;

    switch (event.type) {
      case 'earned':
        icon = <PlusCircle className="h-5 w-5 text-green-500" />;
        text = `Earned ${amountDisplay}`;
        colorClass = 'text-green-600';
        break;
      case 'redeemed':
        icon = <Gift className="h-5 w-5 text-red-500" />;
        text = `Redeemed ${amountDisplay}`;
        colorClass = 'text-red-600';
        break;
      case 'received':
        icon = <ArrowDownLeft className="h-5 w-5 text-blue-500" />;
        text = `Received ${amountDisplay} from ${event.from.substring(0,6)}...${event.from.substring(event.from.length - 4)}`;
        colorClass = 'text-blue-600';
        break;
      case 'sent':
        icon = <ArrowUpRight className="h-5 w-5 text-orange-500" />;
        text = `Sent ${amountDisplay} to ${event.to.substring(0,6)}...${event.to.substring(event.to.length - 4)}`;
        colorClass = 'text-orange-600';
        break;
      default:
        icon = null;
        text = `Unknown transaction: ${amountDisplay}`;
        colorClass = 'text-gray-500';
    }
    return { icon, text, colorClass };
  };

  if (!ready) {
    return (
        <Card className="w-full max-w-2xl mx-auto mt-6">
            <CardHeader><CardTitle>Transaction History</CardTitle></CardHeader>
            <CardContent><p className="text-center p-4">Initializing Privy...</p></CardContent>
        </Card>
    );
  }

  if (!authenticated) {
    return (
      <Card className="w-full max-w-2xl mx-auto mt-6">
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-gray-600">
            Please <Button variant="link" onClick={login} className="p-0 h-auto text-base">log in</Button> to view your CoffeeCoin transaction history.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto mt-6 shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold text-coffee-brown">Your CoffeeCoin History</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 p-3 border-b border-gray-200 last:border-b-0">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}
        {!isLoading && error && (
          <div className="text-center p-4 text-red-600 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 mr-2" /> {error}
          </div>
        )}
        {!isLoading && !error && history.length === 0 && (
          <p className="text-center text-gray-500 py-4">No CoffeeCoin transactions found yet.</p>
        )}
        {!isLoading && !error && history.length > 0 && (
          <ul className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {history.map((event) => {
              const { icon, text, colorClass } = renderIconAndText(event);
              const date = event.timestamp ? new Date(event.timestamp * 1000).toLocaleString() : `Block: ${event.blockNumber}`;
              return (
                <li key={event.transactionHash + event.type + event.blockNumber} className="py-4 px-2 hover:bg-amber-50 transition-colors duration-150">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${colorClass}`}>
                        {text}
                      </p>
                      <p className="text-xs text-gray-500 truncate" title={date}>
                        {date}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                       <a
                        href={`${explorerBaseUrl}${event.transactionHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:text-blue-700 hover:underline"
                        title="View on Etherscan"
                       >
                        View Tx
                       </a>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default TransactionHistory;