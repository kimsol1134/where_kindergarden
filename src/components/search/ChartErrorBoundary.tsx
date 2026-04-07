'use client';

import { Component, type ReactNode } from 'react';
import RotateCw from 'lucide-react/dist/esm/icons/rotate-cw';

interface ChartErrorBoundaryProps {
  children: ReactNode;
  fallbackHeight?: string;
}

interface ChartErrorBoundaryState {
  hasError: boolean;
}

export class ChartErrorBoundary extends Component<
  ChartErrorBoundaryProps,
  ChartErrorBoundaryState
> {
  constructor(props: ChartErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ChartErrorBoundaryState {
    return { hasError: true };
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    const { hasError } = this.state;
    const { children, fallbackHeight = '200px' } = this.props;

    if (hasError) {
      return (
        <div
          className="flex flex-col items-center justify-center bg-gray-50 rounded-xl"
          style={{ height: fallbackHeight }}
        >
          <span className="text-sm text-gray-400 mb-3">
            차트를 불러올 수 없습니다
          </span>
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-600 bg-white border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors min-h-[44px]"
          >
            <RotateCw className="w-4 h-4" />
            다시 시도
          </button>
        </div>
      );
    }

    return children;
  }
}
