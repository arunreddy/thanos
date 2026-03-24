import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_URL } from '@/lib/config';

interface ServiceStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  type?: string;
  error?: string;
}

interface HealthStatus {
  status: 'healthy' | 'degraded';
  api: string;
  services: {
    database?: ServiceStatus;
    llm?: ServiceStatus;
  };
}

const checkHealth = async (): Promise<HealthStatus> => {
  const response = await fetch(`${API_URL}/api/chat/health`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
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
  const sizeClasses = { sm: 'w-2 h-2', md: 'w-3 h-3', lg: 'w-4 h-4' };
  const statusClasses = {
    healthy: 'bg-green-500',
    unhealthy: 'bg-red-500',
    degraded: 'bg-yellow-500',
    loading: 'bg-gray-400 animate-pulse',
  };

  return <div className={`rounded-full ${sizeClasses[size]} ${statusClasses[status]}`} />;
};

interface StatusIndicatorProps {
  showDetails?: boolean;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  showDetails = false,
  className = '',
}) => {
  const { data: healthStatus, isLoading, error } = useQuery({
    queryKey: ['health'],
    queryFn: checkHealth,
    refetchInterval: 30000,
    retry: 1,
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

  const overallStatus = healthStatus.status === 'healthy' ? 'healthy' : 'degraded';
  const dbStatus = healthStatus.services.database?.status || 'unhealthy';
  const llmStatus = healthStatus.services.llm?.status || 'unhealthy';

  if (!showDetails) {
    return (
      <div className={`flex items-center space-x-1 ${className}`}>
        <StatusDot status={overallStatus} />
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <StatusDot status={dbStatus} />
          <div className="text-sm">
            <div className="font-medium">Database</div>
            <div className={`text-xs ${dbStatus === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
              {dbStatus === 'healthy' ? 'Connected' : healthStatus.services.database?.error || 'Error'}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <StatusDot status={llmStatus} />
          <div className="text-sm">
            <div className="font-medium">LLM</div>
            <div className={`text-xs ${llmStatus === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
              {llmStatus === 'healthy'
                ? healthStatus.services.llm?.type || 'Online'
                : healthStatus.services.llm?.error || 'Offline'}
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

// Compact dot for sidebar — shows overall system health
export const SystemStatusDot: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { data: healthStatus, isLoading } = useQuery({
    queryKey: ['health'],
    queryFn: checkHealth,
    refetchInterval: 30000,
    retry: 1,
  });

  const status: StatusDotProps['status'] = isLoading
    ? 'loading'
    : healthStatus?.status === 'healthy'
      ? 'healthy'
      : 'unhealthy';

  const tooltipText = isLoading
    ? 'Checking system status...'
    : status === 'healthy'
      ? 'All systems operational'
      : `System degraded: ${healthStatus?.services.database?.status !== 'healthy' ? 'DB offline' : ''}${healthStatus?.services.llm?.status !== 'healthy' ? ' LLM offline' : ''}`.trim();

  return (
    <div className={`relative group ${className}`} title={tooltipText}>
      <StatusDot status={status} size="md" />
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        {tooltipText}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  );
};

// Keep old name as alias for backwards compatibility
export const RasaStatusDot = SystemStatusDot;
