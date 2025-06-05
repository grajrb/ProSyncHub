import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

interface EmptyStateProps {
  icon?: string;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Displays a loading spinner with an optional message
 */
export function LoadingState({ message = 'Loading...', size = 'md' }: LoadingStateProps) {
  const spinnerSizes = {
    sm: 'w-6 h-6 border-2',
    md: 'w-8 h-8 border-4',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className="flex items-center justify-center h-full py-8">
      <div className="text-center">
        <div 
          className={`${spinnerSizes[size]} border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4`}
        ></div>
        <p className="text-neutral-600">{message}</p>
      </div>
    </div>
  );
}

/**
 * Displays an error message with an optional retry button
 */
export function ErrorState({ 
  title = 'Error', 
  message, 
  onRetry 
}: ErrorStateProps) {
  return (
    <div className="flex items-center justify-center h-full py-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-red-500 flex items-center">
            <i className="fas fa-exclamation-circle mr-2"></i>
            {title}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        {onRetry && (
          <CardFooter>
            <Button onClick={onRetry}>
              <i className="fas fa-redo mr-2"></i>
              Try Again
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

/**
 * Displays an empty state with an optional action button
 */
export function EmptyState({ 
  icon = 'fas fa-inbox', 
  title, 
  message, 
  actionLabel, 
  onAction 
}: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center h-full py-8">
      <Card className="w-full max-w-lg">
        <CardContent className="pt-6 text-center">
          <i className={`${icon} text-neutral-400 text-5xl mb-4`}></i>
          <h3 className="text-xl font-medium mb-2">{title}</h3>
          <p className="text-neutral-600 mb-4">{message}</p>
          {actionLabel && onAction && (
            <Button onClick={onAction}>
              {actionLabel}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
