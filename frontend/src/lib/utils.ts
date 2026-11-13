import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatEther } from 'viem';

const SECONDS_PER_DAY = 86_400n;

export const daysLeft = (deadlineSeconds: bigint, now = Date.now()): number | null => {
  const remainingSeconds = deadlineSeconds - BigInt(Math.floor(now / 1000));

  if (remainingSeconds <= 0n) {
    return null;
  }

  return Number((remainingSeconds + SECONDS_PER_DAY - 1n) / SECONDS_PER_DAY);
};

export const formatEth = (wei: bigint, maximumFractionDigits = 6): string => {
  if (!Number.isInteger(maximumFractionDigits) || maximumFractionDigits < 0) {
    throw new RangeError('maximumFractionDigits must be a non-negative integer');
  }

  const [whole, fraction = ''] = formatEther(wei).split('.');
  const trimmedFraction = fraction.replace(/0+$/, '');
  let precision = Math.min(trimmedFraction.length, maximumFractionDigits);

  if (whole === '0' && !/[1-9]/.test(trimmedFraction.slice(0, precision))) {
    const firstNonZeroDigit = trimmedFraction.search(/[1-9]/);
    if (firstNonZeroDigit !== -1) {
      precision = firstNonZeroDigit + 1;
    }
  }

  const displayedFraction = trimmedFraction.slice(0, precision).replace(/0+$/, '');
  return displayedFraction ? `${whole}.${displayedFraction}` : whole;
};

export const dateInputToDeadline = (dateInput: string, now = Date.now()): bigint => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateInput);

  if (!match) {
    throw new RangeError('Choose a valid end date');
  }

  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const deadline = new Date(year, month - 1, day, 23, 59, 59);

  if (
    deadline.getFullYear() !== year ||
    deadline.getMonth() !== month - 1 ||
    deadline.getDate() !== day
  ) {
    throw new RangeError('Choose a valid end date');
  }

  if (deadline.getTime() <= now) {
    throw new RangeError('The end date must be in the future');
  }

  return BigInt(Math.floor(deadline.getTime() / 1000));
};

export const calculateBarPercentage = (goal: bigint, raisedAmount: bigint): number => {
  if (goal <= 0n || raisedAmount <= 0n) {
    return 0;
  }

  if (raisedAmount >= goal) {
    return 100;
  }

  return Number((raisedAmount * 100n) / goal);
};

export const checkIfImage = (url: string, callback: (exists: boolean) => void): void => {
  const img = new Image();
  img.src = url;

  if (img.complete) {
    callback(true);
    return;
  }

  img.onload = () => callback(true);
  img.onerror = () => callback(false);
};

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export default cn;

