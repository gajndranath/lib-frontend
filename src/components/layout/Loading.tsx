import React from "react";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingProps {
  fullScreen?: boolean;
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

export const Loading: React.FC<LoadingProps> = ({
  fullScreen = true,
  size = "md",
  text = "Loading...",
  className,
}) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  const textSizes = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  };

  const content = (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <div className="relative">
        {/* Outer spinner */}
        <div
          className={cn(
            "animate-spin rounded-full border-2 border-gray-200",
            sizeClasses[size]
          )}
        />

        {/* Inner spinner */}
        <div
          className={cn(
            "absolute inset-0 animate-spin rounded-full border-2 border-t-indigo-600 border-r-transparent border-b-transparent border-l-transparent",
            sizeClasses[size]
          )}
        />

        {/* Icon in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <BookOpen
            className={cn(
              "text-indigo-600 animate-pulse",
              size === "sm" ? "h-2 w-2" : size === "md" ? "h-3 w-3" : "h-4 w-4"
            )}
          />
        </div>
      </div>

      {text && (
        <div className={cn("mt-4 text-gray-600", textSizes[size])}>
          <p className="animate-pulse">{text}</p>
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return content;
};

// Specific loading variants
export const PageLoading: React.FC = () => (
  <Loading fullScreen size="lg" text="Loading Library Manager..." />
);

export const SectionLoading: React.FC<{ text?: string }> = ({ text }) => (
  <div className="py-12">
    <Loading fullScreen={false} size="md" text={text} />
  </div>
);

export const TableLoading: React.FC = () => (
  <div className="space-y-3">
    {Array.from({ length: 5 }).map((_, i) => (
      <div
        key={i}
        className="flex items-center space-x-4 p-4 border rounded-lg animate-pulse"
      >
        <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="h-8 bg-gray-200 rounded w-20"></div>
      </div>
    ))}
  </div>
);

export const CardLoading: React.FC = () => (
  <div className="p-6 space-y-4">
    <div className="h-6 bg-gray-200 rounded w-1/3"></div>
    <div className="space-y-3">
      <div className="h-4 bg-gray-200 rounded"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      <div className="h-4 bg-gray-200 rounded w-4/6"></div>
    </div>
    <div className="h-10 bg-gray-200 rounded mt-4"></div>
  </div>
);

// Loading overlay for async operations
interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  children,
  message = "Processing...",
}) => {
  if (!isLoading) return <>{children}</>;

  return (
    <div className="relative">
      <div className="opacity-50 pointer-events-none">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-10">
        <div className="bg-white p-6 rounded-lg shadow-lg border">
          <Loading fullScreen={false} text={message} />
        </div>
      </div>
    </div>
  );
};

// Loading dots animation
export const LoadingDots: React.FC = () => (
  <div className="flex space-x-1">
    <div
      className="h-2 w-2 bg-indigo-600 rounded-full animate-bounce"
      style={{ animationDelay: "0ms" }}
    ></div>
    <div
      className="h-2 w-2 bg-indigo-600 rounded-full animate-bounce"
      style={{ animationDelay: "150ms" }}
    ></div>
    <div
      className="h-2 w-2 bg-indigo-600 rounded-full animate-bounce"
      style={{ animationDelay: "300ms" }}
    ></div>
  </div>
);

// Loading bar for progress
interface LoadingBarProps {
  progress?: number;
  indeterminate?: boolean;
}

export const LoadingBar: React.FC<LoadingBarProps> = ({
  progress,
  indeterminate = false,
}) => {
  return (
    <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
      {indeterminate ? (
        <div className="h-full bg-indigo-600 animate-progress"></div>
      ) : (
        <div
          className="h-full bg-indigo-600 transition-all duration-300 ease-out"
          style={{ width: `${progress || 0}%` }}
        />
      )}
    </div>
  );
};
