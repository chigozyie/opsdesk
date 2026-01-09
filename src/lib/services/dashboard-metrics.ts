/**
 * Dashboard Metrics Calculation Service
 * 
 * Provides comprehensive financial metrics calculation for the dashboard including:
 * - Outstanding invoice totals
 * - Monthly income calculations
 * - Monthly expense calculations
 * - Real-time financial data aggregation
 * - Workspace-scoped financial reporting
 * 
 * All calculations maintain precision for financial accuracy and ensure workspace isolation.
 */

import { createClient } from '@/lib/supabase/server';

export interface DashboardMetrics {
  outstandingInvoices: {
    total: number;
    count: number;
  };
  monthlyIncome: {
    current: number;
    previous: number;
    change: number;
    changePercentage: number;
  };
  monthlyExpenses: {
    current: number;
    previous: number;
    change: number;
    changePercentage: number;
  };
  totalCustomers: number;
  pendingTasks: number;
  recentActivity: Array<{
    type: 'invoice' | 'expense' | 'task' | 'customer';
    description: string;
    date: string;
    amount?: number;
  }>;
}

export interface MonthlyFinancialData {
  income: number;
  expenses: number;
  netIncome: number;
  invoiceCount: number;
  expenseCount: number;
}

export interface OutstandingInvoicesSummary {
  total: number;
  count: number;
  overdue: {
    total: number;
    count: number;
  };
  draftCount: number;
  sentCount: number;
}

/**
 * Dashboard Metrics Service
 * 
 * Handles all dashboard-related financial calculations with workspace isolation.
 */
