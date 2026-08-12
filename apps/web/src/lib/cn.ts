import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function statusColor(status: string): string {
  switch (status) {
    case "ACTIVE":
      return "#7a9e7e";
    case "CHANGING":
      return "#c4a574";
    case "LAST_SEEN":
      return "#8a8680";
    case "GONE":
      return "#f2efe8";
    case "CONTESTED":
      return "#c46b5a";
    default:
      return "#8a8680";
  }
}
