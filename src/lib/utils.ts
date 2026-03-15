import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDistanceLabel(distance: number | null): string | null {
  if (distance === null || Number.isNaN(distance)) {
    return null;
  }

  return `${distance.toFixed(1)}km`;
}
