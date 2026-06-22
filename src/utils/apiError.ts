import { isAxiosError } from 'axios';

export function getApiErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const msg: string | undefined = err.response?.data?.error?.message ?? err.response?.data?.message;
    if (msg) return formatApiErrorMessage(msg);
  }
  return 'Something went wrong. Please try again.';
}

// Converts large raw-byte numbers in server messages to MB, e.g.:
// "File size too large. Got 19243481. Maximum is 10485760."
// → "File size too large. Got 18.4 MB. Maximum is 10.0 MB."
function formatApiErrorMessage(msg: string): string {
  return msg.replace(/\b(\d{6,})\b/g, (match) => {
    const mb = parseInt(match, 10) / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  });
}
