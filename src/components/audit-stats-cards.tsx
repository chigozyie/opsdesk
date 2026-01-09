'use client';

import { useState, useEffect } from 'react';
import { getAuditStats } from '@/lib/server-actions/audit-actions';

interface AuditStatsCardsProps {
  workspaceSlug: string;
}

interface AuditStats {
  totalActions: number;
  actionsByType: Record<string, number>;
  actionsByResource: Record<string, number>;
  dailyActivity: Record<string, number>;
}

export function AuditStatsCards({ workspaceSlug }: AuditStatsCardsProps) {
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await getAuditStats({
          workspaceSlug,
          days: 30,
        });

        if (result.success && result.data) {
          setStats(result.data);
        } else {
          setError(result.message || 'Failed to load audit statistics');
        }
      } catch (err) {
        setError('An error occurred while loading audit statistics');
        console.error('Audit stats error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [workspaceSlug]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg border animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatResourceType = (resourceType: string) => {
    return resourceType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const getMostActiveResource = () => {
    const entries = Object.entries(stats.actionsByResource);
    if (entries.length === 0) return 'None';
    const [resource] = entries.reduce((a, b) => a[1] > b[1] ? a : b);
    return formatResourceType(resource);
  };

  const getMostCommonAction = () => {
    const entries = Object.entries(stats.actionsByType);
    if (entries.length === 0) return 'None';
    const [action] = entries.reduce((a, b) => a[1] > b[1] ? a : b);
    return formatAction(action);
  };

  const getRecentActivity = () => {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const todayCount = stats.dailyActivity[today] || 0;
    const yesterdayCount = stats.dailyActivity[yesterday] || 0;
    
    return { today: todayCount, yesterday: yesterdayCount };
  };

  const recentActivity = getRecentActivity();

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Total Actions */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-center">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">Total Actions (30 days)</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalActions.toLocaleString()}</p>
          </div>
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Most Active Resource */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-center">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">Most Active Resource</p>
            <p className="text-2xl font-bold text-gray-900">{getMostActiveResource()}</p>
          </div>
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
        </div>
      </div>

      {/* Most Common Action */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-center">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">Most Common Action</p>
            <p className="text-2xl font-bold text-gray-900">{getMostCommonAction()}</p>
          </div>
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Today's Activity */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex items-center">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600">Today's Activity</p>
            <p className="text-2xl font-bold text-gray-900">{recentActivity.today}</p>
            {recentActivity.yesterday > 0 && (
              <p className="text-xs text-gray-500">
                {recentActivity.today > recentActivity.yesterday ? '+' : ''}
                {((recentActivity.today - recentActivity.yesterday) / recentActivity.yesterday * 100).toFixed(0)}% vs yesterday
              </p>
            )}
          </div>
          <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}