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
import { buildAdvancedFilters, type AdvancedFilterOptions } from '@/lib/utils/search-optimization';

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

      // Use the optimized paginated query builder
      const { createPaginatedQuery } = await import('@/lib/utils/database-pagination');
      
      const result = await createPaginatedQuery<Expense>(context.supabase, 'expenses')
        .select('*')
        .workspace(workspace_id)
        .search(search || '', ['vendor', 'category', 'description'])
        .filter('category', category)
        .filter('vendor', vendor)
        .dateRange('expense_date', date_from, date_to)
        .numberRange('amount', amount_min, amount_max)
        .orderBy('expense_date', 'desc')
        .orderBy('created_at', 'desc')
        .paginate({ page, limit });

      return createSuccessResponse(result);
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
/**
 * Enhanced expense search with advanced filtering and relevance scoring
 */
export const searchExpensesAdvanced = createWorkspaceAction(
  z.object({
    workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
    search: z.string().optional(),
    category: z.string().optional(),
    vendor: z.string().optional(),
    date_from: z.string().optional(),
    date_to: z.string().optional(),
    amount_min: z.number().optional(),
    amount_max: z.number().optional(),
    sort_by: z.enum(['vendor', 'category', 'amount', 'expense_date', 'created_at']).default('expense_date'),
    sort_direction: z.enum(['asc', 'desc']).default('desc'),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
    fuzzy_search: z.boolean().default(false),
  }),
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<{
    expenses: Expense[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
    searchAnalytics?: {
      executionTime: number;
      resultCount: number;
    };
  }>> => {
    try {
      const startTime = Date.now();
      const { 
        workspace_id, 
        search, 
        category,
        vendor,
        date_from, 
        date_to,
        amount_min,
        amount_max,
        sort_by,
        sort_direction,
        page, 
        limit,
        fuzzy_search
      } = input;

      // Build advanced filter options
      const filterOptions: AdvancedFilterOptions = {
        search: search ? {
          query: search,
          fields: ['vendor', 'category', 'description'],
          fuzzyMatch: fuzzy_search,
        } : undefined,
        filters: {
          category: category,
          vendor: vendor,
        },
        dateRanges: {
          expense_date: {
            from: date_from,
            to: date_to,
          },
        },
        numberRanges: {
          amount: {
            min: amount_min,
            max: amount_max,
          },
        },
        sortBy: sort_by,
        sortDirection: sort_direction,
      };

      // Start with base query
      let query = context.supabase
        .from('expenses')
        .select('*', { count: 'exact' })
        .eq('workspace_id', workspace_id);

      // Apply advanced filters
      query = buildAdvancedFilters(query, filterOptions);

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data: expenses, error, count } = await query;

      if (error) {
        throw error;
      }

      const executionTime = Date.now() - startTime;
      const total = count || 0;
      const hasMore = offset + limit < total;

      return createSuccessResponse({
        expenses: expenses as Expense[],
        total,
        page,
        limit,
        hasMore,
        searchAnalytics: {
          executionTime,
          resultCount: expenses?.length || 0,
        },
      });
    } catch (error) {
      console.error('Error in advanced expense search:', error);
      return createErrorResponse('Failed to search expenses');
    }
  },
  {
    requiredRole: 'viewer',
  }
);

/**
 * Get expense search suggestions for autocomplete
 */
export const getExpenseSuggestions = createWorkspaceAction(
  z.object({
    workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
    query: z.string().min(1, 'Query is required'),
    type: z.enum(['vendor', 'category', 'all']).default('all'),
    limit: z.number().int().min(1).max(20).default(10),
  }),
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<{
    suggestions: Array<{
      value: string;
      label: string;
      type: 'vendor' | 'category';
      count?: number;
    }>;
  }>> => {
    try {
      const { workspace_id, query, type, limit } = input;

      const suggestions: Array<{
        value: string;
        label: string;
        type: 'vendor' | 'category';
        count?: number;
      }> = [];

      // Get vendor suggestions
      if (type === 'vendor' || type === 'all') {
        const { data: vendors, error: vendorError } = await context.supabase
          .from('expenses')
          .select('vendor')
          .eq('workspace_id', workspace_id)
          .ilike('vendor', `%${query}%`)
          .order('vendor')
          .limit(limit);

        if (!vendorError && vendors) {
          const uniqueVendors = [...new Set(vendors.map(v => v.vendor))];
          uniqueVendors.forEach(vendor => {
            suggestions.push({
              value: vendor,
              label: vendor,
              type: 'vendor',
            });
          });
        }
      }

      // Get category suggestions
      if (type === 'category' || type === 'all') {
        const { data: categories, error: categoryError } = await context.supabase
          .from('expenses')
          .select('category')
          .eq('workspace_id', workspace_id)
          .ilike('category', `%${query}%`)
          .order('category')
          .limit(limit);

        if (!categoryError && categories) {
          const uniqueCategories = [...new Set(categories.map(c => c.category))];
          uniqueCategories.forEach(category => {
            suggestions.push({
              value: category,
              label: category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
              type: 'category',
            });
          });
        }
      }

      // Sort and limit results
      suggestions.sort((a, b) => a.label.localeCompare(b.label));
      const limitedSuggestions = suggestions.slice(0, limit);

      return createSuccessResponse({ suggestions: limitedSuggestions });
    } catch (error) {
      console.error('Error getting expense suggestions:', error);
      return createErrorResponse('Failed to get expense suggestions');
    }
  },
  {
    requiredRole: 'viewer',
  }
);