import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface BundleWizardProps {
  onOperationStart: (operationId: string) => void;
}

type WizardStep = 'token-input' | 'strategy' | 'confirm' | 'launching';

interface BundleData {
  contractAddress: string;
  strategy: 'conservative' | 'aggressive' | 'custom' | 'volume-boost' | 'undetectable';
  walletCount: number;
  budget: number;
  profitTarget: number;
  stopLoss: number;
  fastMode: boolean;
  dex?: string;
  // Volume boost specific params
  solAmountPerTx?: number;
  loopCount?: number;
  accumulationPerLoop?: number;
}

export const BundleWizard: React.FC<BundleWizardProps> = ({ onOperationStart }) => {
  const [step, setStep] = useState<WizardStep>('token-input');
  const [data, setData] = useState<BundleData>({
    contractAddress: '',
    strategy: 'custom',
    walletCount: 3,
    budget: 0.15,
    profitTarget: 2.0,
    stopLoss: 0.8,
    fastMode: false,
    // Volume boost defaults
    solAmountPerTx: 0.1,
    loopCount: 100,
    accumulationPerLoop: 0.00001
  });
  const [isLaunching, setIsLaunching] = useState(false);
  const [healthCheck, setHealthCheck] = useState<any>(null);
  const [loadingHealthCheck, setLoadingHealthCheck] = useState(false);
  const [systemStatus, setSystemStatus] = useState<any>(null);

  // Fetch system status for live balance
  const fetchSystemStatus = async () => {
    try {
      const response = await fetch('/api/system/status');
      const result = await response.json();
      if (result.success) {
        setSystemStatus(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch system status:', error);
    }
  };

  // Fetch system status on component mount
  useEffect(() => {
    fetchSystemStatus();
    const interval = setInterval(fetchSystemStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const strategies = {
    conservative: { budget: 2.0, profitTarget: 2.0, stopLoss: 0.8, color: 'green', description: 'Lower risk, steady gains', walletCount: 15 },
    aggressive: { budget: 4.8, profitTarget: 3.0, stopLoss: 0.6, color: 'red', description: 'Higher risk, maximum profit', walletCount: 15 },
    undetectable: { budget: 3.5, profitTarget: 2.5, stopLoss: 0.7, color: 'purple', description: 'Buy-3-Sell-1 waves with dramatic variations', walletCount: 8 },
    custom: { budget: 0.15, profitTarget: 2.0, stopLoss: 0.8, color: 'blue', description: 'Custom settings', walletCount: 3 },
    'volume-boost': { budget: 1.0, profitTarget: 0, stopLoss: 0, color: 'orange', description: 'Create volume & buy pressure', walletCount: 1 }
  };

  const launchBundle = async () => {
    setIsLaunching(true);
    setStep('launching');

    try {
      let endpoint = '/api/launch-token';
      let payload: any = {
        contractAddress: data.contractAddress,
        strategy: data.strategy,
        totalBudget: data.budget,
        walletCount: data.walletCount,
        profitTarget: data.profitTarget,
        stopLoss: data.stopLoss,
        fastMode: data.fastMode,
        dex: data.dex
      };

      // Handle Volume Boost strategy
      if (data.strategy === 'volume-boost') {
        endpoint = '/api/volume-boost';
        payload = {
          tokenAddress: data.contractAddress,
          solAmountPerTx: data.solAmountPerTx,
          loopCount: data.loopCount,
          accumulationPerLoop: data.accumulationPerLoop
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result.success) {
        if (data.strategy === 'volume-boost') {
          toast.success('🎵 Volume Boost started!');
          onOperationStart('volume-boost-active');
        } else {
          toast.success('🚀 Bundle operation started!');
          onOperationStart(result.data.id);
        }
      } else {
        toast.error(`Launch failed: ${result.error.message}`);
        setStep('confirm');
      }
    } catch (error) {
      toast.error('Bundle launch failed');
      setStep('confirm');
    } finally {
      setIsLaunching(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'token-input':
        return (
          <div className="max-w-2xl mx-auto space-y-6 py-8 h-screen overflow-hidden">
            <div className="text-center">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-4">
                PumpFun Token Bundler
              </h1>
              <p className="text-xl text-gray-400">Bundle existing PumpFun tokens with 15-wallet coordination</p>
              <div className="mt-4 p-3 bg-green-900/30 border border-green-700/50 rounded-lg">
                <p className="text-green-300 text-sm">
                  ✅ FIXED: Now works with fresh PumpFun tokens directly from bonding curve!
                </p>
              </div>
            </div>

            <div className="card space-y-6">
              <h3 className="text-xl font-semibold text-white">Token Contract Address</h3>
              <input
                type="text"
                value={data.contractAddress}
                onChange={(e) => setData(prev => ({ ...prev, contractAddress: e.target.value }))}
                placeholder="Enter PumpFun token contract address (e.g., DcrqJvYyjGpEnoutG4y4sstKx2T5Wvz2N1BAfQDzpump)..."
                className="input text-sm font-mono"
              />
              <p className="text-sm text-gray-400">
                Enter the contract address of the token you want to bundle.
              </p>

              {/* DEX Selector */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  DEX/Platform
                </label>
                <select
                  value={data.dex || 'auto'}
                  onChange={(e) => setData({ ...data, dex: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="auto">🔍 Auto-detect from CA</option>
                  <option value="pumpfun">🚀 PumpFun (fresh tokens)</option>
                  <option value="raydium">🌊 Raydium (graduated tokens)</option>
                  <option value="jupiter">⚡ Jupiter (any token)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Auto-detect works for most tokens. Choose specific DEX if auto-detect fails.
                </p>
              </div>

              {/* Chart Preview & Health Check */}
              {data.contractAddress && data.contractAddress.length > 40 && (
                <div className="mt-6 space-y-6">
                  {/* Chart Preview */}
                  <div>
                    <h4 className="text-lg font-semibold text-white mb-4">📊 Token Chart Preview</h4>
                    <div className="bg-gray-800 rounded-lg overflow-hidden">
                      <style dangerouslySetInnerHTML={{
                        __html: `
                          #dexscreener-preview{
                            position:relative;
                            width:100%;
                            padding-bottom:50%;
                            background: #1f2937;
                            border-radius: 0.5rem;
                            overflow: hidden;
                          }
                          #dexscreener-preview iframe{
                            position:absolute;
                            width:100%;
                            height:100%;
                            top:0;
                            left:0;
                            border:0;
                          }
                        `
                      }} />
                      <div id="dexscreener-preview">
                        <iframe 
                          src={`https://dexscreener.com/solana/${data.contractAddress}?embed=1&loadChartSettings=0&chartTheme=dark&theme=dark&chartStyle=1&chartType=marketCap&interval=5`}
                          title="Token Chart Preview"
                          allow="fullscreen"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Token Health Check */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-lg font-semibold text-white">🔍 Token Health Analysis</h4>
                      <button
                        onClick={async () => {
                          setLoadingHealthCheck(true);
                          try {
                            const response = await fetch(`/api/token/${data.contractAddress}/health`);
                            const result = await response.json();
                            if (result.success) {
                              setHealthCheck(result.data);
                            }
                          } catch (error) {
                            console.error('Health check failed:', error);
                          } finally {
                            setLoadingHealthCheck(false);
                          }
                        }}
                        disabled={loadingHealthCheck}
                        className="btn-secondary text-sm"
                      >
                        {loadingHealthCheck ? '🔄 Analyzing...' : '🔍 Analyze Token'}
                      </button>
                    </div>

                    {healthCheck && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Overall Score */}
                        <div className="bg-gray-800 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h5 className="font-medium text-white">Overall Health Score</h5>
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                              healthCheck.riskLevel === 'low' ? 'bg-green-900/50 text-green-400' :
                              healthCheck.riskLevel === 'medium' ? 'bg-yellow-900/50 text-yellow-400' :
                              healthCheck.riskLevel === 'high' ? 'bg-orange-900/50 text-orange-400' :
                              'bg-red-900/50 text-red-400'
                            }`}>
                              {healthCheck.overallScore}/100
                            </div>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-400">Risk Level:</span>
                              <span className={`font-medium ${
                                healthCheck.riskLevel === 'low' ? 'text-green-400' :
                                healthCheck.riskLevel === 'medium' ? 'text-yellow-400' :
                                'text-red-400'
                              }`}>
                                {healthCheck.riskLevel.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">Liquidity:</span>
                              <span className="text-white">${healthCheck.liquidity?.totalUsd?.toLocaleString() || '0'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-400">24h Volume:</span>
                              <span className="text-white">${healthCheck.volume?.volume24h?.toLocaleString() || '0'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Risks & Opportunities */}
                        <div className="bg-gray-800 rounded-lg p-4">
                          <h5 className="font-medium text-white mb-3">Risk Assessment</h5>
                          
                          {healthCheck.risks && healthCheck.risks.length > 0 && (
                            <div className="mb-3">
                              <p className="text-xs text-red-400 font-medium mb-1">⚠️ Risk Factors:</p>
                              <div className="space-y-1">
                                {healthCheck.risks.slice(0, 3).map((risk: string, index: number) => (
                                  <p key={index} className="text-xs text-red-300">• {risk}</p>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {healthCheck.opportunities && healthCheck.opportunities.length > 0 && (
                            <div>
                              <p className="text-xs text-green-400 font-medium mb-1">✅ Opportunities:</p>
                              <div className="space-y-1">
                                {healthCheck.opportunities.slice(0, 3).map((opp: string, index: number) => (
                                  <p key={index} className="text-xs text-green-300">• {opp}</p>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {!healthCheck && !loadingHealthCheck && (
                      <div className="bg-gray-800/50 rounded-lg p-6 text-center">
                        <div className="text-4xl mb-2">🔍</div>
                        <p className="text-gray-400 text-sm">Click "Analyze Token" to get health insights</p>
                        <p className="text-gray-500 text-xs mt-1">Informational only - won't prevent trading</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-center">
              <button 
                onClick={() => setStep('strategy')}
                disabled={!data.contractAddress.trim()}
                className="btn-primary px-8 py-3"
              >
                Next: Select Strategy →
              </button>
            </div>
          </div>
        );

      case 'strategy':
        return (
          <div className="max-w-5xl mx-auto space-y-6 py-8 h-screen overflow-hidden">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-2">⚖️ Bundle Configuration</h2>
              <p className="text-gray-400">Configure your bundle attack parameters</p>
            </div>

            {/* Custom Configuration (Primary) */}
            <div className="card">
              <h3 className="text-xl font-bold text-blue-400 mb-4">
                {data.strategy === 'volume-boost' ? '🎵 Volume Boost Configuration' : '🎛️ Custom Configuration (Recommended for Testing)'}
              </h3>
              
              {data.strategy === 'volume-boost' ? (
                // Volume Boost Configuration
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">SOL per Transaction</label>
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      max="1"
                      value={data.solAmountPerTx}
                      onChange={(e) => setData(prev => ({ ...prev, solAmountPerTx: parseFloat(e.target.value) || 0.01 }))}
                      className="input"
                    />
                    <p className="text-xs text-gray-500 mt-1">SOL amount per buy/sell transaction</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Loop Count</label>
                    <input
                      type="number"
                      step="1"
                      min="10"
                      max="1000"
                      value={data.loopCount}
                      onChange={(e) => setData(prev => ({ ...prev, loopCount: parseInt(e.target.value) || 100 }))}
                      className="input"
                    />
                    <p className="text-xs text-gray-500 mt-1">Number of 2-buy + 1-sell loops</p>
                  </div>

                                      <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Accumulation per Loop (SOL)</label>
                      <input
                        type="number"
                        step="0.00001"
                        min="0.00001"
                        max="0.1"
                        value={data.accumulationPerLoop || 0.00001}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (!isNaN(value) && value > 0) {
                            setData(prev => ({ ...prev, accumulationPerLoop: value }));
                          }
                        }}
                        className="input font-mono text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        SOL kept as buy pressure per loop (min: 0.00001, max: 0.1)
                      </p>
                      <p className="text-xs text-blue-400 mt-1">
                        Example: Buy {data.solAmountPerTx} + Buy {data.solAmountPerTx} = Sell {(data.solAmountPerTx! * 2 - (data.accumulationPerLoop || 0)).toFixed(5)}
                      </p>
                    </div>
                </div>
              ) : (
                // Regular Bundle Configuration  
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Wallet Count</label>
                  <select 
                    value={data.walletCount}
                    onChange={(e) => setData(prev => ({ ...prev, walletCount: parseInt(e.target.value), strategy: 'custom' }))}
                    className="input"
                  >
                    <option value={3}>3 wallets (testing)</option>
                    <option value={5}>5 wallets (safe)</option>
                    <option value={10}>10 wallets (medium)</option>
                    <option value={15}>15 wallets (aggressive)</option>
                    <option value={25}>25 wallets (MAXIMUM IMPACT)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Total Budget (SOL)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="10"
                    value={data.budget}
                    onChange={(e) => setData(prev => ({ ...prev, budget: parseFloat(e.target.value) || 0, strategy: 'custom' }))}
                    className="input"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Available: {systemStatus?.walletManager?.devWallet?.balance?.toFixed(4) || '0.000'} SOL | Required: {(data.budget + Math.min(0.25, Math.max(0.01, data.budget * 0.25))).toFixed(4)} SOL
                    {(data.budget + Math.min(0.25, Math.max(0.01, data.budget * 0.25))) > (systemStatus?.walletManager?.devWallet?.balance || 0) && 
                      <span className="text-red-400 ml-2">⚠️ Insufficient funds!</span>
                    }
                    {data.walletCount * 0.012 > data.budget * 0.75 && 
                      <span className="text-yellow-400 ml-2">⚠️ Budget too low for {data.walletCount} wallets (min 12M lamports/0.012 SOL each)</span>
                    }
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Profit Target</label>
                  <select
                    value={data.profitTarget}
                    onChange={(e) => setData(prev => ({ ...prev, profitTarget: parseFloat(e.target.value), strategy: 'custom' }))}
                    className="input"
                  >
                    <option value={1.5}>1.5x (50% profit)</option>
                    <option value={2.0}>2.0x (100% profit)</option>
                    <option value={2.5}>2.5x (150% profit)</option>
                    <option value={3.0}>3.0x (200% profit)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Execution Mode</label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="executionMode"
                        checked={!data.fastMode}
                        onChange={() => setData(prev => ({ ...prev, fastMode: false, strategy: 'custom' }))}
                        className="text-blue-400"
                      />
                      <span className="text-white">🕐 Sequential (Organic - 200-500ms delays)</span>
                    </label>
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        name="executionMode"
                        checked={data.fastMode}
                        onChange={() => setData(prev => ({ ...prev, fastMode: true, strategy: 'custom' }))}
                        className="text-blue-400"
                      />
                      <span className="text-white">⚡ Parallel (FAST - all wallets at once)</span>
                    </label>
                  </div>
                </div>
              </div>
              )}

              {data.strategy === 'volume-boost' ? (
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-purple-400">🎵</span>
                    <h4 className="font-semibold text-white">Volume Boost Preview</h4>
                  </div>
                  <div className="space-y-2 text-sm text-gray-300">
                    <p><span className="text-purple-400">Pattern:</span> Buy {data.solAmountPerTx} + Buy {data.solAmountPerTx} → Sell {(data.solAmountPerTx! * 2 - data.accumulationPerLoop!).toFixed(6)}</p>
                    <p><span className="text-blue-400">Total Transactions:</span> {(data.loopCount! * 3).toLocaleString()}</p>
                    <p><span className="text-yellow-400">Total Volume:</span> {(data.loopCount! * data.solAmountPerTx! * 3).toFixed(3)} SOL</p>
                    <p><span className="text-orange-400">Net Cost:</span> {(data.loopCount! * data.accumulationPerLoop!).toFixed(6)} SOL <span className="text-xs">(total budget needed)</span></p>
                    <p><span className="text-green-400">Working Capital:</span> {(data.solAmountPerTx! * 2).toFixed(3)} SOL <span className="text-xs">(recycled per wallet)</span></p>
                    <p><span className="text-gray-400">Estimated Time:</span> {Math.ceil(data.loopCount! * 2 / 60)} minutes</p>
                  </div>
                </div>
              ) : (
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-blue-400">💡</span>
                  <h4 className="font-semibold text-white">Attack Preview</h4>
                </div>
                <div className="space-y-2 text-sm text-gray-300">
                  <p>
                    <span className="text-blue-400">Mode:</span> {data.fastMode ? '⚡ Parallel Attack (2-5 seconds)' : '🕐 Sequential Attack (organic timing)'}
                  </p>
                  <p>
                    <span className="text-yellow-400">Impact:</span> {data.walletCount} wallets × ~{(data.budget / data.walletCount).toFixed(4)} SOL each
                  </p>
                  <p>
                    <span className="text-green-400">Total Required:</span> {(data.budget + (data.walletCount * 0.005) + 0.005).toFixed(4)} SOL 
                    ({data.budget} buy + {(data.walletCount * 0.005).toFixed(3)} fees + 0.005 buffer)
                  </p>
                </div>
              </div>
              )}
            </div>

            {/* Preset Strategies */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">📋 Preset Strategies (Optional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Object.entries(strategies).filter(([key]) => key !== 'custom').map(([key, strategy]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setData(prev => ({
                        ...prev,
                        strategy: key as 'conservative' | 'aggressive' | 'volume-boost',
                        budget: strategy.budget,
                        profitTarget: strategy.profitTarget,
                        stopLoss: strategy.stopLoss,
                        walletCount: strategy.walletCount
                      }));
                    }}
                    className={`p-6 rounded-xl border-2 transition-all duration-300 ${
                      data.strategy === key
                        ? `bg-${strategy.color}-600/20 border-${strategy.color}-500 shadow-lg shadow-${strategy.color}-500/20`
                        : 'bg-gray-800/50 border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <div className="text-4xl mb-4">
                      {key === 'conservative' ? '🛡️' : '🔥'}
                    </div>
                    <h3 className={`text-xl font-bold text-${strategy.color}-400 mb-2 capitalize`}>{key}</h3>
                    <p className="text-sm text-gray-400 mb-4">{strategy.description}</p>
                    <div className="space-y-2 text-sm text-gray-300">
                      <p>💰 Budget: {strategy.budget} SOL</p>
                      <p>🔢 Wallets: {strategy.walletCount}</p>
                      <p>🎯 Target: {strategy.profitTarget}x</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <button onClick={() => setStep('token-input')} className="btn-secondary">← Back</button>
              <button onClick={() => setStep('confirm')} className="btn-primary">Next: Confirm →</button>
            </div>
          </div>
        );

      case 'confirm':
        return (
          <div className="max-w-2xl mx-auto space-y-6 py-8 h-screen overflow-hidden">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-2">🎯 Launch Bundle Attack</h2>
              <p className="text-gray-400">Review your bundle configuration</p>
            </div>

            <div className="card">
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-white mb-4">📈 Target Token</h4>
                  <p className="text-sm">
                    <span className="text-gray-400">Contract:</span> 
                    <span className="text-white font-mono text-xs ml-2">{data.contractAddress}</span>
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-white mb-4">⚖️ Strategy Configuration</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-400">Mode:</span> <span className={`text-${strategies[data.strategy].color}-400 font-medium capitalize`}>{data.strategy.replace('-', ' ')}</span></p>
                    
                    {data.strategy === 'volume-boost' ? (
                      <>
                        <p><span className="text-gray-400">SOL per TX:</span> <span className="text-white">{data.solAmountPerTx} SOL</span></p>
                        <p><span className="text-gray-400">Loop Count:</span> <span className="text-blue-400">{data.loopCount} loops</span></p>
                        <p><span className="text-gray-400">Accumulation:</span> <span className="text-green-400">{data.accumulationPerLoop} SOL per loop</span></p>
                        <p><span className="text-gray-400">Total Volume:</span> <span className="text-purple-400">{(data.loopCount! * data.solAmountPerTx! * 3).toFixed(3)} SOL</span></p>
                        <p><span className="text-gray-400">Net Buy Pressure:</span> <span className="text-green-400">{(data.loopCount! * data.accumulationPerLoop!).toFixed(6)} SOL</span></p>
                      </>
                    ) : (
                      <>
                        <p><span className="text-gray-400">Budget:</span> <span className="text-white">{data.budget} SOL</span></p>
                        <p><span className="text-gray-400">Wallets:</span> <span className="text-blue-400">{data.walletCount} bundle wallets</span></p>
                        <p><span className="text-gray-400">Per Wallet:</span> <span className="text-yellow-400">~{(data.budget / data.walletCount).toFixed(4)} SOL</span></p>
                        <p><span className="text-gray-400">Profit Target:</span> <span className="text-green-400">{data.profitTarget}x</span></p>
                        <p><span className="text-gray-400">Stop Loss:</span> <span className="text-red-400">{data.stopLoss}x</span></p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <button onClick={() => setStep('strategy')} className="btn-secondary">← Back</button>
              <button 
                onClick={launchBundle}
                disabled={isLaunching}
                className={`text-lg px-8 py-3 ${data.strategy === 'volume-boost' ? 'btn-primary' : 'btn-success'}`}
              >
                {isLaunching 
                  ? (data.strategy === 'volume-boost' ? '🎵 Starting Volume Boost...' : '🚀 Launching...')
                  : (data.strategy === 'volume-boost' ? '🎵 START VOLUME BOOST' : '🚀 LAUNCH BUNDLE ATTACK')
                }
              </button>
            </div>
          </div>
        );

      case 'launching':
        return (
          <div className="max-w-2xl mx-auto text-center space-y-6 py-8 h-screen overflow-hidden">
            <div className="animate-pulse">
              <div className="text-8xl mb-6">🚀</div>
                           <h2 className="text-3xl font-bold text-white mb-4">Launching Bundle Attack...</h2>
             <p className="text-gray-400">
               Executing coordinated {data.walletCount}-wallet bundle operation
             </p>
            </div>

            <div className="card">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className="text-blue-400">Deploying Bundle...</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full animate-pulse w-3/4"></div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Step not implemented</div>;
    }
  };

  return renderStep();
}; 