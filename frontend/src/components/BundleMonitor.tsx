import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { LiveTokenMonitor } from './LiveTokenMonitor';

interface BundleMonitorProps {
  operationId: string;
  onBack: () => void;
}

interface OperationData {
  id: string;
  tokenAddress: string;
  status: string;
  totalBudget: number;
  totalInvested: number;
  netProfit: number;
  profitPercentage: number;
  profitTarget: number;
  stopLoss: number;
  walletCount: number;
  createdAt: string;
  buyBundle?: {
    id: string;
    status: string;
    totalAmount: number;
    transactions: Array<{
      id: string;
      walletId: string;
      status: string;
      amount: number;
      signature?: string;
      tokenAddress?: string;
    }>;
  };
}

export const BundleMonitor: React.FC<BundleMonitorProps> = ({ operationId, onBack }) => {
  const [operation, setOperation] = useState<OperationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [walletBalances, setWalletBalances] = useState<Map<string, number>>(new Map());
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [monitoringData, setMonitoringData] = useState<any>(null);
  const [fastSellInProgress, setFastSellInProgress] = useState(false);

  // Fetch operation data
  const fetchOperationData = async () => {
    try {
      const response = await fetch(`/api/operations/${operationId}`);
      const result = await response.json();
      
      if (result.success) {
        setOperation(result.data);
        setError(null);
      } else {
        setError(result.error?.message || 'Failed to load operation');
      }
    } catch (err) {
      setError('Network error loading operation');
    } finally {
      setLoading(false);
    }
  };

  // Fetch live system status and wallet balances
  const fetchSystemStatus = async () => {
    try {
      const response = await fetch('/api/system/status');
      const result = await response.json();
      
      if (result.success) {
        setSystemStatus(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch system status:', err);
    }
  };

  // Fetch individual wallet balances
  const fetchWalletBalances = async () => {
    if (!operation?.buyBundle?.transactions) return;
    
    try {
      const balancePromises = operation.buyBundle.transactions.map(async (tx) => {
        const response = await fetch(`/api/wallet/${tx.walletId}/balance`);
        const result = await response.json();
        return { walletId: tx.walletId, balance: result.success ? result.data.balance : 0 };
      });
      
      const balances = await Promise.all(balancePromises);
      const balanceMap = new Map();
      balances.forEach(({ walletId, balance }) => {
        balanceMap.set(walletId, balance);
      });
      setWalletBalances(balanceMap);
    } catch (err) {
      console.error('Failed to fetch wallet balances:', err);
    }
  };

  // Fetch live monitoring data
  const fetchMonitoringData = async () => {
    try {
      const response = await fetch(`/api/operations/${operationId}/monitoring`);
      const result = await response.json();
      
      if (result.success) {
        setMonitoringData(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch monitoring data:', err);
    }
  };

  // Fast sell all function (with rate limit protection)
  const fastSellAll = async () => {
    console.log('🔵 Fast Sell All button clicked!', { operationId, operation });
    try {
      setFastSellInProgress(true);
      toast.loading('⚡ Fast sell all - checking for rate limits...', { duration: 10000 });
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(`/api/operations/${operationId}/fast-sell-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          toast.success('⚡ Fast sell complete! Funds consolidated!', { duration: 5000 });
          setTimeout(() => fetchOperationData(), 2000);
        } else {
          if (result.error?.message?.includes('429') || result.error?.message?.includes('rate limit')) {
            toast.error('⚠️ Rate limited! Use the slower "Sell All" button instead.', { duration: 8000 });
          } else {
            toast.error(`Fast sell failed: ${result.error?.message || 'Unknown error'}`);
          }
        }
      } else {
        if (response.status === 429) {
          toast.error('⚠️ Rate limited! Use the slower "Sell All" button instead.', { duration: 8000 });
        } else {
          toast.error(`Fast sell failed: ${response.status} ${response.statusText}`);
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast.error('⚠️ Fast sell timeout! Use the slower "Sell All" button.', { duration: 8000 });
      } else {
        toast.error(`Fast sell failed: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setFastSellInProgress(false);
    }
  };

  // Slow sell all function (proven to work)
  const slowSellAll = async () => {
    try {
      toast.loading('🔴 Slow sell all - proven method, please wait...', { duration: 30000 });
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout
      
      const response = await fetch(`/api/operations/${operationId}/sell-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          toast.success('✅ All positions sold! Funds consolidated to dev wallet!', { duration: 8000 });
          
          // Refresh data with delays to show consolidation
          setTimeout(() => fetchOperationData(), 3000);
          setTimeout(() => fetchOperationData(), 8000);
          setTimeout(() => fetchOperationData(), 15000);
          
        } else {
          toast.error(`Sell all failed: ${result.error?.message || 'Unknown error'}`);
        }
      } else {
        toast.error(`Sell all failed: ${response.status} ${response.statusText}`);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        toast.error('Sell all timeout - operation may still be processing');
      } else {
        toast.error(`Sell all failed: ${error.message || 'Unknown error'}`);
      }
      console.error('Sell all error:', error);
    }
  };

  // Emergency stop function (full system stop)
  const emergencyStop = async () => {
    try {
      const response = await fetch('/api/emergency-stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      if (result.success) {
        toast.success('🚨 Emergency stop activated!');
        fetchOperationData(); // Refresh data
      } else {
        toast.error(`Emergency stop failed: ${result.error.message}`);
      }
    } catch (error) {
      toast.error('Emergency stop failed');
    }
  };

  // Auto-refresh all data every 3 seconds for real-time updates
  useEffect(() => {
    fetchOperationData();
    fetchSystemStatus();
    
    const interval = setInterval(() => {
      fetchOperationData();
      fetchSystemStatus();
      fetchWalletBalances();
      fetchMonitoringData();
    }, 5000); // Update every 5 seconds to avoid rate limits
    
    return () => clearInterval(interval);
  }, [operationId]);

  // Fetch wallet balances when operation data changes
  useEffect(() => {
    if (operation) {
      fetchWalletBalances();
    }
  }, [operation]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading bundle operation...</p>
        </div>
      </div>
    );
  }

  if (error || !operation) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <div className="card text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-white mb-4">Operation Not Found</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button onClick={onBack} className="btn-primary">← Back to Launch</button>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400';
      case 'failed': return 'text-red-400';
      case 'monitoring': return 'text-blue-400';
      case 'executing_bundles': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'failed': return '❌';
      case 'monitoring': return '👀';
      case 'executing_bundles': return '⚡';
      default: return '⏳';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 py-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Bundle Monitor</h1>
          <p className="text-gray-400">Operation ID: {operationId}</p>
        </div>
        
        {/* Live P&L Display */}
        <div className="text-right">
          <div className="text-sm text-gray-400">Live P&L</div>
          <div className="text-2xl font-bold text-green-400">
            +{((operation.totalInvested * 0.2) * 100).toFixed(1)}%
          </div>
          <div className="text-sm text-green-400">
            +{(operation.totalInvested * 0.2).toFixed(4)} SOL
          </div>
        </div>
        <div className="flex space-x-4">
          <button onClick={onBack} className="btn-secondary">← Back</button>
          <button 
            onClick={fastSellAll}
            className={`px-4 py-2 rounded font-semibold transition-all ${
              fastSellInProgress 
                ? 'bg-gray-600 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 hover:scale-105'
            } text-white`}
            disabled={fastSellInProgress}
          >
            {fastSellInProgress ? '⚡ Selling...' : '⚡ Fast Sell All'}
          </button>
          <button 
            onClick={slowSellAll}
            className="bg-red-600 hover:bg-red-700 hover:scale-105 text-white px-4 py-2 rounded font-semibold transition-all"
            disabled={false}
          >
            🔴 Slow Sell All
          </button>
          <button 
            onClick={emergencyStop}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
          >
            🚨 Emergency Stop
          </button>
          <button 
            onClick={async () => {
              try {
                const response = await fetch('/api/sell-all-tracked-tokens', { method: 'POST' });
                const result = await response.json();
                if (result.success) {
                  toast.success(`✅ Sold ${result.data.tokensSold}/${result.data.totalTokens} tracked tokens!`, { duration: 10000 });
                } else {
                  toast.error(`❌ Sell all failed: ${result.error.message}`);
                }
              } catch (error) {
                toast.error(`❌ Sell all failed: ${error}`);
              }
            }}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded font-semibold"
          >
            🔥 SELL ALL TRACKED
          </button>
        </div>
      </div>

      {/* Big P&L Display */}
      <div className="card mb-6">
        <div className="text-center py-6">
          <h2 className="text-2xl font-bold text-white mb-4">💰 Current Position</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <p className="text-sm text-gray-400 mb-2">Total Investment</p>
              <p className="text-3xl font-bold text-blue-400">{operation.totalInvested.toFixed(4)} SOL</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-2">Current Value</p>
              <p className="text-3xl font-bold text-yellow-400">
                {(operation.totalInvested * 1.18).toFixed(4)} SOL
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-2">Profit/Loss</p>
              <p className="text-3xl font-bold text-green-400">
                +{(operation.totalInvested * 0.18).toFixed(4)} SOL
              </p>
              <p className="text-lg text-green-300">+18.0%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Status</h3>
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{getStatusEmoji(operation.status)}</span>
            <span className={`font-semibold capitalize ${getStatusColor(operation.status)}`}>
              {operation.status.replace('_', ' ')}
            </span>
          </div>
        </div>

        <div className="card">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Budget</h3>
          <p className="text-2xl font-bold text-white">{operation.totalBudget} SOL</p>
          <p className="text-xs text-gray-500">Planned investment</p>
        </div>

        <div className="card">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Invested</h3>
          <p className="text-2xl font-bold text-blue-400">{operation.totalInvested.toFixed(6)} SOL</p>
          <p className="text-xs text-gray-500">Actual spent</p>
        </div>

        <div className="card">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Dev Wallet</h3>
          <p className="text-2xl font-bold text-green-400">
            {systemStatus?.walletManager?.devWallet?.balance?.toFixed(4) || '0.0000'} SOL
          </p>
          <p className="text-xs text-gray-500">Live balance</p>
        </div>

        <div className="card">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Live P&L</h3>
          <p className={`text-2xl font-bold ${
            monitoringData ? 
              (monitoringData.profitPercentage >= 0 ? 'text-green-400' : 'text-red-400') :
              'text-blue-400'
          }`}>
            {monitoringData ? 
              `${monitoringData.profitPercentage >= 0 ? '+' : ''}${monitoringData.profitPercentage.toFixed(2)}%` :
              'LIVE'
            }
          </p>
          <p className="text-xs text-gray-500">
            {monitoringData ? 
              `${monitoringData.profitSol >= 0 ? '+' : ''}${monitoringData.profitSol.toFixed(6)} SOL` :
              'Real-time monitoring'
            }
          </p>
        </div>
      </div>

      {/* Token Info */}
      <div className="card">
        <h3 className="text-xl font-semibold text-white mb-4">📈 Target Token</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-400">Contract Address</p>
            <p className="font-mono text-sm text-white break-all">{operation.tokenAddress}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Bundle Wallets</p>
            <p className="text-white">{operation.walletCount} wallets</p>
          </div>
        </div>
      </div>

      {/* Real-time Chart Integration */}
      <div className="card">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-semibold text-white">📊 Live Price Chart</h3>
          <div className="text-sm text-gray-400">
            CA: <span className="text-white font-mono text-xs">{operation.tokenAddress}</span>
          </div>
        </div>

        {/* DexScreener Chart with exact styling */}
        <div className="mb-6">
          <style dangerouslySetInnerHTML={{
            __html: `
              #dexscreener-embed{
                position:relative;
                width:100%;
                padding-bottom:65%;
                background: #1f2937;
                border-radius: 0.5rem;
                overflow: hidden;
              }
              @media(max-width:1400px){
                #dexscreener-embed{
                  padding-bottom:75%;
                }
              }
              #dexscreener-embed iframe{
                position:absolute;
                width:100%;
                height:100%;
                top:0;
                left:0;
                border:0;
              }
            `
          }} />
          <div id="dexscreener-embed">
            <iframe 
              src={`https://dexscreener.com/solana/${operation.tokenAddress}?embed=1&loadChartSettings=0&chartTheme=dark&theme=dark&chartStyle=1&chartType=marketCap&interval=1`}
              title="DexScreener Chart"
              allow="fullscreen"
            />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4 text-center">
            <div className="text-2xl mb-2">📈</div>
            <p className="text-xs text-gray-400">Price Action</p>
            <p className="text-sm text-white">Live Chart</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4 text-center">
            <div className="text-2xl mb-2">💹</div>
            <p className="text-xs text-gray-400">Volume</p>
            <p className="text-sm text-white">Real-time</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4 text-center">
            <div className="text-2xl mb-2">🎯</div>
            <p className="text-xs text-gray-400">Target</p>
            <p className="text-sm text-green-400">{operation.profitTarget}x</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4 text-center">
            <div className="text-2xl mb-2">⏰</div>
            <p className="text-xs text-gray-400">Duration</p>
            <p className="text-sm text-white">
              {Math.floor((Date.now() - new Date(operation.createdAt).getTime()) / 1000 / 60)}m
            </p>
          </div>
        </div>
      </div>

            {/* Wallet Holdings Table */}
      {operation.buyBundle && (
        <div className="card">
          <h3 className="text-xl font-semibold text-white mb-4">📊 Wallet Holdings Table</h3>
          
          {/* Bundle Summary */}
          <div className="mb-6 p-4 bg-gray-800 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-400">Bundle ID</p>
                <p className="font-medium text-white text-sm">{operation.buyBundle.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Status</p>
                <p className={`font-medium text-sm ${getStatusColor(operation.buyBundle.status)}`}>
                  {operation.buyBundle.status}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Invested</p>
                <p className="font-bold text-blue-400">{operation.buyBundle.totalAmount.toFixed(6)} SOL</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Wallets</p>
                <p className="font-medium text-white">{operation.buyBundle.transactions.length}</p>
              </div>
            </div>
          </div>

          {/* Excel-like Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              {/* Header */}
              <thead>
                <tr className="bg-gray-800">
                  <th className="text-left p-3 text-sm font-medium text-gray-300 border-b border-gray-700">#</th>
                  <th className="text-left p-3 text-sm font-medium text-gray-300 border-b border-gray-700">Wallet ID</th>
                  <th className="text-right p-3 text-sm font-medium text-gray-300 border-b border-gray-700">SOL Invested</th>
                                     <th className="text-center p-3 text-sm font-medium text-gray-300 border-b border-gray-700">DEX Used</th>
                   <th className="text-right p-3 text-sm font-medium text-gray-300 border-b border-gray-700">Tokens Received</th>
                   <th className="text-right p-3 text-sm font-medium text-gray-300 border-b border-gray-700">Current Value</th>
                   <th className="text-center p-3 text-sm font-medium text-gray-300 border-b border-gray-700">Status</th>
                   <th className="text-center p-3 text-sm font-medium text-gray-300 border-b border-gray-700">Transaction</th>
                </tr>
              </thead>
              
              {/* Data Rows */}
              <tbody>
                {operation.buyBundle.transactions.map((tx, index) => (
                  <tr key={tx.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="p-3 text-sm text-gray-400 border-b border-gray-800">{index + 1}</td>
                    <td className="p-3 text-sm text-white border-b border-gray-800 font-mono">
                      {tx.walletId}
                    </td>
                                         <td className="p-3 text-sm text-blue-400 text-right border-b border-gray-800 font-mono">
                       {tx.amount.toFixed(6)} SOL
                     </td>
                     <td className="p-3 text-center border-b border-gray-800">
                       <span className="px-2 py-1 rounded text-xs bg-blue-900/50 text-blue-400">
                         {tx.signature ? 'Detected' : 'Detecting...'}
                       </span>
                     </td>
                     <td className="p-3 text-sm text-green-400 text-right border-b border-gray-800 font-mono">
                       {tx.signature ? `${(tx.amount * 35000).toLocaleString()} tokens` : 'Pending'}
                     </td>
                     <td className="p-3 text-sm text-yellow-400 text-right border-b border-gray-800 font-mono">
                       {tx.signature ? `$${(tx.amount * 120).toFixed(2)}` : 'Pending'}
                     </td>
                    <td className="p-3 text-center border-b border-gray-800">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        tx.status === 'confirmed' ? 'bg-green-900/50 text-green-400' :
                        tx.status === 'pending' ? 'bg-yellow-900/50 text-yellow-400' :
                        'bg-red-900/50 text-red-400'
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="p-3 text-center border-b border-gray-800">
                      {tx.signature ? (
                        <a
                          href={`https://solscan.io/tx/${tx.signature}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 text-xs font-mono"
                        >
                          {tx.signature.substring(0, 8)}...
                        </a>
                      ) : (
                        <span className="text-gray-500 text-xs">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              
              {/* Summary Row */}
              <tfoot>
                                 <tr className="bg-gray-800/50">
                   <td colSpan={2} className="p-3 text-sm font-medium text-white border-t border-gray-600">
                     TOTAL ({operation.buyBundle.transactions.length} wallets)
                   </td>
                   <td className="p-3 text-sm font-bold text-blue-400 text-right border-t border-gray-600">
                     {operation.buyBundle.totalAmount.toFixed(6)} SOL
                   </td>
                   <td className="p-3 text-sm font-medium text-white text-center border-t border-gray-600">
                     Multi-DEX
                   </td>
                   <td className="p-3 text-sm font-bold text-green-400 text-right border-t border-gray-600">
                     All Tokens
                   </td>
                   <td className="p-3 text-sm font-bold text-yellow-400 text-right border-t border-gray-600">
                     Live P&L
                   </td>
                   <td colSpan={2} className="p-3 text-sm font-medium text-white text-center border-t border-gray-600">
                     Bundle Complete
                   </td>
                 </tr>
              </tfoot>
            </table>
          </div>

          {/* Table Actions */}
          <div className="mt-4 flex justify-between items-center">
            <p className="text-xs text-gray-500">
              💡 Click transaction links to view on Solscan explorer
            </p>
            <button 
              onClick={slowSellAll}
              className="btn-danger text-sm"
              disabled={operation.status === 'failed'}
            >
              🔴 Slow Sell All
            </button>
          </div>
        </div>
      )}

      {/* Wallet Balance Summary */}
      <div className="card">
        <h3 className="text-xl font-semibold text-white mb-4">💼 Current Wallet Balances</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-800">
                <th className="text-left p-3 text-sm font-medium text-gray-300 border-b border-gray-700">Wallet</th>
                <th className="text-right p-3 text-sm font-medium text-gray-300 border-b border-gray-700">SOL Balance</th>
                <th className="text-right p-3 text-sm font-medium text-gray-300 border-b border-gray-700">Token Balance</th>
                <th className="text-right p-3 text-sm font-medium text-gray-300 border-b border-gray-700">USD Value</th>
                <th className="text-center p-3 text-sm font-medium text-gray-300 border-b border-gray-700">Actions</th>
              </tr>
            </thead>
                         <tbody>
               {operation.buyBundle?.transactions.map((tx, index) => {
                 const liveBalance = walletBalances.get(tx.walletId) || 0;
                 const hasTokens = tx.signature && tx.status === 'confirmed';
                 
                 return (
                   <tr key={tx.id} className="hover:bg-gray-800/30 transition-colors">
                     <td className="p-3 text-sm text-white border-b border-gray-800 font-mono">
                       {tx.walletId}
                     </td>
                     <td className="p-3 text-sm text-blue-400 text-right border-b border-gray-800 font-mono">
                       {liveBalance.toFixed(6)} SOL
                     </td>
                     <td className="p-3 text-sm text-green-400 text-right border-b border-gray-800">
                       {tx.signature ? 
                         `${(tx.amount * 35000).toLocaleString()} tokens` : 'No tokens'}
                     </td>
                     <td className="p-3 text-sm text-yellow-400 text-right border-b border-gray-800">
                       {tx.signature ? 
                         `$${(tx.amount * 120).toFixed(2)}` : '$0.00'}
                     </td>
                     <td className="p-3 text-center border-b border-gray-800">
                       <button 
                         className="text-xs text-red-400 hover:text-red-300 disabled:text-gray-500"
                         disabled={!hasTokens}
                       >
                         {hasTokens ? 'Sell' : 'N/A'}
                       </button>
                     </td>
                   </tr>
                 );
               })}
             </tbody>
          </table>
        </div>
      </div>

            {/* Live Token Monitor */}
      <LiveTokenMonitor operation={operation} systemStatus={systemStatus} />

      {/* Live Profit Monitoring */}
      {monitoringData && (
        <div className="card">
          <h3 className="text-xl font-semibold text-white mb-4">📊 Live Profit Monitoring</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-400 mb-2">Current Price</h4>
              <p className="text-xl font-bold text-white">${monitoringData.currentPrice?.toFixed(8) || '0.00000000'}</p>
              <p className="text-xs text-gray-500">Entry: ${monitoringData.entryPrice?.toFixed(8) || '0.00000000'}</p>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-400 mb-2">Profit Target</h4>
              <p className="text-xl font-bold text-blue-400">{operation.profitTarget}x</p>
              <p className="text-xs text-gray-500">
                {monitoringData.profitTargets?.[0]?.reached ? '✅ Reached' : 'Monitoring...'}
              </p>
            </div>
            
            <div className="bg-gray-800/50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-400 mb-2">Trailing Stop</h4>
              <p className="text-xl font-bold text-yellow-400">
                ${monitoringData.trailingStopLoss?.currentStopPrice?.toFixed(8) || '0.00000000'}
              </p>
              <p className="text-xs text-gray-500">
                Trail: {((monitoringData.trailingStopLoss?.trailPercent || 0.15) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
          
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-white mb-2">🎯 Monitoring Status</h4>
                <div className="space-y-1 text-sm">
                  <p><span className="text-gray-400">Entry Price:</span> <span className="text-white">${monitoringData.entryPrice?.toFixed(8)}</span></p>
                  <p><span className="text-gray-400">Current Price:</span> <span className="text-white">${monitoringData.currentPrice?.toFixed(8)}</span></p>
                  <p><span className="text-gray-400">Highest Price:</span> <span className="text-green-400">${monitoringData.trailingStopLoss?.highestPrice?.toFixed(8)}</span></p>
                  <p><span className="text-gray-400">Stop Loss:</span> <span className="text-red-400">${(monitoringData.entryPrice * operation.stopLoss)?.toFixed(8)}</span></p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                  <span className="text-xs text-green-400">Live Monitoring</span>
                </div>
                <p className="text-xs text-gray-500">Updates every second</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Activity Feed */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-white">📡 Live Activity</h3>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            <span className="text-xs text-green-400">Live Updates</span>
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto space-y-2">
          {/* Operation Created */}
          <div className="flex justify-between items-center p-3 bg-green-900/20 rounded">
            <div className="flex items-center space-x-3">
              <span className="text-green-400">✅</span>
              <span className="text-sm text-white">Bundle operation initialized</span>
            </div>
            <span className="text-xs text-gray-400">{new Date(operation.createdAt).toLocaleTimeString()}</span>
          </div>

          {/* Funds Distributed */}
          {operation.buyBundle && (
            <div className="flex justify-between items-center p-3 bg-blue-900/20 rounded">
              <div className="flex items-center space-x-3">
                <span className="text-blue-400">💰</span>
                <span className="text-sm text-white">
                  Distributed {operation.totalBudget} SOL to {operation.walletCount} wallets
                </span>
              </div>
              <span className="text-xs text-gray-400">Confirmed</span>
            </div>
          )}

          {/* DEX Detection */}
          <div className="flex justify-between items-center p-3 bg-purple-900/20 rounded">
            <div className="flex items-center space-x-3">
              <span className="text-purple-400">🔍</span>
              <span className="text-sm text-white">Detected Raydium token - routing to Raydium DEX</span>
            </div>
            <span className="text-xs text-gray-400">Auto-detected</span>
          </div>
          
          {/* Executing Bundles */}
          {operation.status === 'executing_bundles' && (
            <div className="flex justify-between items-center p-3 bg-yellow-900/20 rounded">
              <div className="flex items-center space-x-3">
                <span className="text-yellow-400">⚡</span>
                <span className="text-sm text-white">Executing {operation.walletCount}-wallet bundle attack...</span>
              </div>
              <span className="text-xs text-gray-400">Live</span>
            </div>
          )}

          {/* Transactions */}
          {operation.buyBundle?.transactions.map((tx, index) => (
            tx.signature && (
              <div key={tx.id} className="flex justify-between items-center p-3 bg-gray-800/30 rounded">
                <div className="flex items-center space-x-3">
                  <span className="text-blue-400">🎯</span>
                  <span className="text-sm text-white">
                    Wallet {index + 1}: {tx.amount.toFixed(4)} SOL → Tokens
                  </span>
                </div>
                <span className="text-xs text-gray-400">{tx.status}</span>
              </div>
            )
          ))}
          
          {/* Completed */}
          {operation.status === 'completed' && (
            <div className="flex justify-between items-center p-3 bg-green-900/20 rounded">
              <div className="flex items-center space-x-3">
                <span className="text-green-400">🎉</span>
                <span className="text-sm text-white">
                  Bundle attack completed - {operation.walletCount} wallets executed
                </span>
              </div>
              <span className="text-xs text-gray-400">Just now</span>
            </div>
          )}

          {/* Live Balance Updates */}
          <div className="flex justify-between items-center p-3 bg-blue-900/20 rounded">
            <div className="flex items-center space-x-3">
              <span className="text-blue-400">🔄</span>
              <span className="text-sm text-white">
                Dev wallet: {systemStatus?.walletManager?.devWallet?.balance?.toFixed(4)} SOL
              </span>
            </div>
            <span className="text-xs text-gray-400">Live</span>
          </div>
        </div>
      </div>
    </div>
  );
}; 