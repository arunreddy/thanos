import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';

export const useConnectionStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hasBeenOffline, setHasBeenOffline] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (hasBeenOffline) {
        showToast('Connection restored', 'success');
        setHasBeenOffline(false);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setHasBeenOffline(true);
      showToast('Connection lost. Please check your internet connection.', 'warning', 0); // 0 duration means it won't auto-dismiss
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [hasBeenOffline, showToast]);

  return isOnline;
};