// frontend/admin_dashboard_structure.txt/src/components/CoffeeShopAdminDashboard.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  Coffee, Users, ShoppingCart, Award, Gift, TrendingUp, FileText,
  AlertCircle, ServerCrash, Package, Tag, BarChart3, ListChecks, FileJson,
  Repeat, Zap, UsersRound, Activity, Droplets
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

interface AdminContractOverview {
  contractAddress: string;
  creatorAddress: string | null;
  creationTxHash: string | null;
  totalSupply: string;
  tokenName: string;
  tokenSymbol: string;
  totalMinted?: string;
  totalRedeemedToZeroAddress?: string;
  numberOfHolders?: number;
  totalContractTransactions?: number;
}

interface EtherscanNormalTransaction {
  blockNumber: string; timeStamp: string; hash: string; from: string; to: string;
  value: string; contractAddress: string; input: string; methodId?: string;
  functionName?: string; isError: string; gasUsed: string;
}

const API_BASE_URL = '/api/admin';

const fetchContractOverview = async (): Promise<AdminContractOverview> => {
  const { data } = await axios.get(`${API_BASE_URL}/contract-overview`);
  return data;
};

const fetchManyContractInteractions = async (count: number = 50): Promise<EtherscanNormalTransaction[]> => {
  const { data } = await axios.get(`${API_BASE_URL}/contract-interactions?page=1&offset=${count}`);
  return data;
};

interface StatCardProps { title: string; value: string | number | undefined; icon: React.ReactNode; description?: string; isLoading?: boolean; isError?: boolean; unit?: string; link?: string; linkText?: string; className?: string; }
const StatCard: React.FC<StatCardProps> = ({ title, value, icon, description, isLoading, isError, unit, link, linkText, className }) => ( <Card className={`bg-amber-50 rounded-lg shadow-md p-4 border border-amber-200 hover:shadow-lg transition-shadow ${className}`}> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-0 px-2"> <CardTitle className="text-xs font-medium text-amber-700 uppercase tracking-wide">{title}</CardTitle> <div className="text-amber-600">{icon}</div> </CardHeader> <CardContent className="px-2 pb-2"> {isLoading ? ( <Skeleton className="h-8 w-3/4 mt-1 bg-amber-200" /> ) : isError ? ( <div className="text-xl font-bold text-red-600 flex items-center"><AlertCircle className="mr-2 h-5 w-5" /> Error</div> ) : ( <div className="text-2xl font-bold text-amber-900"> {value === undefined || value === null || value === '' ? 'N/A' : value} {unit && !(value === undefined || value === null || value === '') && <span className="text-lg font-normal ml-1">{unit}</span>} </div> )} {description && !isLoading && !isError && <p className="text-xs text-amber-700 pt-1">{description}</p>} {link && !isLoading && !isError && !(value === undefined || value === null || value === '') && ( <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-amber-600 hover:text-amber-800 hover:underline pt-1 block"> {linkText || "View Details"} </a> )} </CardContent> </Card> );

type TabKey = 'dashboard' | 'details' | 'transactions';

const getCoffeeNameForAmount = (amount: string, index: number, symbol: string): string => {
  const baseNames = ["Espresso Roast", "Latte Blend", "Cappuccino Classic", "Mocha Delight", "Americano Strong", "Macchiato Swirl", "Flat White Smooth", "Cold Brew Bold", "Decaf Peace", "Single Origin Gem"];
  let hash = 0;
  for (let i = 0; i < amount.length; i++) {
    hash = (hash << 5) - hash + amount.charCodeAt(i);
    hash |= 0;
  }
  const nameIndex = Math.abs(hash) % baseNames.length;
  return `${baseNames[nameIndex]} (${amount} ${symbol})`;
};

