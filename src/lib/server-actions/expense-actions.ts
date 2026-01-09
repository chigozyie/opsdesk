'use server';

import { z } from 'zod';
import { 
  createWorkspaceAction, 
  createSuccessResponse, 
  createErrorResponse, 
  handleDatabaseError,
  addAuditFields,
  type ServerActionContext,
  type EnhancedServerActionResult 
} from './index';
import { 
  createExpenseSchema, 
  updateExpenseSchema, 
  expenseFilterSchema,
  expenseReportSchema,
  type Expense
} from '@/lib/validation/schemas/expense';

// Input schema for expense creation with workspace context
const createExpenseInputSchema = createExpenseSchema.extend({
  workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
});

// Input schema for expense update with IDs
const updateExpenseInputSchema = updateExpenseSchema.extend({
  id: z.string().uuid({ message: 'Invalid expense ID' }),
  workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
});

// Input schema for expense deletion
const deleteExpenseInputSchema = z.object({
  id: z.string().uuid({ message: 'Invalid expense ID' }),
  workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
});

/**
 * Creates a new expense
 */
export const createExpense = createWorkspaceAction(
  createExpenseInputSchema,
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<Expense>> => {
    try {
      const { workspace_id, ...expenseData } = input;

      // Validate expense date is not in the future
      const expenseDate = new Date(expenseData.expense_date);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today

      if (expenseDate > today) {
        return createErrorResponse('Expense date cannot be in the future');
      }

      // Create expense with audit fields
      const expenseCreateData = addAuditFields(
        {
          workspace_id,
          ...expenseData,
        },
        context.user.id
      );

      const { data: expense, error } = await context.supabase
        .from('expenses')
        .insert(expenseCreateData)
        .select()
        .single();

      if (error) {
        return handleDatabaseError(error, 'create expense');
      }

      return createSuccessResponse(expense as Expense, 'Expense created successfully');
    } catch (error) {
      console.error('Error creating expense:', error);
      return createErrorResponse('Failed to create expense');
    }
  },
  {
    requiredRole: 'member',
    auditAction: 'create',
    auditResourceType: 'expense',
  }
);

/**
 * Updates an existing expense
 */
export const updateExpense = createWorkspaceAction(
  updateExpenseInputSchema,
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<Expense>> => {
    try {
      const { id, workspace_id, ...updateData } = input;

      // Check if expense exists and belongs to workspace
      const { data: existingExpense } = await context.supabase
        .from('expenses')
        .select('id, expense_date')
        .eq('id', id)
        .eq('workspace_id', workspace_id)
        .single();

      if (!existingExpense) {
        return createErrorResponse('Expense not found');
      }

      // Validate expense date is not in the future if being updated
      if (updateData.expense_date) {
        const expenseDate = new Date(updateData.expense_date);
        const today = new Date();
        today.setHours(23, 59, 59, 999); // End of today

        if (expenseDate > today) {
          return createErrorResponse('Expense date cannot be in the future');
        }
      }

      // Update expense with audit fields
      const expenseUpdateData = addAuditFields(updateData, context.user.id, true);

      const { data: expense, error } = await context.supabase
        .from('expenses')
        .update(expenseUpdateData)
        .eq('id', id)
        .eq('workspace_id', workspace_id)
        .select()
        .single();

      if (error) {
        return handleDatabaseError(error, 'update expense');
      }

      return createSuccessResponse(expense as Expense, 'Expense updated successfully');
    } catch (error) {
      console.error('Error updating expense:', error);
      return createErrorResponse('Failed to update expense');
    }
  },
  {
    requiredRole: 'member',
    auditAction: 'update',
    auditResourceType: 'expense',
  }
);

/**
 * Deletes an expense
 */
