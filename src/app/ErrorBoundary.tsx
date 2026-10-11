// bisiyata dishmaya, leharbot ahava biyisral
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Banner } from '@/ui/Banner';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  failed: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Keep the error available to developer tools without including settings or user data.
    console.error('App rendering failed', error.name, info.componentStack);
  }

  override render() {
    if (this.state.failed) {
      return (
        <main className="app-content">
          <Banner type="error" title="Saprili hit an unexpected problem.">
            Your books are still saved. Go back to the library and try again.
          </Banner>
          <a className="button" href="#/">
            Back to your library
          </a>
        </main>
      );
    }
    return this.props.children;
  }
}
