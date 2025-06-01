// frontend/SuperAdminDashboard.tsx
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  Users, ShoppingCart, Coins, Store, TrendingUp, DollarSign, Activity, BarChart3, UsersRound, Zap, AlertCircle, ServerCrash
} from 'lucide-react';
import {
  BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';

// --- Interfaces for API data (from our CoffeeCoin backend) ---
interface CoffeeCoinAdminOverview {
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

// --- API Fetching Functions ---
const API_BASE_URL = '/api/admin';

const fetchCoffeeCoinOverview = async (): Promise<CoffeeCoinAdminOverview> => {
  console.log('[SuperAdminDashboard] Fetching CoffeeCoin Overview from:', `${API_BASE_URL}/contract-overview`);
  const { data } = await axios.get(`${API_BASE_URL}/contract-overview`);
  console.log('[SuperAdminDashboard] Received CoffeeCoin Overview:', data);
  return data;
};

// --- StatCard Component ---
interface StatCardProps {
  title: string;
  value: string | undefined; // Allow undefined for N/A case before loading
  icon: React.ReactNode;
  subtitle?: string;
  trend?: string;
  isLoading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, subtitle, trend, isLoading }) => (
  <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow duration-200 min-h-[160px] flex flex-col justify-between">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
        {isLoading ? (
          <div className="h-9 w-3/4 bg-gray-200 rounded animate-pulse mb-2"></div>
        ) : (
          <p className="text-3xl font-bold text-gray-900 mb-2">{value ?? 'N/A'}</p>
        )}
        {isLoading ? (
            <div className="h-4 w-1/2 bg-gray-200 rounded animate-pulse"></div>
        ) : subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
      <div className="text-blue-600 opacity-80 ml-2">
        {icon}
      </div>
    </div>
    {isLoading ? (
        <div className="h-4 w-1/3 bg-gray-200 rounded animate-pulse mt-1"></div>
    ) : trend && <p className="text-sm text-green-600 font-medium mt-1">{trend}</p>}
  </div>
);

// --- Retailer Data (Placeholder - will be removed or significantly changed for real data) ---
// For now, we'll remove direct usage of this static data for charts that should be dynamic.
interface Retailer {
  id: number;
  name: string;
  // These would come from a separate DB for a true multi-retailer platform
  // coinsIssued: number;
  // activeCustomers: number;
  // totalOrders: number;
  status: 'Active' | 'Inactive';
  joinedDate: string;
}

const staticRetailersPlaceholder: Retailer[] = [
  { id: 1, name: "CoffeeBrew.com", status: 'Active', joinedDate: '2025-05-28' },
];


const SuperAdminDashboard: React.FC = () => {
  const {
    data: coffeeCoinData,
    isLoading: isLoadingCoffeeCoin,
    isError: isErrorCoffeeCoin,
    error: coffeeCoinError
  } = useQuery<CoffeeCoinAdminOverview, Error>({
    queryKey: ['coffeeCoinAdminOverviewForSuperAdmin'],
    queryFn: fetchCoffeeCoinOverview,
    refetchInterval: 60000,
  });

  const platformCoinSymbol = coffeeCoinData?.tokenSymbol || 'Coins';
  const platformCoinName = coffeeCoinData?.tokenName || 'Platform Loyalty';

  // --- Chart Data - Attempt to use real data or show loading/no data ---

  // Monthly Growth: Needs time-series data from backend. For now, very simplified or removed.
  // We can't create a meaningful growth trend from a single snapshot API.
  // Let's show a simple bar chart of current Minted vs Redeemed instead of a line trend.
  const platformActivityData = React.useMemo(() => {
    if (!coffeeCoinData) return [];
    return [
      { name: 'Total Minted', value: parseFloat(coffeeCoinData.totalMinted || '0'), fill: '#10B981' },
      { name: `Total Redeemed (to 0x0)`, value: parseFloat(coffeeCoinData.totalRedeemedToZeroAddress || '0'), fill: '#F59E0B' },
    ];
  }, [coffeeCoinData]);

  // Retailer Status Distribution: This still relies on some retailer data.
  // For now, it will use the placeholder retailer count.
  const retailerStatusData = React.useMemo(() => [
    { name: 'Active Retailers', value: staticRetailersPlaceholder.filter(r => r.status === 'Active').length, color: '#10B981' },
    { name: 'Inactive Retailers', value: staticRetailersPlaceholder.filter(r => r.status === 'Inactive').length, color: '#EF4444' }
  ], []); // No dependency on API for this placeholder


  const formatNumber = (numStr: string | number | undefined): string | undefined => {
    if (numStr === undefined || numStr === null) return undefined; // Return undefined for StatCard to show N/A
    const num = typeof numStr === 'string' ? parseFloat(numStr) : numStr;
    if (isNaN(num)) return undefined;
    return num.toLocaleString();
  };

  const formatCoinValue = (numStr: string | number | undefined, symbol: string = ""): string | undefined => {
    const formattedNum = formatNumber(numStr);
    if (formattedNum === undefined) return undefined;
    return `${formattedNum} ${symbol}`;
  };


  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-screen-xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-1">
            {platformCoinName} Super Admin Overview
          </h1>
          <p className="text-lg text-gray-600">
            Monitoring the overall health and activity of the {platformCoinSymbol} loyalty token.
          </p>
        </div>

        {/* Platform Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
          <StatCard
            title={`Total ${platformCoinSymbol} Minted`}
            value={formatNumber(coffeeCoinData?.totalMinted)}
            icon={<TrendingUp size={48} />}
            subtitle="Platform total creation"
            isLoading={isLoadingCoffeeCoin}
          />
          <StatCard
            title="Unique Token Holders"
            value={formatNumber(coffeeCoinData?.numberOfHolders)}
            icon={<UsersRound size={48} />}
            subtitle="Wallets holding tokens"
            isLoading={isLoadingCoffeeCoin}
          />
          <StatCard
            title="Contract Interactions"
            value={formatNumber(coffeeCoinData?.totalContractTransactions)}
            icon={<Activity size={48} />}
            subtitle={`Total txns with contract`}
            isLoading={isLoadingCoffeeCoin}
          />
          <StatCard
            title={`${platformCoinSymbol} Redeemed`}
            value={formatCoinValue(coffeeCoinData?.totalRedeemedToZeroAddress, platformCoinSymbol)}
            icon={<Zap size={48} />}
            subtitle="Tokens sent to 0x0 (burned)"
            isLoading={isLoadingCoffeeCoin}
          />
          <StatCard // This remains conceptual / uses placeholder count for now
            title="Registered Retailers"
            value={formatNumber(staticRetailersPlaceholder.length)}
            icon={<Store size={48} />}
            subtitle="Onboarded (demo count)"
            isLoading={false}
          />
        </div>

        {isErrorCoffeeCoin && (
            <Card className="mb-6 bg-red-100 border-red-300">
                <CardHeader>
                    <CardTitle className="text-red-700 flex items-center">
                        <AlertCircle className="mr-2 h-5 w-5" /> API Error
                    </CardTitle>
                </CardHeader>
                <CardContent className="text-red-600">
                    <p>Failed to load platform token data from the backend.</p>
                    <p className="text-sm mt-1">Details: {coffeeCoinError?.message || "Unknown API error."}</p>
                    <p className="text-sm mt-2">Please check the backend server and network connectivity.</p>
                </CardContent>
            </Card>
        )}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="mr-3 text-indigo-600" size={24} />
              Token Activity Overview
            </h3>
            <div className="h-80">
              {isLoadingCoffeeCoin ? (<div className="flex items-center justify-center h-full"><ServerCrash className="w-12 h-12 text-gray-300 animate-pulse" /></div>) :
               !platformActivityData.length || platformActivityData.every(d => d.value === 0) ? (<div className="flex items-center justify-center h-full text-gray-500">No token activity data available.</div>) :
              (
                <ResponsiveContainer width="100%" height="100%">
                  <ReBarChart data={platformActivityData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip formatter={(value) => `${formatNumber(value as number)} ${platformCoinSymbol}`} />
                    <Legend />
                    <Bar dataKey="value" name="Count" radius={[0, 4, 4, 0]} /> {/* 'fill' is handled by data item */}
                  </ReBarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Store className="mr-3 text-blue-600" size={24} />
              Retailer Status (Placeholder)
            </h3>
            <div className="h-80">
              { // This chart uses placeholder data, so no loading state from API
                !retailerStatusData.length ? (<div className="flex items-center justify-center h-full text-gray-500">No retailer status data.</div>) :
                (
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                    <Pie
                        data={retailerStatusData}
                        cx="50%" cy="50%" outerRadius={100} fill="#8884d8" dataKey="value"
                        label={({ name, value, percent }) => `${name}: ${(percent * 100).toFixed(0)}% (${value})`}
                    >
                        {retailerStatusData.map((entry) => (
                        <Cell key={`cell-${entry.name}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                    </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>


        {/* Retailers Overview Table (still using placeholder data) */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Store className="mr-3 text-blue-600" size={28} />
              Retailer List (Placeholder Data)
            </h2>
            <p className="text-gray-600 mt-1">This section requires a separate backend for retailer management.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Retailer Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {staticRetailersPlaceholder.map((retailer) => (
                  <tr key={retailer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{retailer.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        retailer.status === 'Active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {retailer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {new Date(retailer.joinedDate).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {/* Remove additional platform insights if they can't be populated */}
      </div>
    </div>
  );
};

export default SuperAdminDashboard;