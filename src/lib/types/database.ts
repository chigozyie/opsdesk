export interface Database {
  public: {
    Tables: {
      workspaces: {
        Row: {
          id: string;
          slug: string;
          name: string;
          created_at: string;
          created_by: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          created_by: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          created_by?: string;
          updated_at?: string;
        };
      };
      workspace_members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          role: 'admin' | 'member' | 'viewer';
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          role: 'admin' | 'member' | 'viewer';
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          role?: 'admin' | 'member' | 'viewer';
        };
      };
      customers: {
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          email: string | null;
          phone: string | null;
          address: string | null;
          archived: boolean;
          created_at: string;
          created_by: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          archived?: boolean;
          created_by: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
          archived?: boolean;
          created_by?: string;
          updated_at?: string;
        };
      };
      invoices: {
        Row: {
          id: string;
          workspace_id: string;
          customer_id: string;
          invoice_number: string;
          status: 'draft' | 'sent' | 'paid' | 'void';
          issue_date: string;
          due_date: string | null;
          subtotal: number;
          tax_amount: number;
          total_amount: number;
          notes: string | null;
          created_at: string;
          created_by: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          customer_id: string;
          invoice_number: string;
          status?: 'draft' | 'sent' | 'paid' | 'void';
          issue_date: string;
          due_date?: string | null;
          subtotal?: number;
          tax_amount?: number;
          total_amount?: number;
          notes?: string | null;
          created_by: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          customer_id?: string;
          invoice_number?: string;
          status?: 'draft' | 'sent' | 'paid' | 'void';
          issue_date?: string;
          due_date?: string | null;
          subtotal?: number;
          tax_amount?: number;
          total_amount?: number;
          notes?: string | null;
          created_by?: string;
          updated_at?: string;
        };
      };
      invoice_line_items: {
        Row: {
          id: string;
          invoice_id: string;
          description: string;
          quantity: number;
          unit_price: number;
          total: number;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          description: string;
          quantity: number;
          unit_price: number;
          total: number;
          sort_order?: number;
        };
        Update: {
          id?: string;
          invoice_id?: string;
          description?: string;
          quantity?: number;
          unit_price?: number;
          total?: number;
          sort_order?: number;
        };
      };
      expenses: {
        Row: {
          id: string;
          workspace_id: string;
          vendor: string;
          category: string;
          amount: number;
          expense_date: string;
          description: string | null;
          receipt_url: string | null;
          created_at: string;
          created_by: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          vendor: string;
          category: string;
          amount: number;
          expense_date: string;
          description?: string | null;
          receipt_url?: string | null;
          created_by: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          vendor?: string;
          category?: string;
          amount?: number;
          expense_date?: string;
          description?: string | null;
          receipt_url?: string | null;
          created_by?: string;
          updated_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          workspace_id: string;
          title: string;
          description: string | null;
          assigned_to: string | null;
          status: 'pending' | 'in_progress' | 'completed';
          due_date: string | null;
          completed_at: string | null;
          created_at: string;
          created_by: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          title: string;
          description?: string | null;
          assigned_to?: string | null;
          status?: 'pending' | 'in_progress' | 'completed';
          due_date?: string | null;
          completed_at?: string | null;
          created_by: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          title?: string;
          description?: string | null;
          assigned_to?: string | null;
          status?: 'pending' | 'in_progress' | 'completed';
          due_date?: string | null;
          completed_at?: string | null;
          created_by?: string;
          updated_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          workspace_id: string;
          invoice_id: string;
          amount: number;
          payment_date: string;
          payment_method: string | null;
          reference: string | null;
          notes: string | null;
          created_at: string;
          created_by: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          invoice_id: string;
          amount: number;
          payment_date: string;
          payment_method?: string | null;
          reference?: string | null;
          notes?: string | null;
          created_by: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          invoice_id?: string;
          amount?: number;
          payment_date?: string;
          payment_method?: string | null;
          reference?: string | null;
          notes?: string | null;
          created_by?: string;
        };
      };
      audit_logs: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string | null;
          action: string;
          resource_type: string;
          resource_id: string | null;
          old_values: any | null;
          new_values: any | null;
          changes: any | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id?: string | null;
          action: string;
          resource_type: string;
          resource_id?: string | null;
          old_values?: any | null;
          new_values?: any | null;
          changes?: any | null;
          ip_address?: string | null;
          user_agent?: string | null;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string | null;
          action?: string;
          resource_type?: string;
          resource_id?: string | null;
          old_values?: any | null;
          new_values?: any | null;
          changes?: any | null;
          ip_address?: string | null;
          user_agent?: string | null;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_workspace_member: {
        Args: {
          workspace_uuid: string;
        };
        Returns: boolean;
      };
      get_workspace_role: {
        Args: {
          workspace_uuid: string;
        };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
