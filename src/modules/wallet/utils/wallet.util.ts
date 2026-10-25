export function decimalToNumber(value: { toNumber(): number } | number): number {
  return typeof value === 'number' ? value : value.toNumber();
}

export function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 4) return accountNumber;
  return `${'*'.repeat(Math.max(0, accountNumber.length - 4))}${accountNumber.slice(-4)}`;
}

export function hashQuery(query: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(query)).toString('base64url');
}