export const CoffeeShopAdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const shopNameFallback = "CoffeeCoin";

  const {
    data: overviewData,
    isLoading: isLoadingOverview,
    isError: isErrorOverview,
    error: overviewError
  } = useQuery<AdminContractOverview, Error>({
    queryKey: ['adminContractOverview'],
    queryFn: fetchContractOverview,
    refetchInterval: 60000,
  });

  const {
    data: recentInteractionsData,
    isLoading: isLoadingRecentInteractions,
    isError: isErrorRecentInteractions,
    error: recentInteractionsError
  } = useQuery<EtherscanNormalTransaction[], Error>({
    queryKey: ['adminRecentContractInteractions', 10],
    queryFn: () => fetchManyContractInteractions(10),
    enabled: activeTab === 'transactions',
    refetchInterval: activeTab === 'transactions' ? 30000 : false,
  });

  const {
    data: allInteractionsForChart,
    isLoading: isLoadingAllInteractionsForChart,
  } = useQuery<EtherscanNormalTransaction[], Error>({
    queryKey: ['adminAllContractInteractionsForChart', 50],
    queryFn: () => fetchManyContractInteractions(50),
    enabled: activeTab === 'dashboard',
  });

  // --- DEBUGGING LOG ---
  useEffect(() => {
    if (activeTab === 'dashboard' && allInteractionsForChart) {
      console.log("[DEBUG] All Interactions for Chart:", allInteractionsForChart);
    }
  }, [allInteractionsForChart, activeTab]);
  // --- END DEBUGGING LOG ---

  const ETHERSCAN_BASE_URL_SEPOLIA = 'https://sepolia.etherscan.io';
  const tokenDisplayName = overviewData?.tokenName || shopNameFallback;
  const tokenDisplaySymbol = overviewData?.tokenSymbol || "CFC";

  const navItems: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="mr-2 h-5 w-5" /> },
    { key: 'details', label: 'Contract Details', icon: <FileJson className="mr-2 h-5 w-5" /> },
    { key: 'transactions', label: 'Transactions', icon: <ListChecks className="mr-2 h-5 w-5" /> },
  ];

  const barChartDataMintBurn = useMemo(() => { /* ... unchanged ... */ if (!overviewData) return [{ name: 'Token Lifecycle', 'Tokens Minted': 0, 'Tokens Redeemed (to 0x0)': 0 }]; return [ { name: 'Token Lifecycle', 'Tokens Minted': overviewData.totalMinted ? parseFloat(overviewData.totalMinted) : 0, 'Tokens Redeemed (to 0x0)': overviewData.totalRedeemedToZeroAddress ? parseFloat(overviewData.totalRedeemedToZeroAddress) : 0, }, ]; }, [overviewData]);

  const mintDistributionChartData = useMemo(() => {
    if (!allInteractionsForChart || !overviewData) { // Ensure overviewData is also available for tokenDisplaySymbol
        // console.log("[DEBUG] MintDistChart: Missing allInteractionsForChart or overviewData");
        return [];
    }

    const mintTransactions = allInteractionsForChart.filter(
      (tx) => tx.functionName?.toLowerCase().startsWith('mint(') && tx.isError === '0'
    );

    // --- DEBUGGING LOG ---
    // console.log("[DEBUG] Filtered Mint Transactions for Chart:", mintTransactions);
    // --- END DEBUGGING LOG ---

    const distributions: { [amount: string]: { count: number, totalValue: bigint } } = {};

    mintTransactions.forEach(tx => {
      let amountMintedBigInt: bigint | undefined;
      try {
        // Priority 1: Parse from backend-formatted functionName like "mint(..., 100)"
        if (tx.functionName) {
          const match = tx.functionName.match(/mint\(\s*\.\.\.\s*,\s*(\d+)\s*\)/i);
          if (match && match[1]) {
            amountMintedBigInt = BigInt(match[1]);
            // console.log(`[DEBUG] Parsed amount ${amountMintedBigInt} from functionName: ${tx.functionName}`);
          }
        }

        // Priority 2 (Fallback): Parse from raw input data if not found in functionName
        // This assumes the standard mint(address to, uint256 amount)
        if (amountMintedBigInt === undefined && tx.input && tx.input.length >= (10 + 64 + 64) && tx.input.startsWith('0x')) {
          // 0x + sighash (4 bytes = 8 hex) + address (32 bytes = 64 hex) + amount (32 bytes = 64 hex)
          const amountHexSegment = tx.input.substring(10 + 64, 10 + 64 + 64);
          if (amountHexSegment.length === 64) { // Ensure it's a full 32-byte hex string
            try {
              amountMintedBigInt = BigInt('0x' + amountHexSegment);
              // console.log(`[DEBUG] Parsed amount ${amountMintedBigInt} from input: ${tx.input}`);
            } catch (e) {
              // console.warn(`[DEBUG] Failed to parse amount from input hex: ${amountHexSegment} for tx ${tx.hash}`, e);
            }
          }
        }

        if (amountMintedBigInt !== undefined && amountMintedBigInt > 0n) { // Ensure positive amount
          const amountStr = amountMintedBigInt.toString();
          if (!distributions[amountStr]) {
            distributions[amountStr] = { count: 0, totalValue: 0n };
          }
          distributions[amountStr].count++;
          distributions[amountStr].totalValue += amountMintedBigInt;
        } else if (amountMintedBigInt === undefined) {
            // console.log(`[DEBUG] Could not determine mint amount for tx: ${tx.hash}, funcName: ${tx.functionName}, input relevant part: ${tx.input.substring(0,10 + 64 + 64 + 5)}...`);
        }
      } catch (e) {
        console.warn("[DEBUG] Error processing mint transaction for chart:", tx.hash, e);
      }
    });

    const chartData = Object.entries(distributions)
      .map(([amount, data], index) => ({
        name: getCoffeeNameForAmount(amount, index, tokenDisplaySymbol),
        'Number of Mints': data.count,
        'Total Tokens': parseFloat(data.totalValue.toString()), // Sum of tokens for that specific amount
        amountValue: parseFloat(amount)
      }))
      .sort((a, b) => b.amountValue - a.amountValue)
      .slice(0, 7); // Show top 7 mint values by amount

      // --- DEBUGGING LOG ---
      // console.log("[DEBUG] Generated Mint Distribution Chart Data:", chartData);
      // --- END DEBUGGING LOG ---
    return chartData;
  }, [allInteractionsForChart, overviewData, tokenDisplaySymbol]); // Added tokenDisplaySymbol as dependency for getCoffeeName


  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100 text-coffee-dark">
      {/* Header (unchanged) */}
      <div className="bg-gradient-to-r from-coffee-brown to-coffee-dark shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"> <div className="py-6"> <div className="flex items-center"> <Coffee className="h-10 w-10 text-amber-300 mr-4" /> <div> <h1 className="text-3xl font-bold text-cream"> {tokenDisplayName} Admin Dashboard </h1> <p className="text-sm text-amber-200 mt-1"> Loyalty program activity and smart contract overview for <span className="font-semibold">{tokenDisplaySymbol}</span>. </p> </div> </div> </div> </div>
      </div>

      {/* Navbar (unchanged) */}
      <nav className="bg-amber-50 shadow-sm border-b border-amber-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"> <div className="flex justify-start space-x-4"> {navItems.map((item) => ( <Button key={item.key} variant="ghost" onClick={() => setActiveTab(item.key)} className={`py-4 px-3 inline-flex items-center text-sm font-medium border-b-2 ${activeTab === item.key ? 'border-amber-600 text-amber-700' : 'border-transparent text-amber-600 hover:text-amber-800 hover:border-amber-300' }`} > {item.icon} {item.label} </Button> ))} </div> </div>
      </nav>

      {/* Main Content Area - Tab Specific */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isErrorOverview && ( /* ... Error display unchanged ... */ <Card className="mb-6 bg-red-50 border-red-200"> <CardHeader> <CardTitle className="text-red-700 flex items-center"><AlertCircle className="mr-2 h-5 w-5" /> Error Loading Overview Data</CardTitle> </CardHeader> <CardContent className="text-red-600"> <p>Failed to load some administrative data. Details:</p> <pre className="mt-2 p-2 bg-red-100 text-xs rounded">{overviewError?.message || 'Unknown error'}</pre> <p className="mt-2 text-sm">Some dashboard statistics might be unavailable or inaccurate. The backend server or Etherscan API might be temporarily unreachable or rate-limited.</p> </CardContent> </Card> )}

        {activeTab === 'dashboard' && (
          <section id="dashboard">
            <h2 className="text-2xl font-semibold text-coffee-dark mb-6">Token & Contract Health</h2>
            {/* StatCards (unchanged from previous version where demo data was removed) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard title="Total Tokens Minted" value={overviewData?.totalMinted ? parseFloat(overviewData.totalMinted).toLocaleString() : undefined} unit={tokenDisplaySymbol} icon={<TrendingUp className="h-6 w-6" />} description="All tokens created via mint function." isLoading={isLoadingOverview} />
              <StatCard title="Tokens Redeemed (to 0x0)" value={overviewData?.totalRedeemedToZeroAddress ? parseFloat(overviewData.totalRedeemedToZeroAddress).toLocaleString() : undefined} unit={tokenDisplaySymbol} icon={<Zap className="h-6 w-6" />} description="Tokens sent to the zero address." isLoading={isLoadingOverview} />
              <StatCard title="Unique Token Holders" value={overviewData?.numberOfHolders?.toLocaleString()} icon={<UsersRound className="h-6 w-6" />} description="Approx. wallets holding tokens." isLoading={isLoadingOverview} />
              <StatCard title="Total Contract Interactions" value={overviewData?.totalContractTransactions?.toLocaleString()} icon={<Activity className="h-6 w-6" />} description="All txns involving contract address." isLoading={isLoadingOverview} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Mint vs Burn Chart (unchanged) */}
              <Card className="bg-amber-50 rounded-lg shadow-md border border-amber-200"> <CardHeader> <CardTitle className="text-amber-800 text-lg">Token Mint vs. Redeemed Activity</CardTitle> <CardDescription className="text-amber-600">Overall token creation and redemption to 0x0 address.</CardDescription> </CardHeader> <CardContent className="h-[350px] pt-4"> {isLoadingOverview && !overviewData ? (<Skeleton className="w-full h-full bg-amber-200" />) : ( <ResponsiveContainer width="100%" height="100%"> <BarChart data={barChartDataMintBurn} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}> <CartesianGrid strokeDasharray="3 3" stroke="#e0c9a0" /> <XAxis dataKey="name" tick={{ fill: '#78350F', fontSize: 14 }} /> <YAxis tick={{ fill: '#78350F', fontSize: 12 }} allowDecimals={false} /> <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 253, 250, 0.9)', borderColor: '#d1a05a', borderRadius: '0.5rem' }} itemStyle={{ color: '#78350F' }} cursor={{ fill: 'rgba(234, 179, 8, 0.1)' }} /> <Legend wrapperStyle={{ color: '#78350F', paddingTop: '10px' }} /> <Bar dataKey="Tokens Minted" fill="#A16207" radius={[4, 4, 0, 0]} /> <Bar dataKey="Tokens Redeemed (to 0x0)" fill="#D97706" radius={[4, 4, 0, 0]} /> </BarChart> </ResponsiveContainer> )} </CardContent> </Card>

              {/* Mint Transaction Value Distribution Chart */}
              <Card className="bg-amber-50 rounded-lg shadow-md border border-amber-200">
                <CardHeader>
                  <CardTitle className="text-amber-800 text-lg">Mint Transaction Value Distribution</CardTitle>
                  <CardDescription className="text-amber-600">Distribution of tokens per mint transaction (from recent history).</CardDescription>
                </CardHeader>
                <CardContent className="h-[350px] pt-4">
                  {isLoadingAllInteractionsForChart && !mintDistributionChartData.length ? (
                    <Skeleton className="w-full h-full bg-amber-200" />
                  ) : !mintDistributionChartData.length ? (
                    <div className="flex items-center justify-center h-full text-amber-700">
                      No mint transactions found in recent history.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={mintDistributionChartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5, /* Adjusted left margin for YAxis labels */ }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0c9a0" />
                        <XAxis type="number" tick={{ fill: '#78350F', fontSize: 12 }} allowDecimals={false} />
                        <YAxis dataKey="name" type="category" tick={{ fill: '#78350F', fontSize: 10 }} width={180} /* Increased width for longer names */ interval={0} />
                        <Tooltip
                          contentStyle={{ backgroundColor: 'rgba(255, 253, 250, 0.9)', borderColor: '#d1a05a', borderRadius: '0.5rem' }}
                          itemStyle={{ color: '#78350F' }}
                          formatter={(value: number, nameKey: string) => {
                            const formattedValue = value.toLocaleString();
                            if (nameKey === 'Number of Mints') return [formattedValue, 'Mint Events'];
                            if (nameKey === 'Total Tokens') return [`${formattedValue} ${tokenDisplaySymbol}`, 'Total Tokens'];
                            return [formattedValue, nameKey];
                          }}
                        />
                        <Legend wrapperStyle={{ color: '#78350F', paddingTop: '10px' }}/>
                        <Bar dataKey="Number of Mints" name="Mint Events" fill="#B45309" radius={[0, 4, 4, 0]} />
                        {/* <Bar dataKey="Total Tokens" fill="#A16207" radius={[0, 4, 4, 0]} /> */} {/* You can add this back if preferred */}
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {activeTab === 'details' && ( /* ... Details tab unchanged ... */ <section id="contract-details"> <h2 className="text-2xl font-semibold text-coffee-dark mb-6">Core Contract & Token Details</h2> <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"> <StatCard title="Token Name" value={overviewData?.tokenName} icon={<Award className="h-6 w-6" />} isLoading={isLoadingOverview} /> <StatCard title="Token Symbol" value={overviewData?.tokenSymbol} icon={<Award className="h-6 w-6" />} isLoading={isLoadingOverview} /> <StatCard title="Live Total Supply" value={overviewData?.totalSupply ? parseFloat(overviewData.totalSupply).toLocaleString() : undefined} unit={tokenDisplaySymbol} icon={<Package className="h-6 w-6" />} isLoading={isLoadingOverview} description="Current circulating supply (RPC)." /> <StatCard title="Contract Address" value={overviewData?.contractAddress ? `${overviewData.contractAddress.substring(0, 10)}...${overviewData.contractAddress.substring(overviewData.contractAddress.length - 8)}` : undefined} icon={<FileText className="h-6 w-6" />} isLoading={isLoadingOverview} description="Sepolia Network." link={overviewData?.contractAddress ? `${ETHERSCAN_BASE_URL_SEPOLIA}/address/${overviewData.contractAddress}` : undefined} linkText="View Contract" /> <StatCard title="Creator Address" value={overviewData?.creatorAddress ? `${overviewData.creatorAddress.substring(0, 10)}...${overviewData.creatorAddress.substring(overviewData.creatorAddress.length - 8)}` : "N/A"} icon={<Users className="h-6 w-6" />} isLoading={isLoadingOverview} link={overviewData?.creatorAddress ? `${ETHERSCAN_BASE_URL_SEPOLIA}/address/${overviewData.creatorAddress}` : undefined} linkText="View Creator" /> <StatCard title="Creation Transaction" value={overviewData?.creationTxHash ? `${overviewData.creationTxHash.substring(0, 10)}...${overviewData.creationTxHash.substring(overviewData.creationTxHash.length - 8)}` : "N/A"} icon={<FileText className="h-6 w-6" />} isLoading={isLoadingOverview} link={overviewData?.creationTxHash ? `${ETHERSCAN_BASE_URL_SEPOLIA}/tx/${overviewData.creationTxHash}` : undefined} linkText="View Tx" /> </div> </section> )}
        {activeTab === 'transactions' && ( /* ... Transactions tab unchanged ... */ <section id="transactions"> <h2 className="text-2xl font-semibold text-coffee-dark mb-6">Recent Contract Interactions (Last 10)</h2> <Card className="shadow-md bg-amber-50 border-amber-200"> <CardHeader> <CardTitle className="text-amber-900">Latest On-Chain Transactions</CardTitle> <CardDescription className="text-amber-700"> Recent interactions with the {tokenDisplaySymbol} smart contract address. {isErrorRecentInteractions && <span className="text-red-600"> Error loading: {recentInteractionsError?.message}</span>} </CardDescription> </CardHeader> <CardContent> {isLoadingRecentInteractions && ( <div className="space-y-2 pt-2"> {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md bg-amber-200" />)} </div> )} {isErrorRecentInteractions && !isLoadingRecentInteractions && ( <div className="text-red-700 p-4 bg-red-100 rounded-md flex items-center"> <ServerCrash className="mr-2 h-5 w-5" /> Failed to load contract interactions. </div> )} {!isLoadingRecentInteractions && !isErrorRecentInteractions && recentInteractionsData && recentInteractionsData.length > 0 && ( <Table> <TableHeader> <TableRow className="border-amber-300"> <TableHead className="w-[150px] text-amber-800">Tx Hash</TableHead> <TableHead className="text-amber-800">Function Called</TableHead> <TableHead className="text-amber-800">Caller (From)</TableHead> <TableHead className="text-amber-800">Block</TableHead> <TableHead className="text-amber-800">Timestamp</TableHead> <TableHead className="text-right text-amber-800">Status</TableHead> </TableRow> </TableHeader> <TableBody> {recentInteractionsData.map((tx) => ( <TableRow key={tx.hash} className="border-amber-200 hover:bg-amber-100"> <TableCell className="font-mono text-xs text-amber-700"> <a href={`${ETHERSCAN_BASE_URL_SEPOLIA}/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:text-amber-800 hover:underline"> {tx.hash.substring(0, 8)}...{tx.hash.substring(tx.hash.length - 6)} </a> </TableCell> <TableCell> <Badge variant={tx.functionName?.includes("(...)") || !tx.functionName?.includes("Unknown") ? "default" : "secondary"} className={`font-mono text-xs whitespace-nowrap ${tx.functionName?.includes("(...)") || (!tx.functionName?.includes("Unknown") && !tx.functionName?.includes("ETH Transfer") && !tx.functionName?.includes("Direct Call")) ? 'bg-amber-600 text-white' : 'bg-amber-200 text-amber-800'}`}> {tx.functionName || (tx.input === "0x" ? "Value Transfer" : "Unknown Interaction")} </Badge> </TableCell> <TableCell className="font-mono text-xs text-amber-700"> <a href={`${ETHERSCAN_BASE_URL_SEPOLIA}/address/${tx.from}`} target="_blank" rel="noopener noreferrer" className="text-amber-600 hover:text-amber-800 hover:underline"> {tx.from.substring(0, 6)}...{tx.from.substring(tx.from.length - 4)} </a> </TableCell> <TableCell className="text-amber-700">{parseInt(tx.blockNumber).toLocaleString()}</TableCell> <TableCell className="text-xs text-amber-700">{new Date(parseInt(tx.timeStamp) * 1000).toLocaleString()}</TableCell> <TableCell className="text-right"> <Badge variant={tx.isError === "0" ? "outline" : "destructive"} className={tx.isError === "0" ? "border-green-500 bg-green-100 text-green-800" : "border-red-500 bg-red-100 text-red-800"}> {tx.isError === "0" ? "Success" : "Error"} </Badge> </TableCell> </TableRow> ))} </TableBody> </Table> )} {!isLoadingRecentInteractions && !isErrorRecentInteractions && (!recentInteractionsData || recentInteractionsData.length === 0) && ( <p className="text-amber-700 text-center py-4">No recent contract interactions found.</p> )} </CardContent> </Card> </section> )}

        <div className="mt-12 text-center">
          <p className="text-sm text-amber-700"> Dashboard data sourced from RPC calls and Etherscan API. Some aggregated data might be based on a limited history scan. Last data refresh attempted: {new Date().toLocaleTimeString()} </p>
        </div>
      </div>
    </div>
  );
};
export default CoffeeShopAdminDashboard;