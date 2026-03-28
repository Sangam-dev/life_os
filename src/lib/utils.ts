import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDuration = (hours: number) => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
};

export const getLifeScoreColor = (score: number) => {
  if (score >= 80) return "text-cyan-400";
  if (score >= 60) return "text-green-400";
  if (score >= 40) return "text-yellow-400";
  return "text-red-400";
};
