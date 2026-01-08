'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Workspace {
  id: string;
  slug: string;
  name: string;
  role: 'admin' | 'member' | 'viewer';
  created_at: string;
}

interface WorkspaceSelectorProps {
  workspaces: Workspace[];
  currentWorkspaceSlug?: string;
}

export function WorkspaceSelector({ workspaces, currentWorkspaceSlug }: WorkspaceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const currentWorkspace = workspaces.find(w => w.slug === currentWorkspaceSlug);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span>{currentWorkspace?.name || 'Select Workspace'}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-1 w-64 bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="py-1">
            <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b">
              Your Workspaces
            </div>
            
            {workspaces.map((workspace) => (
              <Link
                key={workspace.id}
                href={`/app/${workspace.slug}/dashboard`}
                className={`block px-3 py-2 text-sm hover:bg-gray-50 ${
                  workspace.slug === currentWorkspaceSlug ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                }`}
                onClick={() => setIsOpen(false)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{workspace.name}</div>
                    <div className="text-xs text-gray-500">/{workspace.slug}</div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    workspace.role === 'admin' 
                      ? 'bg-purple-100 text-purple-800'
                      : workspace.role === 'member'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {workspace.role}
                  </span>
                </div>
              </Link>
            ))}
            
            <div className="border-t">
              <Link
                href="/workspace/create"
                className="block px-3 py-2 text-sm text-blue-600 hover:bg-gray-50"
                onClick={() => setIsOpen(false)}
              >
                + Create New Workspace
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}