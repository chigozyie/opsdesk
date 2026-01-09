/**
 * Database pagination utilities for efficient querying with proper indexing
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { validatePaginationParams, createPaginationResult, calculateOffset } from './pagination';

export interface DatabasePaginationOptions {
  page?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface FilterOptions {
  search?: string;
  searchFields?: string[];
  filters?: Record<string, any>;
  dateFilters?: {
    field: string;
    from?: string;
    to?: string;
  }[];
}

/**
 * Applies pagination to a Supabase query
 */
export function applyPagination<T>(
  query: any,
  options: DatabasePaginationOptions = {}
) {
  const { page, limit } = validatePaginationParams(options);
  const offset = calculateOffset(page, limit);

  // Apply ordering
  if (options.orderBy) {
    query = query.order(options.orderBy, { 
      ascending: options.orderDirection === 'asc' 
    });
  }

  // Apply pagination
  return query.range(offset, offset + limit - 1);
}

/**
 * Applies search and filtering to a Supabase query
 */
export function applyFilters(
  query: any,
  filters: FilterOptions = {}
) {
  // Apply search across multiple fields
  if (filters.search && filters.searchFields && filters.searchFields.length > 0) {
    const searchPattern = `%${filters.search}%`;
    const searchConditions = filters.searchFields
      .map(field => `${field}.ilike.${searchPattern}`)
      .join(',');
    query = query.or(searchConditions);
  }

  // Apply exact match filters
  if (filters.filters) {
    Object.entries(filters.filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          query = query.in(key, value);
        } else {
          query = query.eq(key, value);
        }
      }
    });
  }

  // Apply date range filters
  if (filters.dateFilters) {
    filters.dateFilters.forEach(({ field, from, to }) => {
      if (from) {
        query = query.gte(field, from);
      }
      if (to) {
        query = query.lte(field, to);
      }
    });
  }

  return query;
}

/**
 * Executes a paginated query with count
 */
export async function executePaginatedQuery<T>(
  supabase: SupabaseClient,
  tableName: string,
  options: DatabasePaginationOptions & FilterOptions & {
    select?: string;
    workspaceId?: string;
  } = {}
) {
  const { page, limit } = validatePaginationParams(options);
  
  // Build base query
  let query = supabase
    .from(tableName)
    .select(options.select || '*', { count: 'exact' });

  // Apply workspace filtering if provided
  if (options.workspaceId) {
    query = query.eq('workspace_id', options.workspaceId);
  }

  // Apply filters
  query = applyFilters(query, options);

  // Apply pagination
  query = applyPagination(query, options);

  // Execute query
  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  return createPaginationResult(
    data as T[],
    count || 0,
    page,
    limit
  );
}

/**
 * Database indexing recommendations for optimal pagination performance
 */
