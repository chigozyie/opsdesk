'use client';

import { useState, useTransition } from 'react';
import { createWorkspace, generateSlugFromName } from '@/lib/workspace/actions';
import { Button } from '@/components/button';
import { FormField } from '@/components/form-field';

export function WorkspaceCreationForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [isGeneratingSlug, setIsGeneratingSlug] = useState(false);

  const handleNameChange = async (newName: string) => {
    setName(newName);
    
    if (newName.trim()) {
      setIsGeneratingSlug(true);
      try {
        const generatedSlug = await generateSlugFromName(newName);
        setSlug(generatedSlug);
      } catch (error) {
        console.error('Error generating slug:', error);
      } finally {
        setIsGeneratingSlug(false);
      }
    } else {
      setSlug('');
    }
  };

  const handleSubmit = async (formData: FormData) => {
    setError(null);
    
    startTransition(async () => {
      try {
        const result = await createWorkspace(formData);
        if (result?.error) {
          setError(result.error);
        }
        // If we get here without an error, the action completed successfully
        // The redirect will happen automatically
      } catch (error: any) {
        // Check if this is a Next.js redirect (which is expected and means success)
        if (error?.digest?.startsWith('NEXT_REDIRECT')) {
          // This is a successful redirect, let it happen
          throw error;
        }
        // Only show error for actual errors, not redirects
        console.error('Form submission error:', error);
        setError('An unexpected error occurred. Please try again.');
      }
    });
  };

  return (
    <form action={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <FormField
        label="Workspace Name"
        id="name"
        name="name"
        type="text"
        placeholder="My Business"
        value={name}
        onChange={(e) => handleNameChange(e.target.value)}
        required
        disabled={isPending}
      />

      <div>
        <FormField
          label="Workspace URL"
          id="slug"
          name="slug"
          type="text"
          placeholder="my-business"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          required
          disabled={isPending || isGeneratingSlug}
        />
        <p className="mt-1 text-sm text-gray-500">
          Your workspace will be available at: bizdesk.com/app/{slug || 'your-workspace'}
        </p>
      </div>

      <Button
        type="submit"
        disabled={isPending || isGeneratingSlug || !name.trim() || !slug.trim()}
        className="w-full"
      >
        {isPending ? 'Creating Workspace...' : 'Create Workspace'}
      </Button>
    </form>
  );
}