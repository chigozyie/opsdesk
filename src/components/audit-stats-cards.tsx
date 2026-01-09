'use client';

import { BarChart3, TrendingUp, Activity, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/alert';

interface AuditStatsCardsProps {
  stats: AuditStats | null;
  error?: string | null;
}

interface AuditStats {
  totalActions: number;
  actionsByType: Record<string, number>;
  actionsByResource: Record<string, number>;
  dailyActivity: Record<string, number>;
}

export function AuditStatsCards({ stats, error }: AuditStatsCardsProps) {
  if (error) {
    return <Alert type="error">{error}</Alert>;
  }

  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-8 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
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
    
    const todayCount = stats.dailyActivity[today!] || 0;
    const yesterdayCount = stats.dailyActivity[yesterday!] || 0;
    
    return { today: todayCount, yesterday: yesterdayCount };
  };

  const recentActivity = getRecentActivity();

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {/* Total Actions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Actions (30 days)</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalActions.toLocaleString()}</div>
        </CardContent>
      </Card>

      {/* Most Active Resource */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Most Active Resource</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{getMostActiveResource()}</div>
        </CardContent>
      </Card>

      {/* Most Common Action */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Most Common Action</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{getMostCommonAction()}</div>
        </CardContent>
      </Card>

      {/* Today's Activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today&apos;s Activity</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{recentActivity.today}</div>
          {recentActivity.yesterday > 0 && (
            <p className="text-xs text-muted-foreground">
              {recentActivity.today > recentActivity.yesterday ? '+' : ''}
              {((recentActivity.today - recentActivity.yesterday) / recentActivity.yesterday * 100).toFixed(0)}% vs yesterday
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}