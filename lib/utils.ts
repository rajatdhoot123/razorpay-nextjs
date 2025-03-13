/**
 * Formats an amount from the smallest currency unit (e.g., paise) to a readable format
 * @param amount Amount in smallest currency unit (e.g., 1000 for ₹10.00)
 * @param currency Currency code (e.g., 'INR')
 * @returns Formatted amount string (e.g., '₹10.00')
 */
export function formatAmount(amount: number, currency: string = 'INR'): string {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  });
  
  return formatter.format(amount / 100);
}

/**
 * Generates a unique receipt ID for orders
 * @returns Receipt ID string (e.g., 'rcpt_1234567890')
 */
export function generateReceiptId(): string {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `rcpt_${timestamp}${random}`;
}

/**
 * Formats a Unix timestamp to a readable date string
 * @param timestamp Unix timestamp in seconds
 * @returns Formatted date string (e.g., 'Jan 1, 2023, 12:00 PM')
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  });
}

/**
 * Validates an email address
 * @param email Email address to validate
 * @returns Boolean indicating if the email is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates a phone number (Indian format)
 * @param phone Phone number to validate
 * @returns Boolean indicating if the phone number is valid
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone);
}

/**
 * Validates a GSTIN (Indian GST Identification Number)
 * @param gstin GSTIN to validate
 * @returns Boolean indicating if the GSTIN is valid
 */
export function isValidGSTIN(gstin: string): boolean {
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstinRegex.test(gstin);
}

/**
 * Truncates a string to a specified length and adds an ellipsis if needed
 * @param str String to truncate
 * @param length Maximum length of the string
 * @returns Truncated string
 */
export function truncateString(str: string, length: number = 30): string {
  if (!str) return '';
  if (str.length <= length) return str;
  return `${str.substring(0, length)}...`;
} 