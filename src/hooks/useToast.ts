import { toast as sonnerToast } from "sonner";

export const useToast = () => {
  const success = (message: string, description?: string) => {
    sonnerToast.success(message, {
      description,
      duration: 3000,
    });
  };

  const error = (message: string, description?: string) => {
    sonnerToast.error(message, {
      description,
      duration: 5000,
    });
  };

  const info = (message: string, description?: string) => {
    sonnerToast.info(message, {
      description,
      duration: 3000,
    });
  };

  const warning = (message: string, description?: string) => {
    sonnerToast.warning(message, {
      description,
      duration: 4000,
    });
  };

  const promise = <T>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string;
      error: string;
    }
  ) => {
    return sonnerToast.promise(promise, options);
  };

  return {
    success,
    error,
    info,
    warning,
    promise,
  };
};
