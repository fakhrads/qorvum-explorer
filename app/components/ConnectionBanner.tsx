import React, { useState, useEffect } from 'react';
import { getConfig, clearAuth } from '../lib/config';
import { Button } from './ui';
import { AlertCircleIcon, ShieldAlertIcon, InfoIcon } from './icons';

interface ConnectionBannerProps {
  isDisconnected?: boolean;
  onRefresh?: () => void;
  onLogout?: () => void;
}

export function ConnectionBanner({ isDisconnected, onRefresh, onLogout }: ConnectionBannerProps) {
  const [expiryMinutes, setExpiryMinutes] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [config, setConfigState] = useState(getConfig());

  useEffect(() => {
    const checkExpiry = () => {
      const currentConfig = getConfig();
      setConfigState(currentConfig);

      if (!currentConfig.tokenExpiry) {
        setExpiryMinutes(null);
        setIsExpired(false);
        return;
      }

      const now = Math.floor(Date.now() / 1000);
      const diff = currentConfig.tokenExpiry - now;

      if (diff <= 0) {
        setIsExpired(true);
        setExpiryMinutes(0);
      } else {
        setIsExpired(false);
        setExpiryMinutes(Math.floor(diff / 60));
      }
    };

    checkExpiry();
    const timer = setInterval(checkExpiry, 30000);
    return () => clearInterval(timer);
  }, []);

  if (isExpired) {
    return (
      <div className="bg-red-600 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
        <ShieldAlertIcon size={16} />
        <span>Session expired — Sign in again to continue</span>
        <Button size="sm" variant="secondary" className="ml-4 h-7 bg-white text-red-600 border-none hover:bg-white/90" onClick={onLogout}>
          Sign In
        </Button>
      </div>
    );
  }

  if (isDisconnected) {
    return (
      <div className="bg-red-500/10 border-b border-red-500/20 text-red-400 px-4 py-2 text-center text-xs font-medium flex items-center justify-center gap-2">
        <AlertCircleIcon size={14} />
        <span>⚠ Disconnected: Cannot reach gateway at {config.baseUrl}</span>
        <button type="button" className="underline ml-2 hover:text-red-300" onClick={onRefresh}>Retry Connection</button>
      </div>
    );
  }

  // Backend /auth/refresh does not issue a new token — it requires re-authentication.
  // When the session is near expiry, prompt the user to sign in again.
  if (expiryMinutes !== null && expiryMinutes < 10) {
    return (
      <div className="bg-amber-600 text-white px-4 py-2 text-center text-sm font-medium flex items-center justify-center gap-2">
        <InfoIcon size={16} />
        <span>Session expires in {expiryMinutes} min — sign in again to stay connected</span>
        <Button size="sm" variant="secondary" className="ml-4 h-7 bg-white text-amber-600 border-none hover:bg-white/90"
          onClick={onLogout}>
          Re-login
        </Button>
      </div>
    );
  }

  return null;
}
