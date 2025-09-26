import React, { useState } from 'react';
import toast from 'react-hot-toast';

interface TokenWizardProps {
  onOperationStart: (operationId: string) => void;
}

type WizardStep = 'token-info' | 'strategy' | 'confirm' | 'launching';

interface TokenLaunchData {
  name: string;
  ticker: string;
  description: string;
  imagePrompt: string;
  generatedImage: string;
  launchpad: 'pump' | 'bonk' | 'moonshot';
  strategy: 'conservative' | 'aggressive' | 'undetectable';
  walletCount: number;
  budget: number;
  profitTarget: number;
  stopLoss: number;
  enableVanityAddress: boolean;
}

export const TokenWizard: React.FC<TokenWizardProps> = ({ onOperationStart }) => {
  const [step, setStep] = useState<WizardStep>('token-info');
  const [data, setData] = useState<TokenLaunchData>({
    name: '',
    ticker: '',
    description: '',
    imagePrompt: '',
    generatedImage: '',
    launchpad: 'pump',
    strategy: 'undetectable',
    walletCount: 8,
    budget: 4.2,
    profitTarget: 2.5,
    stopLoss: 0.7,
    enableVanityAddress: true
  });
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingViral, setIsGeneratingViral] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);

  const strategies = {
    conservative: { budget: 2.0, profitTarget: 2.0, stopLoss: 0.8, walletCount: 15, color: 'green', description: 'Safe bundling with 15 wallets' },
    aggressive: { budget: 4.8, profitTarget: 3.0, stopLoss: 0.6, walletCount: 15, color: 'red', description: 'High-risk bundling with 15 wallets' },
    undetectable: { budget: 3.5, profitTarget: 2.5, stopLoss: 0.7, walletCount: 8, color: 'purple', description: 'EXTREME variations (0.0005-50x) + Buy-3-Sell-1 waves' }
  };

  const refreshPrompts = async () => {
    if (!data.name && !data.ticker) {
      toast.error('Enter token name/ticker first');
      return;
    }

    try {
      const response = await fetch('/api/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenName: data.name, tokenSymbol: data.ticker })
      });

      const result = await response.json();
      if (result.success) {
        setData(prev => ({ ...prev, imagePrompt: result.data.prompt }));
        toast.success('🎨 New prompt generated!');
      }
    } catch (error) {
      console.error('Prompt generation error:', error);
    }
  };

  const generateViralToken = async () => {
    setIsGeneratingViral(true);
    try {
      toast.loading('🎯 Generating viral token concept...', { duration: 3000 });
      
      const response = await fetch('/api/generate-viral-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      if (result.success) {
        const concept = result.data;
        setData(prev => ({
          ...prev,
          name: concept.tokenIdea.name,
          ticker: concept.tokenIdea.symbol,
          description: concept.tokenIdea.description,
          imagePrompt: concept.tokenIdea.imagePrompt,
          generatedImage: concept.generatedImage || ''
        }));
        
        if (concept.generatedImage) {
          toast.success(`🔥 Generated viral concept: ${concept.tokenIdea.name} with AI image!`);
        } else {
          toast.success(`🔥 Generated viral concept: ${concept.tokenIdea.name}!`);
          toast.error('⚠️ DALL-E unavailable - add OPENAI_API_KEY to .env file');
        }
      } else {
        if (result.error.message.includes('Billing hard limit')) {
          toast.error('💳 OpenAI billing limit reached. Check platform.openai.com/account/billing');
        } else {
          toast.error(`Viral generation failed: ${result.error.message}`);
        }
      }
    } catch (error) {
      toast.error('Failed to generate viral token');
    } finally {
      setIsGeneratingViral(false);
    }
  };

  const generateImage = async () => {
    if (!data.imagePrompt) {
      toast.error('Enter an image prompt first');
      return;
    }

    setIsGeneratingImage(true);
    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenName: data.name,
          tokenSymbol: data.ticker,
          customPrompt: data.imagePrompt
        })
      });

      const result = await response.json();
      if (result.success) {
        setData(prev => ({ ...prev, generatedImage: result.data.imageUrl }));
        toast.success('🎨 Image generated!');
      } else {
        toast.error(`Image generation failed: ${result.error.message}`);
      }
    } catch (error) {
      toast.error('Failed to generate image');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const launchTokenAndBundle = async () => {
    setIsLaunching(true);
    setStep('launching');

    try {
      const payload = {
        // Token creation parameters
        name: data.name,
        symbol: data.ticker,
        description: data.description,
        imageUrl: data.generatedImage,
        launchpad: data.launchpad,
        strategy: data.strategy,
        enableVanityAddress: data.enableVanityAddress,
        // Bundling parameters
        walletCount: data.walletCount,
        totalBudget: data.budget,
        profitTarget: data.profitTarget,
        stopLoss: data.stopLoss,
        // Auto-deploy and bundle
        autoCreateAndBundle: true
      };

      const response = await fetch('/api/create-and-bundle-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result.success) {
        toast.success('🚀 Token created and bundling started!');
        onOperationStart(result.data.id);
      } else {
        if (result.error.message.includes('Too Many Requests') || result.error.message.includes('429')) {
          toast.error('⏳ Jito rate limited - token will deploy via individual transactions instead');
          toast.loading('🔄 Retrying with fallback method...', { duration: 3000 });
        } else {
          toast.error(`Launch failed: ${result.error.message}`);
        }
        setStep('confirm');
      }
    } catch (error) {
      toast.error('Launch failed');
      setStep('confirm');
    } finally {
      setIsLaunching(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'token-info':
        return (
          <div className="max-w-4xl mx-auto space-y-8 py-12">
            <div className="text-center">
              <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
                🚀 Launch New Token
              </h2>
              <p className="text-xl text-gray-400">Create, deploy, and bundle your memecoin automatically</p>
              
              {/* Auto-Fill Viral Token Button */}
              <div className="mt-6">
                <button
                  onClick={generateViralToken}
                  disabled={isGeneratingViral}
                  className="px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 text-lg shadow-lg shadow-orange-500/20"
                >
                  {isGeneratingViral ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      🎯 Generating Viral Concept...
                    </div>
                  ) : '🔥 AUTO-FILL VIRAL TOKEN'}
                </button>
                <p className="text-sm text-gray-500 mt-2">One-click viral token generation with AI image</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Token Details */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 space-y-6">
                <h3 className="text-xl font-semibold text-white flex items-center">
                  <span className="text-2xl mr-2">📝</span>
                  Token Details
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Launchpad</label>
                  <select
                    value={data.launchpad}
                    onChange={(e) => setData(prev => ({ ...prev, launchpad: e.target.value as 'pump' | 'bonk' | 'moonshot' }))}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  >
                    <option value="pump">🚀 Pump.fun - Most Popular</option>
                    <option value="bonk">🐕 Bonk.fun - Community Focused</option>
                    <option value="moonshot">🌙 Moonshot - USDC Based</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {data.launchpad === 'pump' && 'Fair launch platform with bonding curves'}
                    {data.launchpad === 'bonk' && 'Community-driven memecoin platform'}
                    {data.launchpad === 'moonshot' && 'USDC-denominated token launches'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Token Name</label>
                  <input
                    type="text"
                    value={data.name}
                    onChange={(e) => setData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Moon Doge"
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Ticker Symbol</label>
                  <input
                    type="text"
                    value={data.ticker}
                    onChange={(e) => setData(prev => ({ ...prev, ticker: e.target.value.toUpperCase() }))}
                    placeholder="e.g., MDOGE"
                    maxLength={10}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                  />
                </div>

                <div className="bg-gray-900/30 border border-gray-600/50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">✨ Vanity Address</label>
                      <p className="text-xs text-gray-500">Generate address containing your ticker symbol</p>
                    </div>
                    <button
                      onClick={() => setData(prev => ({ ...prev, enableVanityAddress: !prev.enableVanityAddress }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                        data.enableVanityAddress ? 'bg-purple-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          data.enableVanityAddress ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  {data.enableVanityAddress && data.ticker && (
                    <div className="mt-2 text-xs text-purple-400">
                      🎯 Will generate address like: xxxxx{data.ticker.toLowerCase()}xxxx or xxxxxxx{data.ticker.toLowerCase()}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                  <textarea
                    value={data.description}
                    onChange={(e) => setData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="e.g., The ultimate moon doge that will reach Mars and beyond! 🚀🐕"
                    rows={4}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none"
                  />
                </div>
              </div>

              {/* Image Generation */}
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-semibold text-white flex items-center">
                    <span className="text-2xl mr-2">🎨</span>
                    Token Image
                  </h3>
                  <button
                    onClick={refreshPrompts}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm rounded-lg transition-all disabled:opacity-50"
                    disabled={!data.name && !data.ticker}
                  >
                    🔄 Refresh Prompt
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">DALL-E Prompt</label>
                  <textarea
                    value={data.imagePrompt}
                    onChange={(e) => setData(prev => ({ ...prev, imagePrompt: e.target.value }))}
                    placeholder="AI will generate a creative prompt based on your token name..."
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none"
                  />
                </div>

                <button
                  onClick={generateImage}
                  disabled={isGeneratingImage || !data.imagePrompt}
                  className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGeneratingImage ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      🎨 Generating...
                    </div>
                  ) : '🎨 Generate Image'}
                </button>

                {data.generatedImage && (
                  <div className="text-center">
                    <img 
                      src={data.generatedImage} 
                      alt="Generated token"
                      className="w-48 h-48 object-cover rounded-xl mx-auto border-2 border-gray-600 shadow-lg"
                      onError={(e) => {
                        console.log('Image failed to load:', data.generatedImage);
                        // Keep the broken image for debugging
                      }}
                    />
                    <p className="text-sm text-gray-400 mt-2">
                      {data.generatedImage.includes('placeholder') ? 
                        '🖼️ Placeholder image (DALL-E unavailable)' : 
                        '✅ Image ready for token'
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-center">
              <button 
                onClick={() => setStep('strategy')}
                disabled={!data.name || !data.ticker || !data.description || !data.generatedImage}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg"
              >
                Next: Choose Strategy →
              </button>
            </div>
          </div>
        );

      case 'strategy':
        return (
          <div className="max-w-4xl mx-auto space-y-8 py-12">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-2">⚖️ Bundle Strategy</h2>
              <p className="text-gray-400">Choose your risk level and profit targets for the 15-wallet bundle</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(strategies).map(([key, strategy]) => (
                <button
                  key={key}
                  onClick={() => {
                    setData(prev => ({
                      ...prev,
                      strategy: key as any,
                      walletCount: strategy.walletCount,
                      budget: strategy.budget,
                      profitTarget: strategy.profitTarget,
                      stopLoss: strategy.stopLoss
                    }));
                  }}
                  className={`p-6 rounded-xl border-2 transition-all duration-300 ${
                    data.strategy === key
                      ? key === 'conservative' ? 'bg-gradient-to-br from-green-600/20 to-emerald-600/20 border-green-500 shadow-lg shadow-green-500/20'
                      : key === 'aggressive' ? 'bg-gradient-to-br from-red-600/20 to-orange-600/20 border-red-500 shadow-lg shadow-red-500/20'
                      : 'bg-gradient-to-br from-purple-600/20 to-pink-600/20 border-purple-500 shadow-lg shadow-purple-500/20'
                      : 'bg-gray-800/50 border-gray-600 hover:border-gray-500'
                  }`}
                >
                  <div className="text-4xl mb-3">
                    {key === 'conservative' ? '🛡️' : key === 'aggressive' ? '🔥' : '🎭'}
                  </div>
                  <h3 className={`text-xl font-bold mb-3 capitalize ${
                    key === 'conservative' ? 'text-green-400' : key === 'aggressive' ? 'text-red-400' : 'text-purple-400'
                  }`}>
                    {key}
                  </h3>
                  <p className="text-xs text-gray-400 mb-3">{strategy.description}</p>
                  <div className="space-y-3 text-gray-300">
                    <div className="flex justify-between">
                      <span>💰 Budget:</span>
                      <span className="font-bold">{strategy.budget} SOL</span>
                    </div>
                    <div className="flex justify-between">
                      <span>🎯 Profit Target:</span>
                      <span className="font-bold text-green-400">{strategy.profitTarget}x</span>
                    </div>
                    <div className="flex justify-between">
                      <span>🛑 Stop Loss:</span>
                      <span className="font-bold text-red-400">{((1 - strategy.stopLoss) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>👥 Wallets:</span>
                      <span className="font-bold">{strategy.walletCount}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Custom Settings */}
            <div className="max-w-2xl mx-auto bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <span className="text-xl mr-2">⚙️</span>
                Customize Settings
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Wallet Count</label>
                  <input
                    type="number"
                    min="3"
                    max="25"
                    value={data.walletCount}
                    onChange={(e) => setData(prev => ({ ...prev, walletCount: parseInt(e.target.value) || 8 }))}
                    className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Total Budget (SOL)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="10"
                    value={data.budget}
                    onChange={(e) => setData(prev => ({ ...prev, budget: parseFloat(e.target.value) || 3.5 }))}
                    className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20 transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <button 
                onClick={() => setStep('token-info')} 
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-all"
              >
                ← Back
              </button>
              <button 
                onClick={() => setStep('confirm')} 
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-lg transition-all"
              >
                Next: Confirm Launch →
              </button>
            </div>
          </div>
        );

      case 'confirm':
        return (
          <div className="max-w-3xl mx-auto space-y-8 py-12">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-2">🎯 Confirm Token Launch</h2>
              <p className="text-gray-400">Review your token before creating and bundling</p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold text-white mb-4 flex items-center">
                        <span className="text-xl mr-2">🪙</span>
                        Token Details
                      </h4>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Launchpad:</span>
                          <span className="text-white font-medium">
                            {data.launchpad === 'pump' && '🚀 Pump.fun'}
                            {data.launchpad === 'bonk' && '🐕 Bonk.fun'}
                            {data.launchpad === 'moonshot' && '🌙 Moonshot'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Name:</span>
                          <span className="text-white font-medium">{data.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Ticker:</span>
                          <span className="text-white font-mono">${data.ticker}</span>
                        </div>
                        <div className="pt-2">
                          <span className="text-gray-400 block mb-1">Description:</span>
                          <span className="text-white text-xs leading-relaxed">{data.description}</span>
                        </div>
                      </div>
                    </div>

                  <div>
                    <h4 className="font-semibold text-white mb-4 flex items-center">
                      <span className="text-xl mr-2">📈</span>
                      Bundle Strategy
                    </h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Mode:</span>
                        <span className={`font-medium capitalize ${
                          data.strategy === 'conservative' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {data.strategy}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Budget:</span>
                        <span className="text-white font-bold">{data.budget} SOL</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Profit Target:</span>
                        <span className="text-green-400 font-bold">{data.profitTarget}x</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Stop Loss:</span>
                        <span className="text-red-400 font-bold">{data.stopLoss}x</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Wallets:</span>
                        <span className="text-white font-bold">{data.walletCount}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  {data.generatedImage && (
                    <div className="space-y-4">
                      <h4 className="font-semibold text-white flex items-center justify-center">
                        <span className="text-xl mr-2">🎨</span>
                        Token Image
                      </h4>
                      <img 
                        src={data.generatedImage} 
                        alt="Token"
                        className="w-48 h-48 object-cover rounded-xl mx-auto border-2 border-gray-600 shadow-xl"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-8 p-4 bg-blue-900/30 border border-blue-500/30 rounded-lg">
                <h5 className="text-blue-400 font-semibold mb-2">🚀 What happens next:</h5>
                {data.strategy === 'undetectable' ? (
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• Deploy new token on {data.launchpad} with your image and details</li>
                    <li>• Execute buy-3-sell-1 waves with dramatic amount variations</li>
                    <li>• Create realistic price action that mimics organic trading</li>
                    <li>• Use 15-45 second delays between waves for natural timing</li>
                    <li>• Monitor for profit targets and stop-loss conditions</li>
                  </ul>
                ) : (
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• Deploy new token on {data.launchpad} with your image and details</li>
                    <li>• Automatically distribute SOL to 15 bundle wallets</li>
                    <li>• Execute coordinated buy operations across all wallets</li>
                    <li>• Monitor for profit targets and stop-loss conditions</li>
                  </ul>
                )}
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <button 
                onClick={() => setStep('strategy')} 
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-all"
              >
                ← Back
              </button>
              <button 
                onClick={launchTokenAndBundle}
                disabled={isLaunching}
                className="px-12 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 text-lg shadow-lg shadow-green-500/20"
              >
                {isLaunching ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    🚀 Launching...
                  </div>
                ) : '🚀 CREATE & BUNDLE TOKEN'}
              </button>
            </div>
          </div>
        );

      case 'launching':
        return (
          <div className="max-w-2xl mx-auto text-center space-y-8 py-12">
            <div className="animate-bounce">
              <div className="text-8xl mb-6">🚀</div>
              <h2 className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent mb-4">
                Launching Token...
              </h2>
              <p className="text-xl text-gray-400">
                Creating your memecoin and executing 15-wallet bundle
              </p>
            </div>

            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Status:</span>
                  <span className="text-blue-400 font-medium">Deploying & Bundling...</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full animate-pulse w-3/4"></div>
                </div>
                <div className="text-sm text-gray-500 space-y-1">
                  <p>✅ Token details prepared</p>
                  <p>✅ Image generated</p>
                  <p>🔄 Deploying on PumpFun...</p>
                  <p>⏳ Preparing bundle wallets...</p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Step not implemented</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/10 to-gray-900">
      {renderStep()}
    </div>
  );
}; 