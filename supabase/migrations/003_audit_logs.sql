-- Create audit logs table for comprehensive audit trail
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR(50) NOT NULL,
  resource_type VARCHAR(50) NOT NULL,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create indexes for audit logs
CREATE INDEX idx_audit_logs_workspace_id ON audit_logs(workspace_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX idx_audit_logs_resource_id ON audit_logs(resource_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Enable RLS on audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Audit logs policies - only admins can view audit logs
CREATE POLICY "Admins can view workspace audit logs" ON audit_logs
  FOR SELECT USING (is_workspace_admin(workspace_id));

-- System can insert audit logs (no user restrictions for inserts)
CREATE POLICY "System can create audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- Prevent updates and deletes to maintain audit integrity
CREATE POLICY "Audit logs are immutable" ON audit_logs
  FOR UPDATE USING (false);

CREATE POLICY "Audit logs cannot be deleted" ON audit_logs
  FOR DELETE USING (false);

-- Create function to automatically log changes
CREATE OR REPLACE FUNCTION log_audit_trail()
RETURNS TRIGGER AS $$
DECLARE
  workspace_uuid UUID;
  old_data JSONB;
  new_data JSONB;
  changes_data JSONB;
  key TEXT;
BEGIN
  -- Get workspace_id from the record
  IF TG_OP = 'DELETE' THEN
    workspace_uuid := OLD.workspace_id;
    old_data := to_jsonb(OLD);
    new_data := NULL;
    changes_data := old_data;
  ELSIF TG_OP = 'UPDATE' THEN
    workspace_uuid := NEW.workspace_id;
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
    -- Calculate changes
    changes_data := jsonb_build_object();
    FOR key IN SELECT jsonb_object_keys(new_data) LOOP
      IF old_data->key IS DISTINCT FROM new_data->key THEN
        changes_data := changes_data || jsonb_build_object(
          key, jsonb_build_object(
            'old', old_data->key,
            'new', new_data->key
          )
        );
      END IF;
    END LOOP;
  ELSE -- INSERT
    workspace_uuid := NEW.workspace_id;
    old_data := NULL;
    new_data := to_jsonb(NEW);
    changes_data := new_data;
  END IF;

  -- Insert audit log
  INSERT INTO audit_logs (
    workspace_id,
    user_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values,
    changes
  ) VALUES (
    workspace_uuid,
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    old_data,
    new_data,
    changes_data
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers for all business tables
CREATE TRIGGER audit_customers_trigger
  AFTER INSERT OR UPDATE OR DELETE ON customers
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_invoices_trigger
  AFTER INSERT OR UPDATE OR DELETE ON invoices
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_invoice_line_items_trigger
  AFTER INSERT OR UPDATE OR DELETE ON invoice_line_items
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_expenses_trigger
  AFTER INSERT OR UPDATE OR DELETE ON expenses
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_tasks_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_payments_trigger
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_workspace_members_trigger
  AFTER INSERT OR UPDATE OR DELETE ON workspace_members
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

-- Note: We don't audit workspaces table to avoid circular references
-- since workspace_id is required for audit logs