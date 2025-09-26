import React from 'react';

interface SystemHeaderProps {
  systemStatus: any;
  isLoading: boolean;
  error: string | null;
}

export const SystemHeader: React.FC<SystemHeaderProps> = ({ systemStatus, isLoading, error }) => {
  return (
    <div className="flex items-center space-x-6">
      {/* Network Indicator */}
      <div className="text-right">
        <div className="text-sm text-gray-400">Network</div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></div>
          <div className="font-bold text-red-400 text-sm">MAINNET</div>
        </div>
        <div className="text-xs text-red-300">🚨 REAL MONEY</div>
      </div>

      {/* Balance */}
      <div className="text-right">
        <div className="text-sm text-gray-400">Total Balance</div>
        <div className="font-bold text-green-400 text-lg">
          {systemStatus?.walletManager?.totalBalance?.toFixed(4) || '0'} SOL
        </div>
      </div>

      {/* Wallet Count */}
      <div className="text-right">
        <div className="text-sm text-gray-400">Active Wallets</div>
        <div className="font-bold text-blue-400 text-lg">
          15/{systemStatus?.walletManager?.bundleWallets || 0}
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center">
        {isLoading ? (
          <div className="flex items-center text-yellow-400">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400 mr-2"></div>
            <span>Connecting</span>
          </div>
        ) : error ? (
          <div className="flex items-center text-red-400">
            <div className="w-3 h-3 bg-red-400 rounded-full mr-2"></div>
            <span>Offline</span>
          </div>
        ) : (
          <div className="flex items-center text-green-400">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse mr-2"></div>
            <span>Online</span>
          </div>
        )}
      </div>
    </div>
  );
}; 