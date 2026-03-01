'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    // 忽略浏览器扩展引起的错误
    if (error.message.includes('which has only a getter')) {
      return;
    }
    console.error('Uncaught error:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-surface-primary">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-text-primary">
              Oops, something went wrong
            </h2>
            <button
              className="mt-4 rounded-lg bg-accent px-4 py-2 text-white hover:bg-accent-hover"
              onClick={() => this.setState({ hasError: false })}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
