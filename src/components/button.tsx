import { ReactNode } from 'react';
import { Button as ShadcnButton, ButtonProps as ShadcnButtonProps } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ButtonProps extends Omit<ShadcnButtonProps, 'variant'> {
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  loadingText?: string;
  children: ReactNode;
}

export function Button({ 
  variant = 'primary', 
  loading = false, 
  loadingText, 
  children, 
  className = '', 
  disabled,
  ...props 
}: ButtonProps) {
  const isDisabled = disabled || loading;
  
  // Map custom variants to shadcn/ui variants
  const shadcnVariant = variant === 'primary' ? 'default' : 
                       variant === 'danger' ? 'destructive' : 
                       'secondary';
  
  return (
    <ShadcnButton
      variant={shadcnVariant}
      disabled={isDisabled}
      className={cn('w-full', className)}
      {...props}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {loading ? (loadingText || 'Loading...') : children}
    </ShadcnButton>
  );
}