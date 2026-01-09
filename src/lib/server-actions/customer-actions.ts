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
  createCustomerSchema, 
  updateCustomerSchema, 
  customerFilterSchema,
  type Customer 
} from '@/lib/validation/schemas/customer';
import { buildAdvancedFilters, type AdvancedFilterOptions } from '@/lib/utils/search-optimization';

// Input schema for customer creation with workspace context
const createCustomerInputSchema = createCustomerSchema.extend({
  workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
});

// Input schema for customer update with IDs
const updateCustomerInputSchema = updateCustomerSchema.extend({
  id: z.string().uuid({ message: 'Invalid customer ID' }),
  workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
});

// Input schema for customer deletion
const deleteCustomerInputSchema = z.object({
  id: z.string().uuid({ message: 'Invalid customer ID' }),
  workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
});

// Input schema for customer archival
const archiveCustomerInputSchema = z.object({
  id: z.string().uuid({ message: 'Invalid customer ID' }),
  workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
  archived: z.boolean(),
});

/**
 * Creates a new customer
 */
export const createCustomer = createWorkspaceAction(
  createCustomerInputSchema,
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<Customer>> => {
    try {
      // Check if customer with same name already exists in workspace
      const { data: existingCustomer } = await context.supabase
        .from('customers')
        .select('id')
        .eq('workspace_id', input.workspace_id)
        .eq('name', input.name)
        .eq('archived', false)
        .single();

      if (existingCustomer) {
        return createErrorResponse('A customer with this name already exists in your workspace');
      }

      // Create customer with audit fields
      const customerData = addAuditFields(
        {
          workspace_id: input.workspace_id,
          name: input.name,
          email: input.email,
          phone: input.phone,
          address: input.address,
          archived: false,
        },
        context.user.id
      );

      const { data: customer, error } = await context.supabase
        .from('customers')
        .insert(customerData)
        .select()
        .single();

      if (error) {
        return handleDatabaseError(error, 'create customer');
      }

      return createSuccessResponse(customer as Customer, 'Customer created successfully');
    } catch (error) {
      console.error('Error creating customer:', error);
      return createErrorResponse('Failed to create customer');
    }
  },
  {
    requiredRole: 'member',
    auditAction: 'create',
    auditResourceType: 'customer',
  }
);

/**
 * Updates an existing customer
 */
export const updateCustomer = createWorkspaceAction(
  updateCustomerInputSchema,
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<Customer>> => {
    try {
      const { id, workspace_id, ...updateData } = input;

      // Check if customer exists and belongs to workspace
      const { data: existingCustomer } = await context.supabase
        .from('customers')
        .select('id, name')
        .eq('id', id)
        .eq('workspace_id', workspace_id)
        .single();

      if (!existingCustomer) {
        return createErrorResponse('Customer not found');
      }

      // Check for name conflicts if name is being updated
      if (updateData.name && updateData.name !== existingCustomer.name) {
        const { data: nameConflict } = await context.supabase
          .from('customers')
          .select('id')
          .eq('workspace_id', workspace_id)
          .eq('name', updateData.name)
          .eq('archived', false)
          .neq('id', id)
          .single();

        if (nameConflict) {
          return createErrorResponse('A customer with this name already exists in your workspace');
        }
      }

      // Update customer with audit fields
      const customerData = addAuditFields(updateData, context.user.id, true);

      const { data: customer, error } = await context.supabase
        .from('customers')
        .update(customerData)
        .eq('id', id)
        .eq('workspace_id', workspace_id)
        .select()
        .single();

      if (error) {
        return handleDatabaseError(error, 'update customer');
      }

      return createSuccessResponse(customer as Customer, 'Customer updated successfully');
    } catch (error) {
      console.error('Error updating customer:', error);
      return createErrorResponse('Failed to update customer');
    }
  },
  {
    requiredRole: 'member',
    auditAction: 'update',
    auditResourceType: 'customer',
  }
);

/**
 * Archives/unarchives a customer (soft delete)
 */
export const archiveCustomer = createWorkspaceAction(
  archiveCustomerInputSchema,
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<Customer>> => {
    try {
      const { id, workspace_id, archived } = input;

      // Check if customer exists and belongs to workspace
      const { data: existingCustomer } = await context.supabase
        .from('customers')
        .select('id, archived')
        .eq('id', id)
        .eq('workspace_id', workspace_id)
        .single();

      if (!existingCustomer) {
        return createErrorResponse('Customer not found');
      }

      if (existingCustomer.archived === archived) {
        return createErrorResponse(
          archived ? 'Customer is already archived' : 'Customer is already active'
        );
      }

      // Update archive status with audit fields
      const updateData = addAuditFields(
        {
          archived,
          archived_at: archived ? new Date().toISOString() : null,
          archived_by: archived ? context.user.id : null,
        },
        context.user.id,
        true
      );

      const { data: customer, error } = await context.supabase
        .from('customers')
        .update(updateData)
        .eq('id', id)
        .eq('workspace_id', workspace_id)
        .select()
        .single();

      if (error) {
        return handleDatabaseError(error, 'archive customer');
      }

      const message = archived ? 'Customer archived successfully' : 'Customer restored successfully';
      return createSuccessResponse(customer as Customer, message);
    } catch (error) {
      console.error('Error archiving customer:', error);
      return createErrorResponse('Failed to archive customer');
    }
  },
  {
    requiredRole: 'member',
    auditAction: 'archive',
    auditResourceType: 'customer',
  }
);

/**
 * Deletes a customer permanently (admin only)
 */
