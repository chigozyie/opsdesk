-- Enable Row Level Security on all tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Helper function for workspace membership validation
CREATE OR REPLACE FUNCTION is_workspace_member(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = workspace_uuid 
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function for workspace role validation
CREATE OR REPLACE FUNCTION get_workspace_role(workspace_uuid UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM workspace_members 
    WHERE workspace_id = workspace_uuid 
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is admin of workspace
CREATE OR REPLACE FUNCTION is_workspace_admin(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = workspace_uuid 
    AND user_id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user can write to workspace (admin or member)
CREATE OR REPLACE FUNCTION can_write_workspace(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = workspace_uuid 
    AND user_id = auth.uid()
    AND role IN ('admin', 'member')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Workspace policies
CREATE POLICY "Users can view workspaces they belong to" ON workspaces
  FOR SELECT USING (is_workspace_member(id));

CREATE POLICY "Users can create workspaces" ON workspaces
  FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admins can update their workspaces" ON workspaces
  FOR UPDATE USING (is_workspace_admin(id));

CREATE POLICY "Admins can delete their workspaces" ON workspaces
  FOR DELETE USING (is_workspace_admin(id));

-- Workspace members policies
CREATE POLICY "Users can view workspace members for their workspaces" ON workspace_members
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY "Admins can manage workspace members" ON workspace_members
  FOR INSERT WITH CHECK (
    is_workspace_admin(workspace_id) OR 
    (user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM workspaces 
      WHERE workspaces.id = workspace_members.workspace_id 
      AND workspaces.created_by = auth.uid()
    ))
  );

CREATE POLICY "Admins can update workspace members" ON workspace_members
  FOR UPDATE USING (is_workspace_admin(workspace_id));

CREATE POLICY "Admins can delete workspace members" ON workspace_members
  FOR DELETE USING (is_workspace_admin(workspace_id));

-- Customer policies
CREATE POLICY "Users can view workspace customers" ON customers
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can create customers" ON customers
  FOR INSERT WITH CHECK (
    can_write_workspace(workspace_id) AND
    created_by = auth.uid()
  );

CREATE POLICY "Members can update customers" ON customers
  FOR UPDATE USING (can_write_workspace(workspace_id));

CREATE POLICY "Admins can delete customers" ON customers
  FOR DELETE USING (is_workspace_admin(workspace_id));

-- Invoice policies
CREATE POLICY "Users can view workspace invoices" ON invoices
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can create invoices" ON invoices
  FOR INSERT WITH CHECK (
    can_write_workspace(workspace_id) AND
    created_by = auth.uid()
  );

CREATE POLICY "Members can update invoices" ON invoices
  FOR UPDATE USING (can_write_workspace(workspace_id));

CREATE POLICY "Admins can delete invoices" ON invoices
  FOR DELETE USING (is_workspace_admin(workspace_id));

-- Invoice line items policies (inherit from invoice)
CREATE POLICY "Users can view invoice line items for workspace invoices" ON invoice_line_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_line_items.invoice_id 
      AND is_workspace_member(invoices.workspace_id)
    )
  );

CREATE POLICY "Members can create invoice line items for workspace invoices" ON invoice_line_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_line_items.invoice_id 
      AND can_write_workspace(invoices.workspace_id)
    )
  );

CREATE POLICY "Members can update invoice line items for workspace invoices" ON invoice_line_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_line_items.invoice_id 
      AND can_write_workspace(invoices.workspace_id)
    )
  );

CREATE POLICY "Members can delete invoice line items for workspace invoices" ON invoice_line_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM invoices 
      WHERE invoices.id = invoice_line_items.invoice_id 
      AND can_write_workspace(invoices.workspace_id)
    )
  );

-- Expense policies
CREATE POLICY "Users can view workspace expenses" ON expenses
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can create expenses" ON expenses
  FOR INSERT WITH CHECK (
    can_write_workspace(workspace_id) AND
    created_by = auth.uid()
  );

CREATE POLICY "Members can update expenses" ON expenses
  FOR UPDATE USING (can_write_workspace(workspace_id));

CREATE POLICY "Admins can delete expenses" ON expenses
  FOR DELETE USING (is_workspace_admin(workspace_id));

-- Task policies
CREATE POLICY "Users can view workspace tasks" ON tasks
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can create tasks" ON tasks
  FOR INSERT WITH CHECK (
    can_write_workspace(workspace_id) AND
    created_by = auth.uid()
  );

CREATE POLICY "Members can update tasks" ON tasks
  FOR UPDATE USING (can_write_workspace(workspace_id));

CREATE POLICY "Admins can delete tasks" ON tasks
  FOR DELETE USING (is_workspace_admin(workspace_id));

-- Payment policies
CREATE POLICY "Users can view workspace payments" ON payments
  FOR SELECT USING (is_workspace_member(workspace_id));

CREATE POLICY "Members can create payments" ON payments
  FOR INSERT WITH CHECK (
    can_write_workspace(workspace_id) AND
    created_by = auth.uid()
  );

CREATE POLICY "Members can update payments" ON payments
  FOR UPDATE USING (can_write_workspace(workspace_id));

CREATE POLICY "Admins can delete payments" ON payments
  FOR DELETE USING (is_workspace_admin(workspace_id));