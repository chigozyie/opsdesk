import { ReactNode } from 'react';
import { Alert as ShadcnAlert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlertProps {
  type: 'error' | 'success' | 'info' | 'warning';
  children: ReactNode;
}

const alertIcons = {
  error: AlertCircle,
  success: CheckCircle,
  info: Info,
  warning: AlertTriangle,
};

const alertStyles = {
  error: 'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
  success: 'border-green-500/50 text-green-700 dark:border-green-500 [&>svg]:text-green-600',
  info: 'border-blue-500/50 text-blue-700 dark:border-blue-500 [&>svg]:text-blue-600',
  warning: 'border-yellow-500/50 text-yellow-700 dark:border-yellow-500 [&>svg]:text-yellow-600',
};

export function Alert({ type, children }: AlertProps) {
  const Icon = alertIcons[type];
  
  return (
    <ShadcnAlert className={cn(alertStyles[type])}>
      <Icon className="h-4 w-4" />
      <AlertDescription>{children}</AlertDescription>
    </ShadcnAlert>
  );
}