export const deleteCustomer = createWorkspaceAction(
  deleteCustomerInputSchema,
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<void>> => {
    try {
      const { id, workspace_id } = input;

      // Check if customer exists and belongs to workspace
      const { data: existingCustomer } = await context.supabase
        .from('customers')
        .select('id')
        .eq('id', id)
        .eq('workspace_id', workspace_id)
        .single();

      if (!existingCustomer) {
        return createErrorResponse('Customer not found');
      }

      // Check if customer has associated invoices
      const { data: invoices } = await context.supabase
        .from('invoices')
        .select('id')
        .eq('customer_id', id)
        .limit(1);

      if (invoices && invoices.length > 0) {
        return createErrorResponse('Cannot delete customer with existing invoices. Archive the customer instead.');
      }

      // Delete customer
      const { error } = await context.supabase
        .from('customers')
        .delete()
        .eq('id', id)
        .eq('workspace_id', workspace_id);

      if (error) {
        return handleDatabaseError(error, 'delete customer');
      }

      return createSuccessResponse(undefined, 'Customer deleted successfully');
    } catch (error) {
      console.error('Error deleting customer:', error);
      return createErrorResponse('Failed to delete customer');
    }
  },
  {
    requiredRole: 'admin',
    auditAction: 'delete',
    auditResourceType: 'customer',
  }
);

/**
 * Gets customers for a workspace with filtering and pagination
 */
export const getCustomers = createWorkspaceAction(
  customerFilterSchema.extend({
    workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
  }),
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<{
    customers: Customer[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }>> => {
    try {
      const { workspace_id, search, archived, page, limit } = input;

      // Use the optimized paginated query builder
      const { createPaginatedQuery } = await import('@/lib/utils/database-pagination');
      
      const result = await createPaginatedQuery<Customer>(context.supabase, 'customers')
        .select('*')
        .workspace(workspace_id)
        .search(search || '', ['name', 'email', 'phone'])
        .filter('archived', archived)
        .orderBy('created_at', 'desc')
        .paginate({ page, limit });

      return createSuccessResponse(result);
    } catch (error) {
      console.error('Error fetching customers:', error);
      return createErrorResponse('Failed to fetch customers');
    }
  },
  {
    requiredRole: 'viewer',
  }
);

/**
 * Gets a single customer by ID
 */
export const getCustomer = createWorkspaceAction(
  z.object({
    id: z.string().uuid({ message: 'Invalid customer ID' }),
    workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
  }),
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<Customer>> => {
    try {
      const { id, workspace_id } = input;

      const { data: customer, error } = await context.supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .eq('workspace_id', workspace_id)
        .single();

      if (error || !customer) {
        return createErrorResponse('Customer not found');
      }

      return createSuccessResponse(customer as Customer);
    } catch (error) {
      console.error('Error fetching customer:', error);
      return createErrorResponse('Failed to fetch customer');
    }
  },
  {
    requiredRole: 'viewer',
  }
);

/**
 * Enhanced customer search with advanced filtering and relevance scoring
 */
export const searchCustomersAdvanced = createWorkspaceAction(
  z.object({
    workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
    search: z.string().optional(),
    archived: z.boolean().optional(),
    created_from: z.string().optional(),
    created_to: z.string().optional(),
    sort_by: z.enum(['name', 'email', 'created_at', 'updated_at']).default('created_at'),
    sort_direction: z.enum(['asc', 'desc']).default('desc'),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(20),
    fuzzy_search: z.boolean().default(false),
  }),
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<{
    customers: Customer[];
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
        archived, 
        created_from, 
        created_to,
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
          fields: ['name', 'email', 'phone', 'address'],
          fuzzyMatch: fuzzy_search,
        } : undefined,
        filters: {
          archived: archived,
        },
        dateRanges: {
          created_at: {
            from: created_from,
            to: created_to,
          },
        },
        sortBy: sort_by,
        sortDirection: sort_direction,
      };

      // Start with base query
      let query = context.supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .eq('workspace_id', workspace_id);

      // Apply advanced filters
      query = buildAdvancedFilters(query, filterOptions);

      // Apply pagination
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);

      const { data: customers, error, count } = await query;

      if (error) {
        throw error;
      }

      const executionTime = Date.now() - startTime;
      const total = count || 0;
      const hasMore = offset + limit < total;

      return createSuccessResponse({
        customers: customers as Customer[],
        total,
        page,
        limit,
        hasMore,
        searchAnalytics: {
          executionTime,
          resultCount: customers?.length || 0,
        },
      });
    } catch (error) {
      console.error('Error in advanced customer search:', error);
      return createErrorResponse('Failed to search customers');
    }
  },
  {
    requiredRole: 'viewer',
  }
);

/**
 * Get customer search suggestions for autocomplete
 */
export const getCustomerSuggestions = createWorkspaceAction(
  z.object({
    workspace_id: z.string().uuid({ message: 'Invalid workspace ID' }),
    query: z.string().min(1, 'Query is required'),
    limit: z.number().int().min(1).max(20).default(10),
  }),
  async (input, context: ServerActionContext): Promise<EnhancedServerActionResult<{
    suggestions: Array<{
      id: string;
      name: string;
      email?: string;
      type: 'customer';
    }>;
  }>> => {
    try {
      const { workspace_id, query, limit } = input;

      const { data: customers, error } = await context.supabase
        .from('customers')
        .select('id, name, email')
        .eq('workspace_id', workspace_id)
        .eq('archived', false)
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .order('name')
        .limit(limit);

      if (error) {
        throw error;
      }

      const suggestions = (customers || []).map(customer => ({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        type: 'customer' as const,
      }));

      return createSuccessResponse({ suggestions });
    } catch (error) {
      console.error('Error getting customer suggestions:', error);
      return createErrorResponse('Failed to get customer suggestions');
    }
  },
  {
    requiredRole: 'viewer',
  }
);