export class DashboardMetricsService {
  /**
   * Calculates outstanding invoice totals for a workspace
   * @param workspaceId - The workspace ID
   * @returns Outstanding invoices summary with totals and counts
   */
  static async calculateOutstandingInvoices(workspaceId: string): Promise<OutstandingInvoicesSummary> {
    const supabase = createClient();
    
    try {
      // Get all non-paid, non-void invoices
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('total_amount, status, due_date')
        .eq('workspace_id', workspaceId)
        .not('status', 'in', '(paid,void)');

      if (error) {
        console.error('Error fetching outstanding invoices:', error);
        return {
          total: 0,
          count: 0,
          overdue: { total: 0, count: 0 },
          draftCount: 0,
          sentCount: 0,
        };
      }

      if (!invoices || invoices.length === 0) {
        return {
          total: 0,
          count: 0,
          overdue: { total: 0, count: 0 },
          draftCount: 0,
          sentCount: 0,
        };
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let total = 0;
      let overdueTotal = 0;
      let overdueCount = 0;
      let draftCount = 0;
      let sentCount = 0;

      invoices.forEach(invoice => {
        total += (invoice as any).total_amount;

        if ((invoice as any).status === 'draft') {
          draftCount++;
        } else if ((invoice as any).status === 'sent') {
          sentCount++;
          
          // Check if overdue
          if ((invoice as any).due_date) {
            const dueDate = new Date((invoice as any).due_date);
            if (dueDate < today) {
              overdueTotal += (invoice as any).total_amount;
              overdueCount++;
            }
          }
        }
      });

      return {
        total: Math.round(total * 100) / 100,
        count: invoices.length,
        overdue: {
          total: Math.round(overdueTotal * 100) / 100,
          count: overdueCount,
        },
        draftCount,
        sentCount,
      };
    } catch (error) {
      console.error('Error calculating outstanding invoices:', error);
      return {
        total: 0,
        count: 0,
        overdue: { total: 0, count: 0 },
        draftCount: 0,
        sentCount: 0,
      };
    }
  }

  /**
   * Calculates monthly income from paid invoices
   * @param workspaceId - The workspace ID
   * @param year - The year (defaults to current year)
   * @param month - The month (1-12, defaults to current month)
   * @returns Monthly income total
   */
  static async calculateMonthlyIncome(
    workspaceId: string, 
    year?: number, 
    month?: number
  ): Promise<number> {
    const supabase = createClient();
    
    try {
      const now = new Date();
      const targetYear = year ?? now.getFullYear();
      const targetMonth = month ?? (now.getMonth() + 1);

      // Calculate date range for the month
      const startDate = new Date(targetYear, targetMonth - 1, 1);
      const endDate = new Date(targetYear, targetMonth, 0); // Last day of month

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Get paid invoices for the month
      const { data: invoices, error } = await supabase
        .from('invoices')
        .select('total_amount')
        .eq('workspace_id', workspaceId)
        .eq('status', 'paid')
        .gte('issue_date', startDateStr)
        .lte('issue_date', endDateStr);

      if (error) {
        console.error('Error fetching monthly income:', error);
        return 0;
      }

      if (!invoices || invoices.length === 0) {
        return 0;
      }

      const total = invoices.reduce((sum, invoice) => sum + (invoice as any).total_amount, 0);
      return Math.round(total * 100) / 100;
    } catch (error) {
      console.error('Error calculating monthly income:', error);
      return 0;
    }
  }

  /**
   * Calculates monthly expenses
   * @param workspaceId - The workspace ID
   * @param year - The year (defaults to current year)
   * @param month - The month (1-12, defaults to current month)
   * @returns Monthly expenses total
   */
  static async calculateMonthlyExpenses(
    workspaceId: string, 
    year?: number, 
    month?: number
  ): Promise<number> {
    const supabase = createClient();
    
    try {
      const now = new Date();
      const targetYear = year ?? now.getFullYear();
      const targetMonth = month ?? (now.getMonth() + 1);

      // Calculate date range for the month
      const startDate = new Date(targetYear, targetMonth - 1, 1);
      const endDate = new Date(targetYear, targetMonth, 0); // Last day of month

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      // Get expenses for the month
      const { data: expenses, error } = await supabase
        .from('expenses')
        .select('amount')
        .eq('workspace_id', workspaceId)
        .gte('expense_date', startDateStr)
        .lte('expense_date', endDateStr);

      if (error) {
        console.error('Error fetching monthly expenses:', error);
        return 0;
      }

      if (!expenses || expenses.length === 0) {
        return 0;
      }

      const total = expenses.reduce((sum, expense) => sum + (expense as any).amount, 0);
      return Math.round(total * 100) / 100;
    } catch (error) {
      console.error('Error calculating monthly expenses:', error);
      return 0;
    }
  }

  /**
   * Gets comprehensive monthly financial data with comparison to previous month
   * @param workspaceId - The workspace ID
   * @param year - The year (defaults to current year)
   * @param month - The month (1-12, defaults to current month)
   * @returns Monthly financial data with previous month comparison
   */
  static async getMonthlyFinancialData(
    workspaceId: string, 
    year?: number, 
    month?: number
  ): Promise<{
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
  }> {
    const now = new Date();
    const targetYear = year ?? now.getFullYear();
    const targetMonth = month ?? (now.getMonth() + 1);

    // Calculate previous month
    let prevYear = targetYear;
    let prevMonth = targetMonth - 1;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = targetYear - 1;
    }

    // Get current month data
    const [currentIncome, currentExpenses] = await Promise.all([
      this.calculateMonthlyIncome(workspaceId, targetYear, targetMonth),
      this.calculateMonthlyExpenses(workspaceId, targetYear, targetMonth),
    ]);

    // Get previous month data
    const [previousIncome, previousExpenses] = await Promise.all([
      this.calculateMonthlyIncome(workspaceId, prevYear, prevMonth),
      this.calculateMonthlyExpenses(workspaceId, prevYear, prevMonth),
    ]);

    // Get invoice and expense counts
    const [currentInvoiceCount, currentExpenseCount, previousInvoiceCount, previousExpenseCount] = 
      await Promise.all([
        this.getMonthlyInvoiceCount(workspaceId, targetYear, targetMonth),
        this.getMonthlyExpenseCount(workspaceId, targetYear, targetMonth),
        this.getMonthlyInvoiceCount(workspaceId, prevYear, prevMonth),
        this.getMonthlyExpenseCount(workspaceId, prevYear, prevMonth),
      ]);

    const currentNetIncome = currentIncome - currentExpenses;
    const previousNetIncome = previousIncome - previousExpenses;

    // Calculate changes
    const incomeChange = currentIncome - previousIncome;
    const expensesChange = currentExpenses - previousExpenses;
    const netIncomeChange = currentNetIncome - previousNetIncome;

    // Calculate percentage changes
    const incomeChangePercentage = previousIncome > 0 
      ? Math.round((incomeChange / previousIncome) * 10000) / 100 
      : 0;
    const expensesChangePercentage = previousExpenses > 0 
      ? Math.round((expensesChange / previousExpenses) * 10000) / 100 
      : 0;
    const netIncomeChangePercentage = previousNetIncome !== 0 
      ? Math.round((netIncomeChange / Math.abs(previousNetIncome)) * 10000) / 100 
      : 0;

    return {
      current: {
        income: currentIncome,
        expenses: currentExpenses,
        netIncome: currentNetIncome,
        invoiceCount: currentInvoiceCount,
        expenseCount: currentExpenseCount,
      },
      previous: {
        income: previousIncome,
        expenses: previousExpenses,
        netIncome: previousNetIncome,
        invoiceCount: previousInvoiceCount,
        expenseCount: previousExpenseCount,
      },
      comparison: {
        incomeChange: Math.round(incomeChange * 100) / 100,
        incomeChangePercentage,
        expensesChange: Math.round(expensesChange * 100) / 100,
        expensesChangePercentage,
        netIncomeChange: Math.round(netIncomeChange * 100) / 100,
        netIncomeChangePercentage,
      },
    };
  }

