-- Additional indexes for optimal pagination performance
-- These indexes support efficient sorting, filtering, and search operations

-- Customers table indexes for pagination
CREATE INDEX IF NOT EXISTS idx_customers_workspace_created_at ON customers(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_workspace_name ON customers(workspace_id, name);
CREATE INDEX IF NOT EXISTS idx_customers_workspace_archived ON customers(workspace_id, archived);
CREATE INDEX IF NOT EXISTS idx_customers_search ON customers USING gin(to_tsvector('english', name || ' ' || COALESCE(email, '') || ' ' || COALESCE(phone, '')));

-- Invoices table indexes for pagination
CREATE INDEX IF NOT EXISTS idx_invoices_workspace_created_at ON invoices(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_workspace_status ON invoices(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_workspace_customer ON invoices(workspace_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_workspace_issue_date ON invoices(workspace_id, issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_search ON invoices USING gin(to_tsvector('english', invoice_number || ' ' || COALESCE(notes, '')));

-- Expenses table indexes for pagination
CREATE INDEX IF NOT EXISTS idx_expenses_workspace_expense_date ON expenses(workspace_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_workspace_category ON expenses(workspace_id, category);
CREATE INDEX IF NOT EXISTS idx_expenses_workspace_vendor ON expenses(workspace_id, vendor);
CREATE INDEX IF NOT EXISTS idx_expenses_workspace_amount ON expenses(workspace_id, amount);
CREATE INDEX IF NOT EXISTS idx_expenses_search ON expenses USING gin(to_tsvector('english', vendor || ' ' || category || ' ' || COALESCE(description, '')));

-- Tasks table indexes for pagination
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_created_at ON tasks(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_status ON tasks(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_assigned_to ON tasks(workspace_id, assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_due_date ON tasks(workspace_id, due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_search ON tasks USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- Audit logs table indexes for pagination (admin views)
CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace_created_at ON audit_logs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace_resource ON audit_logs(workspace_id, resource_type, resource_id);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_customers_workspace_archived_created ON customers(workspace_id, archived, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_workspace_status_issue_date ON invoices(workspace_id, status, issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_workspace_date_category ON expenses(workspace_id, expense_date DESC, category);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_status_assigned ON tasks(workspace_id, status, assigned_to);

-- Partial indexes for common filtered queries
CREATE INDEX IF NOT EXISTS idx_customers_active_workspace ON customers(workspace_id, created_at DESC) WHERE archived = false;
CREATE INDEX IF NOT EXISTS idx_invoices_unpaid_workspace ON invoices(workspace_id, issue_date DESC) WHERE status IN ('draft', 'sent');
CREATE INDEX IF NOT EXISTS idx_tasks_incomplete_workspace ON tasks(workspace_id, created_at DESC) WHERE status IN ('pending', 'in_progress');

-- Comments for documentation
COMMENT ON INDEX idx_customers_search IS 'Full-text search index for customers (name, email, phone)';
COMMENT ON INDEX idx_invoices_search IS 'Full-text search index for invoices (number, notes)';
COMMENT ON INDEX idx_expenses_search IS 'Full-text search index for expenses (vendor, category, description)';
COMMENT ON INDEX idx_tasks_search IS 'Full-text search index for tasks (title, description)';
COMMENT ON INDEX idx_customers_active_workspace IS 'Partial index for active customers only';
COMMENT ON INDEX idx_invoices_unpaid_workspace IS 'Partial index for unpaid invoices only';
COMMENT ON INDEX idx_tasks_incomplete_workspace IS 'Partial index for incomplete tasks only';