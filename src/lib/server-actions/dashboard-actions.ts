'use server';

import { z } from 'zod';
import { 
  createWorkspaceAction, 
  createSuccessResponse, 
  createErrorResponse,
  type ServerActionContext,
  type EnhancedServerActionResult 
} from './index';
import { 
  DashboardMetricsService,
  type DashboardMetrics,
  type MonthlyFinancialData,
  type OutstandingInvoicesSummary
} from '@/lib/services/dashboard-metrics';

// Input schema for dashboard metrics
const getDashboardMetricsInputSchema = z.object({
  workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
});

// Input schema for monthly financial data
const getMonthlyFinancialDataInputSchema = z.object({
  workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
  year: z.number().int().min(2000).max(3000).optional(),
  month: z.number().int().min(1).max(12).optional(),
});

// Input schema for outstanding invoices
const getOutstandingInvoicesInputSchema = z.object({
  workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
});

// Input schema for monthly income
const getMonthlyIncomeInputSchema = z.object({
  workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
  year: z.number().int().min(2000).max(3000).optional(),
  month: z.number().int().min(1).max(12).optional(),
});

// Input schema for monthly expenses
const getMonthlyExpensesInputSchema = z.object({
  workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
  year: z.number().int().min(2000).max(3000).optional(),
  month: z.number().int().min(1).max(12).optional(),
});

/**
 * Gets comprehensive dashboard metrics for a workspace
 */
export const getDashboardMetrics = createWorkspaceAction(
  getDashboardMetricsInputSchema,
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<DashboardMetrics>> => {
    try {
      const { workspace_id } = input;

      const metrics = await DashboardMetricsService.getDashboardMetrics(workspace_id);

      return createSuccessResponse(metrics);
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      return createErrorResponse('Failed to fetch dashboard metrics');
    }
  },
  {
    requiredRole: 'viewer',
  }
);

/**
 * Gets outstanding invoices summary for a workspace
 */
export const getOutstandingInvoices = createWorkspaceAction(
  getOutstandingInvoicesInputSchema,
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<OutstandingInvoicesSummary>> => {
    try {
      const { workspace_id } = input;

      const outstandingInvoices = await DashboardMetricsService.calculateOutstandingInvoices(workspace_id);

      return createSuccessResponse(outstandingInvoices);
    } catch (error) {
      console.error('Error fetching outstanding invoices:', error);
      return createErrorResponse('Failed to fetch outstanding invoices');
    }
  },
  {
    requiredRole: 'viewer',
  }
);

/**
 * Gets monthly income for a workspace
 */
export const getMonthlyIncome = createWorkspaceAction(
  getMonthlyIncomeInputSchema,
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<number>> => {
    try {
      const { workspace_id, year, month } = input;

      const monthlyIncome = await DashboardMetricsService.calculateMonthlyIncome(
        workspace_id, 
        year, 
        month
      );

      return createSuccessResponse(monthlyIncome);
    } catch (error) {
      console.error('Error fetching monthly income:', error);
      return createErrorResponse('Failed to fetch monthly income');
    }
  },
  {
    requiredRole: 'viewer',
  }
);

/**
 * Gets monthly expenses for a workspace
 */
export const getMonthlyExpenses = createWorkspaceAction(
  getMonthlyExpensesInputSchema,
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<number>> => {
    try {
      const { workspace_id, year, month } = input;

      const monthlyExpenses = await DashboardMetricsService.calculateMonthlyExpenses(
        workspace_id, 
        year, 
        month
      );

      return createSuccessResponse(monthlyExpenses);
    } catch (error) {
      console.error('Error fetching monthly expenses:', error);
      return createErrorResponse('Failed to fetch monthly expenses');
    }
  },
  {
    requiredRole: 'viewer',
  }
);

/**
 * Gets comprehensive monthly financial data with comparison
 */
export const getMonthlyFinancialData = createWorkspaceAction(
  getMonthlyFinancialDataInputSchema,
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<{
    current: MonthlyFinancialData;
    previous: MonthlyFinancialData;
    comparison: {
      incomeChange: number;
      incomeChangePercentage: number;
      expensesChange: number;
      expensesChangePercentage: number;
      netIncomeChange: number;
      netIncomeChangePercentage: number;
    };
  }>> => {
    try {
      const { workspace_id, year, month } = input;

      const financialData = await DashboardMetricsService.getMonthlyFinancialData(
        workspace_id, 
        year, 
        month
      );

      return createSuccessResponse(financialData);
    } catch (error) {
      console.error('Error fetching monthly financial data:', error);
      return createErrorResponse('Failed to fetch monthly financial data');
    }
  },
  {
    requiredRole: 'viewer',
  }
);

/**
 * Gets total customer count for a workspace
 */
export const getTotalCustomers = createWorkspaceAction(
  z.object({
    workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
  }),
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<number>> => {
    try {
      const { workspace_id } = input;

      const totalCustomers = await DashboardMetricsService.getTotalCustomers(workspace_id);

      return createSuccessResponse(totalCustomers);
    } catch (error) {
      console.error('Error fetching total customers:', error);
      return createErrorResponse('Failed to fetch total customers');
    }
  },
  {
    requiredRole: 'viewer',
  }
);

/**
 * Gets pending task count for a workspace
 */
export const getPendingTasks = createWorkspaceAction(
  z.object({
    workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
  }),
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<number>> => {
    try {
      const { workspace_id } = input;

      const pendingTasks = await DashboardMetricsService.getPendingTasks(workspace_id);

      return createSuccessResponse(pendingTasks);
    } catch (error) {
      console.error('Error fetching pending tasks:', error);
      return createErrorResponse('Failed to fetch pending tasks');
    }
  },
  {
    requiredRole: 'viewer',
  }
);

/**
 * Validates financial calculation accuracy
 */
export const validateFinancialAccuracy = createWorkspaceAction(
  z.object({
    workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
  }),
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<{
    isAccurate: boolean;
    discrepancies: string[];
  }>> => {
    try {
      const { workspace_id } = input;

      const validation = await DashboardMetricsService.validateFinancialAccuracy(workspace_id);

      return createSuccessResponse(validation);
    } catch (error) {
      console.error('Error validating financial accuracy:', error);
      return createErrorResponse('Failed to validate financial accuracy');
    }
  },
  {
    requiredRole: 'viewer',
  }
);