import { clsx, type ClassValue } from "clsx";
import type { SocialAccount } from "./schemas";

/**
 * Normalizes an API social account payload into a standardized SocialAccount entity.
 */
export const normalizeSocialAccount = (account: any): SocialAccount => {
  const resolvedId = account._id || account.id || "";
  return {
    ...account,
    _id: resolvedId,
    id: resolvedId,
    platform: String(account.platform || "").toLowerCase() as any,
  };
};

/**
 * Combines CSS class names conditionally, filtering out falsy values.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/**
 * Safely format ISO dates into localized readable strings.
 */
export function formatDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Truncates text with an ellipsis if it exceeds the maximum length.
 */
export function truncate(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}
