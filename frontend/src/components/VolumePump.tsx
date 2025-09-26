import React, { useState } from 'react';
import toast from 'react-hot-toast';

export const VolumePump: React.FC = () => {
  const [tokenAddress, setTokenAddress] = useState('');
  const [buyAmount, setBuyAmount] = useState('0.5');
  const [loops, setLoops] = useState('100');
  const [isRunning, setIsRunning] = useState(false);

  const executeVolumePump = async () => {
    if (!tokenAddress || !buyAmount || !loops) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsRunning(true);
    
    try {
      toast.loading(`🚀 Starting ${loops} buy→sell loops with ${buyAmount} SOL each...`, { duration: 10000 });
      
      const response = await fetch('/api/simple-volume-pump', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenAddress,
          buyAmount: parseFloat(buyAmount),
          loops: parseInt(loops)
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(`🎉 Volume pump complete! ${result.data.successfulBuys} buys, ${result.data.successfulSells} sells. Total volume: ${result.data.totalVolume.toFixed(3)} SOL`, { duration: 8000 });
      } else {
        toast.error(`Volume pump failed: ${result.error?.message || 'Unknown error'}`);
      }
      
    } catch (error: any) {
      toast.error(`Volume pump failed: ${error.message || 'Unknown error'}`);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-12 p-8 bg-gray-800/50 border border-gray-700 rounded-xl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent mb-4">
          📊 Simple Volume Pump
        </h2>
        <p className="text-gray-400">
          Fast buy → sell loops on single wallet for volume generation
        </p>
      </div>

      <div className="space-y-6">
        {/* Token Address */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Token Contract Address
          </label>
          <input
            type="text"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value)}
            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="Enter token contract address"
          />
        </div>

        {/* Buy Amount */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Buy Amount (SOL per transaction)
          </label>
          <input
            type="number"
            step="0.01"
            value={buyAmount}
            onChange={(e) => setBuyAmount(e.target.value)}
            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="0.5"
          />
        </div>

        {/* Loops */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Number of Loops (buy → sell cycles)
          </label>
          <input
            type="number"
            value={loops}
            onChange={(e) => setLoops(e.target.value)}
            className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            placeholder="100"
          />
        </div>

        {/* Cost Calculation */}
        {buyAmount && loops && (
          <div className="bg-blue-900/30 border border-blue-600/30 rounded-lg p-4">
            <h4 className="font-semibold text-blue-400 mb-2">Expected Costs:</h4>
            <div className="text-sm text-blue-200 space-y-1">
              <div>📊 Total Volume Generated: <span className="text-white font-bold">{(parseFloat(loops) * parseFloat(buyAmount) * 2).toFixed(1)} SOL</span></div>
              
              {/* Dynamic cost based on token type */}
              {tokenAddress.includes('pump') ? (
                <>
                  <div className="text-orange-300 text-xs">⚠️ PumpFun Token (Higher Fees)</div>
                  <div>💸 Expected Slippage: <span className="text-yellow-400">{(parseFloat(loops) * 0.006).toFixed(3)} SOL</span></div>
                  <div>🏦 Expected Fees: <span className="text-yellow-400">{(parseFloat(loops) * 0.009).toFixed(3)} SOL</span></div>
                  <div className="border-t border-blue-600/30 pt-1 mt-1">
                    💰 Total Expected Cost: <span className="text-red-400 font-bold">{(parseFloat(loops) * 0.015).toFixed(3)} SOL</span>
                  </div>
                  <div>📈 Volume to Cost Ratio: <span className="text-yellow-400 font-bold">{((parseFloat(loops) * parseFloat(buyAmount) * 2) / (parseFloat(loops) * 0.015)).toFixed(0)}:1</span></div>
                </>
              ) : (
                <>
                  <div className="text-green-300 text-xs">✅ Raydium Token (Lower Fees)</div>
                  <div>💸 Expected Slippage: <span className="text-yellow-400">{(parseFloat(loops) * 0.001).toFixed(3)} SOL</span></div>
                  <div>🏦 Expected Fees: <span className="text-yellow-400">{(parseFloat(loops) * 0.002).toFixed(3)} SOL</span></div>
                  <div className="border-t border-blue-600/30 pt-1 mt-1">
                    💰 Total Expected Cost: <span className="text-green-400 font-bold">{(parseFloat(loops) * 0.003).toFixed(3)} SOL</span>
                  </div>
                  <div>📈 Volume to Cost Ratio: <span className="text-green-400 font-bold">{((parseFloat(loops) * parseFloat(buyAmount) * 2) / (parseFloat(loops) * 0.003)).toFixed(0)}:1</span></div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-orange-900/30 border border-orange-600/30 rounded-lg p-4">
          <h4 className="font-semibold text-orange-400 mb-2">How it works:</h4>
          <ul className="text-sm text-orange-200 space-y-1">
            <li>• Uses 1 wallet for maximum speed</li>
            <li>• Repeats: Buy {buyAmount} SOL → Sell all tokens → Loop</li>
            <li>• Auto-refunds wallet every 10 loops to maintain balance</li>
            <li>• Generates massive volume with predictable costs</li>
            <li>• Consolidates remaining SOL at the end</li>
          </ul>
        </div>

        {/* Execute Button */}
        <button
          onClick={executeVolumePump}
          disabled={isRunning}
          className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200 ${
            isRunning
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white transform hover:scale-105 shadow-xl'
          }`}
        >
          {isRunning ? '🔄 Volume Pumping...' : '🚀 Start Volume Pump'}
        </button>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => { setBuyAmount('0.1'); setLoops('50'); }}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-sm rounded-lg transition-all"
          >
            Small (0.1 SOL × 50)
          </button>
          <button
            onClick={() => { setBuyAmount('0.5'); setLoops('100'); }}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-sm rounded-lg transition-all"
          >
            Medium (0.5 SOL × 100)
          </button>
          <button
            onClick={() => { setBuyAmount('1.0'); setLoops('200'); }}
            className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-sm rounded-lg transition-all"
          >
            Large (1.0 SOL × 200)
          </button>
        </div>
      </div>
    </div>
  );
}; 