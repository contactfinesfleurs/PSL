import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Re-exports from split modules (backward-compat)
export * from "@/lib/constants";
export * from "@/lib/generators";
export * from "@/lib/formatters";