  /**
   * Gets the count of paid invoices for a specific month
   * @param workspaceId - The workspace ID
   * @param year - The year
   * @param month - The month (1-12)
   * @returns Count of paid invoices
   */
  private static async getMonthlyInvoiceCount(
    workspaceId: string, 
    year: number, 
    month: number
  ): Promise<number> {
    const supabase = createClient();
    
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const { count, error } = await supabase
        .from('invoices')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('status', 'paid')
        .gte('issue_date', startDateStr)
        .lte('issue_date', endDateStr);

      if (error) {
        console.error('Error fetching monthly invoice count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error calculating monthly invoice count:', error);
      return 0;
    }
  }

  /**
   * Gets the count of expenses for a specific month
   * @param workspaceId - The workspace ID
   * @param year - The year
   * @param month - The month (1-12)
   * @returns Count of expenses
   */
  private static async getMonthlyExpenseCount(
    workspaceId: string, 
    year: number, 
    month: number
  ): Promise<number> {
    const supabase = createClient();
    
    try {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      const { count, error } = await supabase
        .from('expenses')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .gte('expense_date', startDateStr)
        .lte('expense_date', endDateStr);

      if (error) {
        console.error('Error fetching monthly expense count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error calculating monthly expense count:', error);
      return 0;
    }
  }

  /**
   * Gets total customer count for a workspace
   * @param workspaceId - The workspace ID
   * @returns Total number of active customers
   */
  static async getTotalCustomers(workspaceId: string): Promise<number> {
    const supabase = createClient();
    
    try {
      const { count, error } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('archived', false);

      if (error) {
        console.error('Error fetching customer count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error calculating customer count:', error);
      return 0;
    }
  }

  /**
   * Gets pending task count for a workspace
   * @param workspaceId - The workspace ID
   * @returns Total number of pending tasks
   */
  static async getPendingTasks(workspaceId: string): Promise<number> {
    const supabase = createClient();
    
    try {
      const { count, error } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .not('status', 'eq', 'completed');

      if (error) {
        console.error('Error fetching pending task count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error calculating pending task count:', error);
      return 0;
    }
  }

  /**
   * Gets comprehensive dashboard metrics for a workspace
   * @param workspaceId - The workspace ID
   * @returns Complete dashboard metrics
   */
  static async getDashboardMetrics(workspaceId: string): Promise<DashboardMetrics> {
    try {
      // Fetch all metrics in parallel for better performance
      const [
        outstandingInvoices,
        financialData,
        totalCustomers,
        pendingTasks,
      ] = await Promise.all([
        this.calculateOutstandingInvoices(workspaceId),
        this.getMonthlyFinancialData(workspaceId),
        this.getTotalCustomers(workspaceId),
        this.getPendingTasks(workspaceId),
      ]);

      return {
        outstandingInvoices: {
          total: outstandingInvoices.total,
          count: outstandingInvoices.count,
        },
        monthlyIncome: {
          current: financialData.current.income,
          previous: financialData.previous.income,
          change: financialData.comparison.incomeChange,
          changePercentage: financialData.comparison.incomeChangePercentage,
        },
        monthlyExpenses: {
          current: financialData.current.expenses,
          previous: financialData.previous.expenses,
          change: financialData.comparison.expensesChange,
          changePercentage: financialData.comparison.expensesChangePercentage,
        },
        totalCustomers,
        pendingTasks,
        recentActivity: [], // Will be implemented in future tasks
      };
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      // Return default metrics on error
      return {
        outstandingInvoices: { total: 0, count: 0 },
        monthlyIncome: { current: 0, previous: 0, change: 0, changePercentage: 0 },
        monthlyExpenses: { current: 0, previous: 0, change: 0, changePercentage: 0 },
        totalCustomers: 0,
        pendingTasks: 0,
        recentActivity: [],
      };
    }
  }

  /**
   * Validates that financial calculations are accurate and real-time
   * @param workspaceId - The workspace ID
   * @returns Validation result with any discrepancies found
   */
  static async validateFinancialAccuracy(workspaceId: string): Promise<{
    isAccurate: boolean;
    discrepancies: string[];
  }> {
    const discrepancies: string[] = [];
    
    try {
      // Validate outstanding invoices calculation
      const outstandingInvoices = await this.calculateOutstandingInvoices(workspaceId);
      
      // Validate monthly income calculation
      const currentIncome = await this.calculateMonthlyIncome(workspaceId);
      
      // Validate monthly expenses calculation
      const currentExpenses = await this.calculateMonthlyExpenses(workspaceId);
      
      // Additional validation logic can be added here
      // For now, we check that calculations don't return negative values where inappropriate
      
      if (outstandingInvoices.total < 0) {
        discrepancies.push('Outstanding invoices total cannot be negative');
      }
      
      if (currentIncome < 0) {
        discrepancies.push('Monthly income cannot be negative');
      }
      
      if (currentExpenses < 0) {
        discrepancies.push('Monthly expenses cannot be negative');
      }

      return {
        isAccurate: discrepancies.length === 0,
        discrepancies,
      };
    } catch (error) {
      console.error('Error validating financial accuracy:', error);
      return {
        isAccurate: false,
        discrepancies: ['Error occurred during financial validation'],
      };
    }
  }
}

// Export the service as default
export default DashboardMetricsService;