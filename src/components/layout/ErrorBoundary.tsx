import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertCircle, Home, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to error reporting service
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // You can send error to your error tracking service here
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md border-red-200">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-red-600">
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-gray-600 mb-2">
                  An unexpected error occurred in the application.
                </p>
                {import.meta.env.DEV && this.state.error && (
                  <div className="mt-4 p-3 bg-gray-100 rounded text-left">
                    <p className="text-sm font-mono text-red-600 mb-1">
                      {this.state.error.toString()}
                    </p>
                    {this.state.errorInfo && (
                      <details className="text-xs text-gray-500">
                        <summary>Stack trace</summary>
                        <pre className="mt-2 overflow-auto max-h-32">
                          {this.state.errorInfo.componentStack}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={this.handleReset} className="bg-blue-600 hover:bg-blue-700">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={this.handleGoHome} className="border border-gray-300 hover:bg-gray-50">
                  <Home className="h-4 w-4 mr-2" />
                  Go to Home
                </Button>
              </div>

              <div className="text-center text-xs text-gray-500 mt-4">
                <p>If the problem persists, please contact support.</p>
                <p className="mt-1">Error ID: {Date.now().toString(36)}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
