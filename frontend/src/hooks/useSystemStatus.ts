import { useState, useEffect } from 'react';

interface SystemStatus {
  initialized: boolean;
  walletManager: {
    devWallet: any;
    bundleWallets: number;
    totalBalance: number;
  };
  bundleManager: {
    initialized: boolean;
    networkConnected: boolean;
    protectionEnabled: boolean;
  };
  operations: {
    active: number;
    completed: number;
    failed: number;
  };
  protection: {
    antiMev: boolean;
    sandwichProtection: boolean;
    emergencyStops: boolean;
  };
}

export const useSystemStatus = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSystemStatus = async () => {
    try {
      const response = await fetch('/api/system/status');
      const result = await response.json();
      
      if (result.success) {
        setSystemStatus(result.data);
        setError(null);
      } else {
        setError(result.error.message);
      }
    } catch (err) {
      setError('Failed to connect to bundler system');
      console.error('System status error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemStatus();
    const interval = setInterval(fetchSystemStatus, 3000); // Update every 3 seconds for real-time balance
    return () => clearInterval(interval);
  }, []);

  return { systemStatus, isLoading, error, refresh: fetchSystemStatus };
}; 