import { ReactNode } from 'react';

interface AlertProps {
  type: 'error' | 'success' | 'info' | 'warning';
  children: ReactNode;
}

const alertClasses = {
  error: 'bg-red-50 text-red-700',
  success: 'bg-green-50 text-green-700',
  info: 'bg-blue-50 text-blue-700',
  warning: 'bg-yellow-50 text-yellow-700',
};

export function Alert({ type, children }: AlertProps) {
  return (
    <div className={`rounded-md p-4 ${alertClasses[type]}`}>
      <div className="text-sm">{children}</div>
    </div>
  );
}