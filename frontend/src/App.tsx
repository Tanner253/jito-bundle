import React, { useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { BundleWizard } from './components/BundleWizard';
import { BundleMonitor } from './components/BundleMonitor';
import { TokenWizard } from './components/TokenWizard';
import { SystemHeader } from './components/SystemHeader';
import { VolumePump } from './components/VolumePump';
import { useSystemStatus } from './hooks/useSystemStatus';

/**
 * Trenchpad - Token Launch Platform
 */
function App() {
  const [currentView, setCurrentView] = useState<'wizard' | 'monitor' | 'token-launch' | 'volume-pump'>('wizard');
  const [activeOperation, setActiveOperation] = useState<string | null>(null);
  const { systemStatus, isLoading, error } = useSystemStatus();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800/80 backdrop-blur-sm border-b border-gray-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-xl">⚡</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Trenchpad
                </h1>
                <p className="text-sm text-gray-400">Advanced Token Launch Platform</p>
              </div>
            </div>
            
            {/* Navigation */}
            <div className="flex items-center space-x-4">
              <nav className="flex space-x-2">
                <button
                  onClick={() => setCurrentView('wizard')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    currentView === 'wizard'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  Bundle Existing
                </button>
                <button
                  onClick={() => setCurrentView('token-launch')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    currentView === 'token-launch'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  🚀 Launch New Token
                </button>
                <button
                  onClick={() => setCurrentView('volume-pump')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    currentView === 'volume-pump'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  📊 Volume Pump
                </button>
                {activeOperation && (
                  <button
                    onClick={() => setCurrentView('monitor')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      currentView === 'monitor'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    Monitor
                  </button>
                )}
              </nav>
              
              <SystemHeader systemStatus={systemStatus} isLoading={isLoading} error={error} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {isLoading && (
          <div className="flex justify-center items-center py-32">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Initializing bundler system...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="max-w-2xl mx-auto mt-12 p-6 bg-red-900/50 border border-red-700 rounded-xl text-center">
            <div className="text-4xl mb-4">❌</div>
            <h3 className="text-xl font-bold text-white mb-2">System Error</h3>
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {!isLoading && !error && currentView === 'wizard' && (
          <BundleWizard 
            onOperationStart={(operationId) => {
              setActiveOperation(operationId);
              setCurrentView('monitor');
            }}
          />
        )}

        {!isLoading && !error && currentView === 'token-launch' && (
          <TokenWizard 
            onOperationStart={(operationId) => {
              setActiveOperation(operationId);
              setCurrentView('monitor');
            }}
          />
        )}

        {!isLoading && !error && currentView === 'volume-pump' && (
          <VolumePump />
        )}

        {!isLoading && !error && currentView === 'monitor' && activeOperation && (
          <BundleMonitor 
            operationId={activeOperation}
            onBack={() => setCurrentView('wizard')}
          />
        )}
      </main>

      {/* Emergency Actions */}
      <div className="fixed bottom-6 right-6 space-y-2">
        <button
          onClick={() => {
            if (confirm('🔥 SELL ALL TRACKED TOKENS: Fund wallets, sell all tokens, consolidate to SOL?')) {
              fetch('/api/sell-all-tracked-tokens', { method: 'POST' })
                .then(res => res.json())
                .then(result => {
                  if (result.success) {
                    alert(`✅ Sold ${result.data.tokensSold}/${result.data.totalTokens} tokens and consolidated SOL!`);
                  } else {
                    alert(`❌ Sell all failed: ${result.error.message}`);
                  }
                });
            }
          }}
          className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-4 rounded-xl shadow-2xl transition-all duration-200 hover:scale-105 border-2 border-orange-500/30"
        >
          <div className="text-center">
            <div className="text-xl">🔥</div>
            <div className="text-xs font-bold">SELL ALL</div>
          </div>
        </button>
        <button
          onClick={() => {
            if (confirm('🚨 EMERGENCY STOP: Recover all funds to dev wallet?')) {
              fetch('/api/emergency-stop', { method: 'POST' })
                .then(res => res.json())
                .then(result => {
                  if (result.success) {
                    alert('✅ Emergency stop completed');
                    setCurrentView('wizard');
                  }
                });
            }
          }}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-xl shadow-2xl transition-all duration-200 hover:scale-105 border-2 border-red-500/30"
        >
          <div className="text-center">
            <div className="text-2xl">🚨</div>
            <div className="text-sm font-bold">EMERGENCY</div>
          </div>
        </button>
      </div>

      {/* Toast Notifications */}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1f2937',
            color: '#f3f4f6',
            border: '1px solid #374151'
          }
        }}
      />
    </div>
  );
}

export default App; 