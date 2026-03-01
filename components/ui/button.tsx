import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost' | 'submit';
  size?: 'default' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
          size === 'default' && 'px-4 py-2',
          size === 'icon' && 'h-10 w-10',
          variant === 'default' &&
            'border border-border-light bg-surface-secondary text-text-primary hover:bg-surface-hover hover:border-border-medium active:scale-95',
          variant === 'ghost' &&
            'text-text-secondary hover:bg-surface-hover hover:text-text-primary active:scale-95',
          variant === 'submit' &&
            'bg-surface-submit text-white hover:bg-surface-submit-hover active:scale-95 shadow-sm',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