export const RECOMMENDED_INDEXES = {
  customers: [
    'CREATE INDEX IF NOT EXISTS idx_customers_workspace_created_at ON customers(workspace_id, created_at DESC);',
    'CREATE INDEX IF NOT EXISTS idx_customers_workspace_name ON customers(workspace_id, name);',
    'CREATE INDEX IF NOT EXISTS idx_customers_workspace_archived ON customers(workspace_id, archived);',
    'CREATE INDEX IF NOT EXISTS idx_customers_search ON customers USING gin(to_tsvector(\'english\', name || \' \' || COALESCE(email, \'\') || \' \' || COALESCE(phone, \'\')));',
  ],
  invoices: [
    'CREATE INDEX IF NOT EXISTS idx_invoices_workspace_created_at ON invoices(workspace_id, created_at DESC);',
    'CREATE INDEX IF NOT EXISTS idx_invoices_workspace_status ON invoices(workspace_id, status);',
    'CREATE INDEX IF NOT EXISTS idx_invoices_workspace_customer ON invoices(workspace_id, customer_id);',
    'CREATE INDEX IF NOT EXISTS idx_invoices_workspace_issue_date ON invoices(workspace_id, issue_date DESC);',
    'CREATE INDEX IF NOT EXISTS idx_invoices_search ON invoices USING gin(to_tsvector(\'english\', invoice_number || \' \' || COALESCE(notes, \'\')));',
  ],
  expenses: [
    'CREATE INDEX IF NOT EXISTS idx_expenses_workspace_expense_date ON expenses(workspace_id, expense_date DESC);',
    'CREATE INDEX IF NOT EXISTS idx_expenses_workspace_category ON expenses(workspace_id, category);',
    'CREATE INDEX IF NOT EXISTS idx_expenses_workspace_vendor ON expenses(workspace_id, vendor);',
    'CREATE INDEX IF NOT EXISTS idx_expenses_workspace_amount ON expenses(workspace_id, amount);',
    'CREATE INDEX IF NOT EXISTS idx_expenses_search ON expenses USING gin(to_tsvector(\'english\', vendor || \' \' || category || \' \' || COALESCE(description, \'\')));',
  ],
  tasks: [
    'CREATE INDEX IF NOT EXISTS idx_tasks_workspace_created_at ON tasks(workspace_id, created_at DESC);',
    'CREATE INDEX IF NOT EXISTS idx_tasks_workspace_status ON tasks(workspace_id, status);',
    'CREATE INDEX IF NOT EXISTS idx_tasks_workspace_assigned_to ON tasks(workspace_id, assigned_to);',
    'CREATE INDEX IF NOT EXISTS idx_tasks_workspace_due_date ON tasks(workspace_id, due_date);',
    'CREATE INDEX IF NOT EXISTS idx_tasks_search ON tasks USING gin(to_tsvector(\'english\', title || \' \' || COALESCE(description, \'\')));',
  ],
};

/**
 * Optimized query builders for common pagination patterns
 */
export class PaginatedQueryBuilder<T> {
  private query: any;
  private supabase: SupabaseClient;
  private tableName: string;

  constructor(supabase: SupabaseClient, tableName: string) {
    this.supabase = supabase;
    this.tableName = tableName;
    this.query = supabase.from(tableName);
  }

  select(columns: string = '*') {
    this.query = this.query.select(columns, { count: 'exact' });
    return this;
  }

  workspace(workspaceId: string) {
    this.query = this.query.eq('workspace_id', workspaceId);
    return this;
  }

  search(searchTerm: string, fields: string[]) {
    if (searchTerm && fields.length > 0) {
      const searchPattern = `%${searchTerm}%`;
      const searchConditions = fields
        .map(field => `${field}.ilike.${searchPattern}`)
        .join(',');
      this.query = this.query.or(searchConditions);
    }
    return this;
  }

  filter(field: string, value: any) {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        this.query = this.query.in(field, value);
      } else {
        this.query = this.query.eq(field, value);
      }
    }
    return this;
  }

  dateRange(field: string, from?: string, to?: string) {
    if (from) {
      this.query = this.query.gte(field, from);
    }
    if (to) {
      this.query = this.query.lte(field, to);
    }
    return this;
  }

  numberRange(field: string, min?: number, max?: number) {
    if (typeof min === 'number') {
      this.query = this.query.gte(field, min);
    }
    if (typeof max === 'number') {
      this.query = this.query.lte(field, max);
    }
    return this;
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'desc') {
    this.query = this.query.order(field, { ascending: direction === 'asc' });
    return this;
  }

  async paginate(options: DatabasePaginationOptions = {}) {
    const { page, limit } = validatePaginationParams(options);
    const offset = calculateOffset(page, limit);

    // Apply pagination
    const paginatedQuery = this.query.range(offset, offset + limit - 1);

    // Execute query
    const { data, error, count } = await paginatedQuery;

    if (error) {
      throw error;
    }

    return createPaginationResult(
      data as T[],
      count || 0,
      page,
      limit
    );
  }
}

/**
 * Creates a new paginated query builder
 */
export function createPaginatedQuery<T>(
  supabase: SupabaseClient,
  tableName: string
): PaginatedQueryBuilder<T> {
  return new PaginatedQueryBuilder<T>(supabase, tableName);
}