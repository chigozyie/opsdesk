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
      const result = await createWorkspace(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  };

  return (
    <form action={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Create Your Workspace
        </h2>
        <p className="text-gray-600 mb-6">
          Set up your business workspace to get started with BizDesk.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <FormField
        label="Workspace Name"
        name="name"
        type="text"
        placeholder="My Business"
        value={name}
        onChange={(e) => handleNameChange(e.target.value)}
        required
        disabled={isPending}
      />

      <FormField
        label="Workspace URL"
        name="slug"
        type="text"
        placeholder="my-business"
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        required
        disabled={isPending || isGeneratingSlug}
        helperText={`Your workspace will be available at: bizdesk.com/app/${slug || 'your-workspace'}`}
      />

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