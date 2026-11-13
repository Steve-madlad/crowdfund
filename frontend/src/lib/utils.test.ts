import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calculateBarPercentage, dateInputToDeadline, daysLeft, formatEth } from './utils.ts';

describe('formatEth', () => {
  it('formats wei as ETH without floating-point conversion', () => {
    assert.equal(formatEth(1_000_000_000_000_000_000n), '1');
    assert.equal(formatEth(1_234_567_890_123_456_789n), '1.234567');
    assert.equal(formatEth(1n), '0.000000000000000001');
  });
});

describe('daysLeft', () => {
  it('rounds future partial days up and marks expired deadlines', () => {
    const now = 1_000_000;
    const nowSeconds = BigInt(Math.floor(now / 1000));

    assert.equal(daysLeft(nowSeconds + 1n, now), 1);
    assert.equal(daysLeft(nowSeconds + 86_400n, now), 1);
    assert.equal(daysLeft(nowSeconds + 86_401n, now), 2);
    assert.equal(daysLeft(nowSeconds, now), null);
    assert.equal(daysLeft(nowSeconds - 1n, now), null);
  });
});

describe('dateInputToDeadline', () => {
  it('uses the end of the selected local calendar day', () => {
    const now = new Date(2026, 10, 13, 12).getTime();
    const deadline = dateInputToDeadline('2026-11-14', now);
    const deadlineDate = new Date(Number(deadline) * 1000);

    assert.equal(deadlineDate.getFullYear(), 2026);
    assert.equal(deadlineDate.getMonth(), 10);
    assert.equal(deadlineDate.getDate(), 14);
    assert.equal(deadlineDate.getHours(), 23);
    assert.equal(deadlineDate.getMinutes(), 59);
    assert.equal(deadlineDate.getSeconds(), 59);
  });

  it('rejects invalid and past dates', () => {
    const now = new Date(2026, 10, 13, 12).getTime();

    assert.throws(() => dateInputToDeadline('2026-02-30', now), RangeError);
    assert.throws(() => dateInputToDeadline('not-a-date', now), RangeError);
    assert.throws(() => dateInputToDeadline('2026-11-12', now), RangeError);
  });
});

describe('calculateBarPercentage', () => {
  it('handles zero goals and caps progress at 100 percent', () => {
    assert.equal(calculateBarPercentage(0n, 10n), 0);
    assert.equal(calculateBarPercentage(10n, 0n), 0);
    assert.equal(calculateBarPercentage(10n, 5n), 50);
    assert.equal(calculateBarPercentage(100n, 99n), 99);
    assert.equal(calculateBarPercentage(10n, 11n), 100);
  });
});
