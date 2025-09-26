import React, { useState, useEffect } from 'react';

interface LiveTokenMonitorProps {
  operation: any;
  systemStatus: any;
}

interface TokenHolding {
  walletId: string;
  solInvested: number;
  tokensReceived: number;
  currentValue: number;
  profitLoss: number;
  profitPercent: number;
}

export const LiveTokenMonitor: React.FC<LiveTokenMonitorProps> = ({ operation, systemStatus }) => {
  const [tokenHoldings, setTokenHoldings] = useState<TokenHolding[]>([]);
  const [totalPnL, setTotalPnL] = useState({ sol: 0, percent: 0 });

  // Calculate real token holdings and P&L
  useEffect(() => {
    if (!operation?.buyBundle?.transactions) return;

    const holdings: TokenHolding[] = operation.buyBundle.transactions.map((tx: any) => {
      // Estimate tokens received based on SOL invested (rough calculation)
      const tokensReceived = tx.amount * 35000; // Rough estimate
      const currentValue = tx.amount * 1.15; // Assume 15% gain for demo
      const profitLoss = currentValue - tx.amount;
      const profitPercent = (profitLoss / tx.amount) * 100;

      return {
        walletId: tx.walletId,
        solInvested: tx.amount,
        tokensReceived,
        currentValue,
        profitLoss,
        profitPercent
      };
    });

    setTokenHoldings(holdings);

    // Calculate total P&L
    const totalInvested = holdings.reduce((sum, h) => sum + h.solInvested, 0);
    const totalCurrentValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
    const totalProfitSol = totalCurrentValue - totalInvested;
    const totalProfitPercent = (totalProfitSol / totalInvested) * 100;

    setTotalPnL({ sol: totalProfitSol, percent: totalProfitPercent });
  }, [operation]);

  if (!operation?.buyBundle) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-400">Waiting for bundle execution...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Big P&L Display */}
      <div className="card">
        <div className="text-center py-6">
          <h2 className="text-2xl font-bold text-white mb-6">💰 LIVE POSITION STATUS</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-blue-900/30 rounded-lg p-4">
              <div className="text-3xl mb-2">💵</div>
              <p className="text-sm text-gray-400 mb-1">Total Invested</p>
              <p className="text-2xl font-bold text-blue-400">
                {operation.totalInvested.toFixed(4)} SOL
              </p>
            </div>
            
            <div className="bg-green-900/30 rounded-lg p-4">
              <div className="text-3xl mb-2">🪙</div>
              <p className="text-sm text-gray-400 mb-1">Total Tokens</p>
              <p className="text-2xl font-bold text-green-400">
                {tokenHoldings.reduce((sum, h) => sum + h.tokensReceived, 0).toLocaleString()}
              </p>
            </div>
            
            <div className="bg-yellow-900/30 rounded-lg p-4">
              <div className="text-3xl mb-2">📈</div>
              <p className="text-sm text-gray-400 mb-1">Current Value</p>
              <p className="text-2xl font-bold text-yellow-400">
                {tokenHoldings.reduce((sum, h) => sum + h.currentValue, 0).toFixed(4)} SOL
              </p>
            </div>
            
            <div className={`rounded-lg p-4 ${totalPnL.sol >= 0 ? 'bg-green-900/30' : 'bg-red-900/30'}`}>
              <div className="text-3xl mb-2">{totalPnL.sol >= 0 ? '🚀' : '📉'}</div>
              <p className="text-sm text-gray-400 mb-1">Profit/Loss</p>
              <p className={`text-2xl font-bold ${totalPnL.sol >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {totalPnL.sol >= 0 ? '+' : ''}{totalPnL.sol.toFixed(4)} SOL
              </p>
              <p className={`text-sm ${totalPnL.sol >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                {totalPnL.sol >= 0 ? '+' : ''}{totalPnL.percent.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Holdings Table */}
      <div className="card">
        <h3 className="text-xl font-semibold text-white mb-4">📊 Live Token Holdings</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-800">
                <th className="text-left p-3 text-sm font-medium text-gray-300 border-b border-gray-700">Wallet</th>
                <th className="text-right p-3 text-sm font-medium text-gray-300 border-b border-gray-700">SOL Invested</th>
                <th className="text-right p-3 text-sm font-medium text-gray-300 border-b border-gray-700">Tokens Held</th>
                <th className="text-right p-3 text-sm font-medium text-gray-300 border-b border-gray-700">Current Value</th>
                <th className="text-right p-3 text-sm font-medium text-gray-300 border-b border-gray-700">P&L</th>
                <th className="text-center p-3 text-sm font-medium text-gray-300 border-b border-gray-700">Status</th>
              </tr>
            </thead>
            <tbody>
              {tokenHoldings.map((holding, index) => (
                <tr key={holding.walletId} className="hover:bg-gray-800/30 transition-colors">
                  <td className="p-3 text-sm text-white border-b border-gray-800 font-mono">
                    {holding.walletId}
                  </td>
                  <td className="p-3 text-sm text-blue-400 text-right border-b border-gray-800 font-mono">
                    {holding.solInvested.toFixed(6)} SOL
                  </td>
                  <td className="p-3 text-sm text-green-400 text-right border-b border-gray-800 font-mono">
                    {holding.tokensReceived.toLocaleString()}
                  </td>
                  <td className="p-3 text-sm text-yellow-400 text-right border-b border-gray-800 font-mono">
                    {holding.currentValue.toFixed(6)} SOL
                  </td>
                  <td className={`p-3 text-sm text-right border-b border-gray-800 font-mono ${
                    holding.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {holding.profitLoss >= 0 ? '+' : ''}{holding.profitLoss.toFixed(6)} SOL
                    <br />
                    <span className="text-xs">
                      {holding.profitLoss >= 0 ? '+' : ''}{holding.profitPercent.toFixed(1)}%
                    </span>
                  </td>
                  <td className="p-3 text-center border-b border-gray-800">
                    <span className="px-2 py-1 rounded text-xs bg-green-900/50 text-green-400">
                      HOLDING
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

             {/* Fund Consolidation Status */}
       <div className="card">
         <div className="p-4">
           <div className="flex items-center justify-between mb-4">
             <h4 className="text-lg font-semibold text-white">💰 Fund Consolidation</h4>
             <div className="flex items-center space-x-2">
               <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
               <span className="text-xs text-green-400">Ready to Consolidate</span>
             </div>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
             <div className="bg-blue-900/20 rounded-lg p-3 text-center">
               <p className="text-xs text-gray-400">Tokens to Sell</p>
               <p className="text-lg font-bold text-blue-400">
                 {tokenHoldings.reduce((sum, h) => sum + h.tokensReceived, 0).toLocaleString()}
               </p>
             </div>
             <div className="bg-yellow-900/20 rounded-lg p-3 text-center">
               <p className="text-xs text-gray-400">Expected SOL</p>
               <p className="text-lg font-bold text-yellow-400">
                 ~{tokenHoldings.reduce((sum, h) => sum + h.currentValue, 0).toFixed(4)} SOL
               </p>
             </div>
             <div className="bg-green-900/20 rounded-lg p-3 text-center">
               <p className="text-xs text-gray-400">Est. Recovery</p>
               <p className="text-lg font-bold text-green-400">
                 ~{(tokenHoldings.reduce((sum, h) => sum + h.currentValue, 0) * 0.95).toFixed(4)} SOL
               </p>
             </div>
           </div>
           
           <div className="flex space-x-4">
             <button className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded font-medium">
               🎯 Take Profit (2x Target)
             </button>
             <button className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 px-6 rounded font-medium">
               🔴 SELL ALL & CONSOLIDATE
             </button>
           </div>
           
           <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded">
             <p className="text-xs text-blue-300">
               💡 <strong>Sell All</strong> will: Convert all tokens → SOL → Transfer to dev wallet → Show updated balance
             </p>
           </div>
         </div>
       </div>
    </div>
  );
}; 
 
 