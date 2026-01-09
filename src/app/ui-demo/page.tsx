'use client';

import { useState } from 'react';
import { Button } from '@/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TableSkeleton, CardSkeleton, DashboardMetricsSkeleton } from '@/components/ui/loading-states';
import { useToast } from '@/hooks/use-toast';
import { Toaster } from '@/components/ui/toaster';

export default function UIDemoPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showSkeletons, setShowSkeletons] = useState(false);

  const showSuccessToast = () => {
    toast({
      title: "Success!",
      description: "This is a success toast notification with auto-dismiss.",
      variant: "success",
    });
  };

  const showErrorToast = () => {
    toast({
      title: "Error occurred",
      description: "This is an error toast notification that shows validation errors.",
      variant: "destructive",
    });
  };

  const showDefaultToast = () => {
    toast({
      title: "Information",
      description: "This is a default toast notification for general information.",
    });
  };

  const simulateLoading = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast({
        title: "Loading complete",
        description: "The simulated loading process has finished.",
        variant: "success",
      });
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">UI Components Demo</h1>
          <p className="text-gray-600">
            Demonstration of toast notifications, loading states, and responsive design
          </p>
        </div>

        {/* Toast Notifications Demo */}
        <Card>
          <CardHeader>
            <CardTitle>Toast Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button onClick={showSuccessToast} variant="primary">
                Show Success Toast
              </Button>
              <Button onClick={showErrorToast} variant="danger">
                Show Error Toast
              </Button>
              <Button onClick={showDefaultToast} variant="secondary">
                Show Info Toast
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Loading States Demo */}
        <Card>
          <CardHeader>
            <CardTitle>Loading States & Skeleton Components</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={simulateLoading} 
                loading={loading}
                loadingText="Processing..."
                disabled={loading}
              >
                Simulate Loading
              </Button>
              <Button 
                onClick={() => setShowSkeletons(!showSkeletons)}
                variant="secondary"
              >
                {showSkeletons ? 'Hide' : 'Show'} Skeleton Components
              </Button>
            </div>

            {showSkeletons && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-medium mb-4">Basic Skeleton</h3>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[150px]" />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Table Skeleton</h3>
                  <TableSkeleton rows={5} />
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Card Skeleton</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CardSkeleton />
                    <CardSkeleton />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Dashboard Metrics Skeleton</h3>
                  <DashboardMetricsSkeleton />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Responsive Design Demo */}
        <Card>
          <CardHeader>
            <CardTitle>Responsive Design</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white border rounded-lg p-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        Responsive Card {i + 1}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        This card adapts to different screen sizes
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Button size="sm" className="w-full sm:w-auto">
                      Action
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Mobile-First Design Info */}
        <Card>
          <CardHeader>
            <CardTitle>Mobile-First Responsive Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• <strong>Navigation:</strong> Horizontal scrolling on mobile, full navigation on desktop</li>
                <li>• <strong>Forms:</strong> Stacked buttons on mobile, inline on desktop</li>
                <li>• <strong>Tables:</strong> Card view on mobile, table view on desktop</li>
                <li>• <strong>Headers:</strong> Condensed user info on mobile, full details on desktop</li>
                <li>• <strong>Spacing:</strong> Reduced padding and margins on smaller screens</li>
                <li>• <strong>Typography:</strong> Responsive text sizes and line heights</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toast container */}
      <Toaster />
    </div>
  );
}