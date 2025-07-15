import React from 'react';
import { useQuery } from '@tanstack/react-query';

interface ServiceStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  url?: string;
  response_time_ms?: number;
  error?: string;
}

interface HealthStatus {
  status: 'healthy' | 'degraded';
  api: string;
  timestamp: number;
  services: {
    rasa?: ServiceStatus;
    database?: ServiceStatus;
  };
}

// Health check API function
const checkHealth = async (): Promise<HealthStatus> => {
  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:48000';
  const response = await fetch(`${API_BASE}/api/chat/health`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    throw new Error('Health check failed');
  }
  return response.json();
};

interface StatusDotProps {
  status: 'healthy' | 'unhealthy' | 'degraded' | 'loading';
  size?: 'sm' | 'md' | 'lg';
}

const StatusDot: React.FC<StatusDotProps> = ({ status, size = 'sm' }) => {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3', 
    lg: 'w-4 h-4'
  };

  const statusClasses = {
    healthy: 'bg-green-500',
    unhealthy: 'bg-red-500',
    degraded: 'bg-yellow-500',
    loading: 'bg-gray-400 animate-pulse'
  };

  return (
    <div className={`rounded-full ${sizeClasses[size]} ${statusClasses[status]}`} />
  );
};

interface StatusIndicatorProps {
  showDetails?: boolean;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ 
  showDetails = false, 
  className = '' 
}) => {
  const { data: healthStatus, isLoading, error } = useQuery({
    queryKey: ['health'],
    queryFn: checkHealth,
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: 1, // Only retry once on failure
  });

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <StatusDot status="loading" />
        {showDetails && <span className="text-sm text-gray-500">Checking status...</span>}
      </div>
    );
  }

  if (error || !healthStatus) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <StatusDot status="unhealthy" />
        {showDetails && <span className="text-sm text-red-600">Service offline</span>}
      </div>
    );
  }

  const rasaStatus = healthStatus.services.rasa?.status || 'unhealthy';
  const dbStatus = healthStatus.services.database?.status || 'unhealthy';

  if (!showDetails) {
    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        <StatusDot status={rasaStatus} />
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center space-x-4">
        {/* Rasa Status */}
        <div className="flex items-center space-x-2">
          <StatusDot status={rasaStatus} />
          <div className="text-sm">
            <div className="font-medium">Rasa</div>
            {rasaStatus === 'healthy' ? (
              <div className="text-green-600 text-xs">
                {healthStatus.services.rasa?.response_time_ms 
                  ? `${Math.round(healthStatus.services.rasa.response_time_ms)}ms`
                  : 'Online'
                }
              </div>
            ) : (
              <div className="text-red-600 text-xs">
                {healthStatus.services.rasa?.error || 'Offline'}
              </div>
            )}
          </div>
        </div>

        {/* Database Status */}
        <div className="flex items-center space-x-2">
          <StatusDot status={dbStatus} />
          <div className="text-sm">
            <div className="font-medium">Database</div>
            <div className={`text-xs ${dbStatus === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
              {dbStatus === 'healthy' ? 'Connected' : 'Error'}
            </div>
          </div>
        </div>
      </div>
      
      {healthStatus.status === 'degraded' && (
        <div className="mt-2 text-xs text-yellow-600">
          Some services are experiencing issues
        </div>
      )}
    </div>
  );
};

// Compact version for header/navbar
export const RasaStatusDot: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { data: healthStatus, isLoading } = useQuery({
    queryKey: ['health'],
    queryFn: checkHealth,
    refetchInterval: 30000,
    retry: 1,
  });

  const status = isLoading 
    ? 'loading' 
    : (healthStatus?.services.rasa?.status || 'unhealthy');

  const tooltipText = isLoading 
    ? 'Checking Rasa status...'
    : status === 'healthy' 
      ? `Rasa online (${Math.round(healthStatus?.services.rasa?.response_time_ms || 0)}ms)`
      : `Rasa offline: ${healthStatus?.services.rasa?.error || 'Unknown error'}`;

  return (
    <div className={`relative group ${className}`} title={tooltipText}>
      <StatusDot status={status} size="md" />
      
      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        {tooltipText}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
      </div>
    </div>
  );
};