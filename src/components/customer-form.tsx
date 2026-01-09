'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createCustomer, updateCustomer } from '@/lib/server-actions/customer-actions';
import { Button } from '@/components/button';
import { FormField } from '@/components/form-field';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/alert';
import { useToast } from '@/hooks/use-toast';
import type { Customer } from '@/lib/validation/schemas/customer';

interface CustomerFormProps {
  workspaceId: string;
  workspaceSlug: string;
  mode: 'create' | 'edit';
  customer?: Customer;
}

export function CustomerForm({ workspaceId, workspaceSlug, mode, customer }: CustomerFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setErrors({});

    try {
      const data = {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
        address: formData.get('address') as string,
        workspace_id: workspaceId,
      };

      let result;
      if (mode === 'create') {
        result = await createCustomer(data);
      } else {
        result = await updateCustomer({
          ...data,
          id: customer!.id,
        });
      }

      if (result.success) {
        toast({
          title: mode === 'create' ? 'Customer created' : 'Customer updated',
          description: `${data.name} has been ${mode === 'create' ? 'created' : 'updated'} successfully.`,
          variant: 'success',
        });

        if (mode === 'create') {
          router.push(`/app/${workspaceSlug}/customers/${result.data!.id}` as any);
        } else {
          router.push(`/app/${workspaceSlug}/customers/${customer!.id}` as any);
        }
        router.refresh();
      } else {
        // Handle validation errors
        if (result.errors) {
          const errorMap: Record<string, string> = {};
          result.errors.forEach((error) => {
            errorMap[error.field] = error.message;
          });
          setErrors(errorMap);
        } else {
          setErrors({ general: result.message || 'An error occurred' });
        }

        toast({
          title: 'Error',
          description: result.message || 'Failed to save customer. Please check the form and try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({ general: 'An unexpected error occurred' });
      
      toast({
        title: 'Unexpected error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* General Error */}
      {errors.general && (
        <Alert type="error">{errors.general}</Alert>
      )}

      {/* Customer Name */}
      <div>
        <FormField
          label="Customer Name"
          id="name"
          name="name"
          type="text"
          required
          defaultValue={customer?.name || ''}
          placeholder="Enter customer name"
        />
        {errors.name && (
          <p className="mt-1 text-sm text-destructive">{errors.name}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <FormField
          label="Email Address"
          id="email"
          name="email"
          type="email"
          defaultValue={customer?.email || ''}
          placeholder="customer@example.com"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-destructive">{errors.email}</p>
        )}
      </div>

      {/* Phone */}
      <div>
        <FormField
          label="Phone Number"
          id="phone"
          name="phone"
          type="tel"
          defaultValue={customer?.phone || ''}
          placeholder="+1 (555) 123-4567"
        />
        {errors.phone && (
          <p className="mt-1 text-sm text-destructive">{errors.phone}</p>
        )}
      </div>

      {/* Address */}
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          name="address"
          rows={3}
          defaultValue={customer?.address || ''}
          placeholder="Enter customer address"
        />
        {errors.address && (
          <p className="mt-1 text-sm text-destructive">{errors.address}</p>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-3">
        <Button
          type="button"
          variant="secondary"
          className="w-full sm:w-auto"
          onClick={() => {
            if (mode === 'edit') {
              router.push(`/app/${workspaceSlug}/customers/${customer!.id}` as any);
            } else {
              router.push(`/app/${workspaceSlug}/customers` as any);
            }
          }}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          loading={isSubmitting}
          loadingText={mode === 'create' ? 'Creating...' : 'Updating...'}
          className="w-full sm:w-auto"
        >
          {mode === 'create' ? 'Create Customer' : 'Update Customer'}
        </Button>
      </div>
    </form>
  );
}