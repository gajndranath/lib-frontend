/**
 * React component performance optimization helpers
 * - Lazy loading components
 * - Memoization utilities
 * - Code splitting helpers
 */

import { lazy, Suspense } from "react";
import { Loading } from "@/components/layout/Loading";
import React from "react";

/**
 * Lazy load a component with fallback
 */
export const lazyComponentWithFallback = (
  importFunc: () => Promise<{ default: React.ComponentType<unknown> }>,
) => {
  const LazyComponent = lazy(importFunc);
  return (props: unknown) => (
    <Suspense fallback={<Loading />}>
      <LazyComponent {...(props as Record<string, unknown>)} />
    </Suspense>
  );
};

/**
 * Create lazy-loaded routes for code splitting
 */
export const createLazyRoute = (
  importFunc: () => Promise<{ default: React.ComponentType<unknown> }>,
) => {
  return {
    lazy: () => importFunc(),
  };
};

/**
 * Memoization wrapper with custom comparison
 */
export const memoWith = <P extends Record<string, unknown>>(
  Component: React.ComponentType<P>,
  equals?: (prevProps: P, nextProps: P) => boolean,
) => {
  return React.memo(Component, equals);
};

/**
 * Prevent re-renders if specific props haven't changed
 */
export const selectiveMemoPropNames = <P extends Record<string, unknown>>(
  Component: React.ComponentType<P>,
  propNames: (keyof P)[],
) => {
  return React.memo(Component, (prevProps, nextProps) => {
    return propNames.every((prop) => prevProps[prop] === nextProps[prop]);
  });
};

/**
 * Performance monitoring helper
 */
export const measureComponentRender = (componentName: string) => {
  return (Comp: React.ComponentType<unknown>) => {
    return (props: unknown) => {
      React.useEffect(() => {
        const startTime = performance.now();
        return () => {
          const endTime = performance.now();
          console.log(
            `${componentName} render time: ${(endTime - startTime).toFixed(2)}ms`,
          );
        };
      }, []);

      return <Comp {...(props as Record<string, unknown>)} />;
    };
  };
};
