// Reexport from sonner
import { toast as sonnerToast } from "sonner"

export const toast = sonnerToast;

// Create a mock useToast function to prevent errors
export const useToast = () => {
  return {
    toasts: [],
    toast: sonnerToast,
  }
} 