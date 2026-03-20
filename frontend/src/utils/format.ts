/** Formats a number as a compact CAD currency string. e.g., 450000 -> "$450k" */
export function fmtK(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1000)}k`;
  return `$${n}`;
}

/** Formats a number as a full CAD currency string with commas. e.g., 90000 -> "$90,000" */
export function fmtFull(n: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(n);
}

/** Returns a CSS class name based on risk severity level. */
export function severityColor(severity: string): string {
  if (severity === 'high') return 'risk-item severity-high';
  if (severity === 'medium') return 'risk-item severity-medium';
  return 'risk-item severity-low';
}
