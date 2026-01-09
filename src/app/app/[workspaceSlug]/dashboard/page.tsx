import { requireAuth } from '@/lib/auth/server';
import { getWorkspaceBySlug } from '@/lib/workspace/actions';
import { getDashboardMetrics } from '@/lib/server-actions/dashboard-actions';
import { notFound } from 'next/navigation';

interface DashboardPageProps {
  params: {
    workspaceSlug: string;
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatPercentage(percentage: number): string {
  const sign = percentage > 0 ? '+' : '';
  return `${sign}${percentage.toFixed(1)}%`;
}

function getChangeColor(change: number): string {
  if (change > 0) return 'text-green-600';
  if (change < 0) return 'text-red-600';
  return 'text-gray-600';
}

export default async function WorkspaceDashboardPage({ params }: DashboardPageProps) {
  await requireAuth();
  const workspace = await getWorkspaceBySlug(params.workspaceSlug);
  
  if (!workspace) {
    notFound();
  }

  // Fetch dashboard metrics
  const metricsResult = await getDashboardMetrics({ workspace_id: workspace.id });
  const metrics = metricsResult.success ? metricsResult.data : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">
          Welcome to {workspace.name}. You are logged in as a <strong>{workspace.role}</strong>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Customers */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Customers</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {metrics ? metrics.totalCustomers.toLocaleString() : '-'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Outstanding Invoices */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Outstanding Invoices</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {metrics ? formatCurrency(metrics.outstandingInvoices.total) : '-'}
                  </dd>
                  {metrics && metrics.outstandingInvoices.count > 0 && (
                    <dd className="text-sm text-gray-500">
                      {metrics.outstandingInvoices.count} invoice{metrics.outstandingInvoices.count !== 1 ? 's' : ''}
                    </dd>
                  )}
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Income */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Monthly Income</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {metrics ? formatCurrency(metrics.monthlyIncome.current) : '-'}
                  </dd>
                  {metrics && metrics.monthlyIncome.changePercentage !== 0 && (
                    <dd className={`text-sm ${getChangeColor(metrics.monthlyIncome.change)}`}>
                      {formatPercentage(metrics.monthlyIncome.changePercentage)} from last month
                    </dd>
                  )}
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Expenses */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Monthly Expenses</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {metrics ? formatCurrency(metrics.monthlyExpenses.current) : '-'}
                  </dd>
                  {metrics && metrics.monthlyExpenses.changePercentage !== 0 && (
                    <dd className={`text-sm ${getChangeColor(metrics.monthlyExpenses.change)}`}>
                      {formatPercentage(metrics.monthlyExpenses.changePercentage)} from last month
                    </dd>
                  )}
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Pending Tasks</dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {metrics ? metrics.pendingTasks.toLocaleString() : '-'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Financial Summary
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-500">Current Month Income</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(metrics.monthlyIncome.current)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-500">Current Month Expenses</span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(metrics.monthlyExpenses.current)}
                  </span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-medium text-gray-900">Net Income</span>
                    <span className={`text-base font-medium ${
                      metrics.monthlyIncome.current - metrics.monthlyExpenses.current >= 0 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {formatCurrency(metrics.monthlyIncome.current - metrics.monthlyExpenses.current)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Month-over-Month Changes
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-500">Income Change</span>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${getChangeColor(metrics.monthlyIncome.change)}`}>
                      {formatCurrency(Math.abs(metrics.monthlyIncome.change))}
                    </div>
                    <div className={`text-xs ${getChangeColor(metrics.monthlyIncome.change)}`}>
                      {formatPercentage(metrics.monthlyIncome.changePercentage)}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-500">Expense Change</span>
                  <div className="text-right">
                    <div className={`text-sm font-medium ${getChangeColor(metrics.monthlyExpenses.change)}`}>
                      {formatCurrency(Math.abs(metrics.monthlyExpenses.change))}
                    </div>
                    <div className={`text-xs ${getChangeColor(metrics.monthlyExpenses.change)}`}>
                      {formatPercentage(metrics.monthlyExpenses.changePercentage)}
                    </div>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-medium text-gray-900">Previous Month Net</span>
                    <span className={`text-base font-medium ${
                      metrics.monthlyIncome.previous - metrics.monthlyExpenses.previous >= 0 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {formatCurrency(metrics.monthlyIncome.previous - metrics.monthlyExpenses.previous)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity Placeholder */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Recent Activity
          </h3>
          <p className="text-gray-600">
            Activity tracking will be implemented in future tasks. This dashboard shows real-time business metrics with accurate financial calculations.
          </p>
          {!metrics && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                Unable to load dashboard metrics. Please check your connection and try again.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}