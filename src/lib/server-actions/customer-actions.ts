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
      const offset = (page - 1) * limit;

      let query = context.supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .eq('workspace_id', workspace_id);

      // Apply filters
      if (typeof archived === 'boolean') {
        query = query.eq('archived', archived);
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      // Apply pagination and ordering
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data: customers, error, count } = await query;

      if (error) {
        return handleDatabaseError(error, 'fetch customers');
      }

      const total = count || 0;
      const hasMore = offset + limit < total;

      return createSuccessResponse({
        customers: customers as Customer[],
        total,
        page,
        limit,
        hasMore,
      });
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