export const deleteExpense = createWorkspaceAction(
  deleteExpenseInputSchema,
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<void>> => {
    try {
      const { id, workspace_id } = input;

      // Check if expense exists and belongs to workspace
      const { data: existingExpense } = await context.supabase
        .from('expenses')
        .select('id')
        .eq('id', id)
        .eq('workspace_id', workspace_id)
        .single();

      if (!existingExpense) {
        return createErrorResponse('Expense not found');
      }

      // Delete expense
      const { error } = await context.supabase
        .from('expenses')
        .delete()
        .eq('id', id)
        .eq('workspace_id', workspace_id);

      if (error) {
        return handleDatabaseError(error, 'delete expense');
      }

      return createSuccessResponse(undefined, 'Expense deleted successfully');
    } catch (error) {
      console.error('Error deleting expense:', error);
      return createErrorResponse('Failed to delete expense');
    }
  },
  {
    requiredRole: 'member',
    auditAction: 'delete',
    auditResourceType: 'expense',
  }
);

/**
 * Gets expenses for a workspace with filtering and pagination
 */
export const getExpenses = createWorkspaceAction(
  expenseFilterSchema.extend({
    workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
  }),
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<{
    expenses: Expense[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }>> => {
    try {
      const { 
        workspace_id, 
        search, 
        category, 
        vendor, 
        date_from, 
        date_to, 
        amount_min, 
        amount_max, 
        page, 
        limit 
      } = input;
      const offset = (page - 1) * limit;

      let query = context.supabase
        .from('expenses')
        .select('*', { count: 'exact' })
        .eq('workspace_id', workspace_id);

      // Apply filters
      if (category) {
        query = query.eq('category', category);
      }

      if (vendor) {
        query = query.eq('vendor', vendor);
      }

      if (date_from) {
        query = query.gte('expense_date', date_from);
      }

      if (date_to) {
        query = query.lte('expense_date', date_to);
      }

      if (typeof amount_min === 'number') {
        query = query.gte('amount', amount_min);
      }

      if (typeof amount_max === 'number') {
        query = query.lte('amount', amount_max);
      }

      if (search) {
        query = query.or(`vendor.ilike.%${search}%,category.ilike.%${search}%,description.ilike.%${search}%`);
      }

      // Apply pagination and ordering
      query = query
        .order('expense_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: expenses, error, count } = await query;

      if (error) {
        return handleDatabaseError(error, 'fetch expenses');
      }

      const total = count || 0;
      const hasMore = offset + limit < total;

      return createSuccessResponse({
        expenses: expenses as Expense[],
        total,
        page,
        limit,
        hasMore,
      });
    } catch (error) {
      console.error('Error fetching expenses:', error);
      return createErrorResponse('Failed to fetch expenses');
    }
  },
  {
    requiredRole: 'viewer',
  }
);

/**
 * Gets a single expense by ID
 */
export const getExpense = createWorkspaceAction(
  z.object({
    id: z.string().uuid({ message: 'Invalid expense ID' }),
    workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
  }),
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<Expense>> => {
    try {
      const { id, workspace_id } = input;

      const { data: expense, error } = await context.supabase
        .from('expenses')
        .select('*')
        .eq('id', id)
        .eq('workspace_id', workspace_id)
        .single();

      if (error || !expense) {
        return createErrorResponse('Expense not found');
      }

      return createSuccessResponse(expense as Expense);
    } catch (error) {
      console.error('Error fetching expense:', error);
      return createErrorResponse('Failed to fetch expense');
    }
  },
  {
    requiredRole: 'viewer',
  }
);

/**
 * Gets expense categories for a workspace
 */
export const getExpenseCategories = createWorkspaceAction(
  z.object({
    workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
  }),
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<string[]>> => {
    try {
      const { workspace_id } = input;

      const { data: categories, error } = await context.supabase
        .from('expenses')
        .select('category')
        .eq('workspace_id', workspace_id)
        .order('category');

      if (error) {
        return handleDatabaseError(error, 'fetch expense categories');
      }

      // Get unique categories
      const uniqueCategories = [...new Set(categories.map(item => item.category))];

      return createSuccessResponse(uniqueCategories);
    } catch (error) {
      console.error('Error fetching expense categories:', error);
      return createErrorResponse('Failed to fetch expense categories');
    }
  },
  {
    requiredRole: 'viewer',
  }
);

/**
 * Gets expense vendors for a workspace
 */
export const getExpenseVendors = createWorkspaceAction(
  z.object({
    workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
  }),
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<string[]>> => {
    try {
      const { workspace_id } = input;

      const { data: vendors, error } = await context.supabase
        .from('expenses')
        .select('vendor')
        .eq('workspace_id', workspace_id)
        .order('vendor');

      if (error) {
        return handleDatabaseError(error, 'fetch expense vendors');
      }

      // Get unique vendors
      const uniqueVendors = [...new Set(vendors.map(item => item.vendor))];

      return createSuccessResponse(uniqueVendors);
    } catch (error) {
      console.error('Error fetching expense vendors:', error);
      return createErrorResponse('Failed to fetch expense vendors');
    }
  },
  {
    requiredRole: 'viewer',
  }
);

/**
 * Generates expense report for a date range
 */
export const generateExpenseReport = createWorkspaceAction(
  expenseReportSchema.extend({
    workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
  }),
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<{
    summary: {
      total_amount: number;
      total_count: number;
      date_range: { from: string; to: string };
    };
    by_category: Array<{ category: string; amount: number; count: number }>;
    by_vendor: Array<{ vendor: string; amount: number; count: number }>;
    by_month: Array<{ month: string; amount: number; count: number }>;
    expenses: Expense[];
  }>> => {
    try {
      const { workspace_id, date_from, date_to, categories, vendors } = input;

      let query = context.supabase
        .from('expenses')
        .select('*')
        .eq('workspace_id', workspace_id)
        .gte('expense_date', date_from)
        .lte('expense_date', date_to);

      if (categories && categories.length > 0) {
        query = query.in('category', categories);
      }

      if (vendors && vendors.length > 0) {
        query = query.in('vendor', vendors);
      }

      query = query.order('expense_date', { ascending: false });

      const { data: expenses, error } = await query;

      if (error) {
        return handleDatabaseError(error, 'generate expense report');
      }

      const expenseList = expenses as Expense[];

      // Calculate summary
      const totalAmount = expenseList.reduce((sum, expense) => sum + expense.amount, 0);
      const totalCount = expenseList.length;

      // Group by category
      const categoryMap = new Map<string, { amount: number; count: number }>();
      expenseList.forEach(expense => {
        const existing = categoryMap.get(expense.category) || { amount: 0, count: 0 };
        categoryMap.set(expense.category, {
          amount: existing.amount + expense.amount,
          count: existing.count + 1,
        });
      });

      const byCategory = Array.from(categoryMap.entries())
        .map(([category, data]) => ({ category, ...data }))
        .sort((a, b) => b.amount - a.amount);

      // Group by vendor
      const vendorMap = new Map<string, { amount: number; count: number }>();
      expenseList.forEach(expense => {
        const existing = vendorMap.get(expense.vendor) || { amount: 0, count: 0 };
        vendorMap.set(expense.vendor, {
          amount: existing.amount + expense.amount,
          count: existing.count + 1,
        });
      });

      const byVendor = Array.from(vendorMap.entries())
        .map(([vendor, data]) => ({ vendor, ...data }))
        .sort((a, b) => b.amount - a.amount);

      // Group by month
      const monthMap = new Map<string, { amount: number; count: number }>();
      expenseList.forEach(expense => {
        const month = expense.expense_date.substring(0, 7); // YYYY-MM
        const existing = monthMap.get(month) || { amount: 0, count: 0 };
        monthMap.set(month, {
          amount: existing.amount + expense.amount,
          count: existing.count + 1,
        });
      });

      const byMonth = Array.from(monthMap.entries())
        .map(([month, data]) => ({ month, ...data }))
        .sort((a, b) => a.month.localeCompare(b.month));

      return createSuccessResponse({
        summary: {
          total_amount: Math.round(totalAmount * 100) / 100,
          total_count: totalCount,
          date_range: { from: date_from, to: date_to },
        },
        by_category: byCategory,
        by_vendor: byVendor,
        by_month: byMonth,
        expenses: expenseList,
      });
    } catch (error) {
      console.error('Error generating expense report:', error);
      return createErrorResponse('Failed to generate expense report');
    }
  },
  {
    requiredRole: 'viewer',
  }
);