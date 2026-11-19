interface ErrorDetails {
  cause?: unknown;
  code?: unknown;
  message?: unknown;
  name?: unknown;
  reason?: unknown;
  shortMessage?: unknown;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function getErrorChain(error: unknown): ErrorDetails[] {
  const chain: ErrorDetails[] = [];
  const visited = new Set<object>();
  let current = error;

  while (isObject(current) && !visited.has(current) && chain.length < 10) {
    visited.add(current);
    chain.push(current as ErrorDetails);
    current = current.cause;
  }

  return chain;
}

function getText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function cleanMessage(message: string): string {
  const concise = message
    .replace(/\s+/g, ' ')
    .split(/\b(?:Request Arguments:|Contract Call:|Docs:|Details:|Version:)/i)[0]
    .trim();

  if (concise.length <= 200) return concise;
  return `${concise.slice(0, 197).trimEnd()}...`;
}

export function formatWeb3Error(error: unknown): string {
  const chain = getErrorChain(error);
  const wasRejected = chain.some((item) => {
    if (item.code === 4001 || getText(item.name)?.includes('UserRejected')) return true;
    const text = `${getText(item.shortMessage) ?? ''} ${getText(item.message) ?? ''}`;
    return /user (?:rejected|denied)|request (?:was )?rejected|denied transaction signature/i.test(
      text,
    );
  });

  if (wasRejected) return 'You rejected the request in your wallet.';

  for (const item of [...chain].reverse()) {
    const reason = getText(item.reason);
    if (reason) return cleanMessage(reason);
  }

  for (const item of [...chain].reverse()) {
    const message = getText(item.shortMessage);
    if (message && !/^an error occurred\b/i.test(message)) return cleanMessage(message);
  }

  for (const item of [...chain].reverse()) {
    const message = getText(item.message);
    if (message) return cleanMessage(message);
  }

  if (typeof error === 'string' && error.trim()) return cleanMessage(error);
  return 'An unexpected wallet or network error occurred.';
}
