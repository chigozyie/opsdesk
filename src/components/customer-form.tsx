'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createCustomer, updateCustomer } from '@/lib/server-actions/customer-actions';
import { Button } from '@/components/button';
import { FormField } from '@/components/form-field';
import type { Customer } from '@/lib/validation/schemas/customer';

interface CustomerFormProps {
  workspaceId: string;
  workspaceSlug: string;
  mode: 'create' | 'edit';
  customer?: Customer;
}

export function CustomerForm({ workspaceId, workspaceSlug, mode, customer }: CustomerFormProps) {
  const router = useRouter();
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
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({ general: 'An unexpected error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* General Error */}
      {errors.general && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{errors.general}</div>
        </div>
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
          <p className="mt-1 text-sm text-red-600">{errors.name}</p>
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
          <p className="mt-1 text-sm text-red-600">{errors.email}</p>
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
          <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
        )}
      </div>

      {/* Address */}
      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700">
          Address
        </label>
        <div className="mt-1">
          <textarea
            id="address"
            name="address"
            rows={3}
            defaultValue={customer?.address || ''}
            placeholder="Enter customer address"
            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
        {errors.address && (
          <p className="mt-1 text-sm text-red-600">{errors.address}</p>
        )}
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => {
            if (mode === 'edit') {
              router.push(`/app/${workspaceSlug}/customers/${customer!.id}` as any);
            } else {
              router.push(`/app/${workspaceSlug}/customers` as any);
            }
          }}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <Button
          type="submit"
          loading={isSubmitting}
          loadingText={mode === 'create' ? 'Creating...' : 'Updating...'}
          className="w-auto"
        >
          {mode === 'create' ? 'Create Customer' : 'Update Customer'}
        </Button>
      </div>
    </form>
  );
}