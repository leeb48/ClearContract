import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  cashDiscountAmount,
  computeQuoteTotals,
  feeSurcharge,
  formatCents,
  lineTotal,
  type LineItem,
  type QuoteMoneyInput,
} from "./money";

const arbFixedItem = fc.record({
  id: fc.uuid(),
  description: fc.string(),
  type: fc.constant<"fixed">("fixed"),
  qty: fc.integer({ min: 0, max: 1000 }),
  unit_price: fc.integer({ min: 0, max: 5_000_000 }),
});

const arbHourlyItem = fc.record({
  id: fc.uuid(),
  description: fc.string(),
  type: fc.constant<"hourly">("hourly"),
  hours: fc.float({ min: 0, max: 500, noNaN: true }),
  rate: fc.integer({ min: 0, max: 100_000 }),
});

const arbItem: fc.Arbitrary<LineItem> = fc.oneof(arbFixedItem, arbHourlyItem);

const arbQuote: fc.Arbitrary<QuoteMoneyInput> = fc.record({
  line_items: fc.array(arbItem, { maxLength: 20 }),
  extras: fc.array(arbItem, { maxLength: 5 }),
  tax_enabled: fc.boolean(),
  tax_rate: fc.oneof(
    fc.constant(0),
    fc.float({ min: 0, max: 30, noNaN: true }),
  ),
  deposit_enabled: fc.boolean(),
  deposit_type: fc.constantFrom<"fixed" | "percent">("fixed", "percent"),
  deposit_value: fc.integer({ min: 0, max: 10_000_000 }),
  cash_enabled: fc.boolean(),
  cash_discount_type: fc.constantFrom<"fixed" | "percent">("fixed", "percent"),
  cash_discount_value: fc.integer({ min: 0, max: 10_000_000 }),
});

describe("computeQuoteTotals properties", () => {
  it("all amounts are non-negative integers", () => {
    fc.assert(
      fc.property(arbQuote, (q) => {
        const t = computeQuoteTotals(q);
        const amounts = [
          t.subtotal,
          t.taxAmount,
          t.total,
          t.depositAmount,
          t.remaining,
        ];
        if (t.cash) {
          amounts.push(
            t.cash.discountAmount,
            t.cash.subtotal,
            t.cash.taxAmount,
            t.cash.total,
            t.cash.depositAmount,
            t.cash.remaining,
          );
        }
        for (const a of amounts) {
          expect(Number.isInteger(a)).toBe(true);
          expect(a).toBeGreaterThanOrEqual(0);
        }
      }),
    );
  });

  it("subtotal is the sum of line totals (items + extras)", () => {
    fc.assert(
      fc.property(arbQuote, (q) => {
        const t = computeQuoteTotals(q);
        const expected = [...q.line_items, ...(q.extras ?? [])].reduce(
          (s, i) => s + lineTotal(i),
          0,
        );
        expect(t.subtotal).toBe(expected);
      }),
    );
  });

  it("tax rounds to the cent and total = subtotal + tax", () => {
    fc.assert(
      fc.property(arbQuote, (q) => {
        const t = computeQuoteTotals(q);
        const expectedTax =
          q.tax_enabled && (q.tax_rate ?? 0) > 0
            ? Math.round((t.subtotal * q.tax_rate!) / 100)
            : 0;
        expect(t.taxAmount).toBe(expectedTax);
        expect(t.total).toBe(t.subtotal + t.taxAmount);
      }),
    );
  });

  it("deposit never exceeds total; remaining = total − deposit", () => {
    fc.assert(
      fc.property(arbQuote, (q) => {
        const t = computeQuoteTotals(q);
        expect(t.depositAmount).toBeLessThanOrEqual(t.total);
        expect(t.remaining).toBe(t.total - t.depositAmount);
      }),
    );
  });

  it("cash: discount applies pre-tax, tax recomputed on discounted subtotal, deposit capped at cash total", () => {
    fc.assert(
      fc.property(arbQuote, (q) => {
        const t = computeQuoteTotals(q);
        if (!t.cash) return;
        expect(t.cash.subtotal).toBe(t.subtotal - t.cash.discountAmount);
        const expectedTax =
          q.tax_enabled && (q.tax_rate ?? 0) > 0
            ? Math.round((t.cash.subtotal * q.tax_rate!) / 100)
            : 0;
        expect(t.cash.taxAmount).toBe(expectedTax);
        expect(t.cash.total).toBe(t.cash.subtotal + t.cash.taxAmount);
        expect(t.cash.total).toBeLessThanOrEqual(t.total);
        expect(t.cash.depositAmount).toBeLessThanOrEqual(t.cash.total);
      }),
    );
  });
});

describe("computeQuoteTotals examples", () => {
  const items: LineItem[] = [
    {
      id: "1",
      description: "Driveway base",
      type: "fixed",
      qty: 2,
      unit_price: 50_000,
    },
    { id: "2", description: "Labor", type: "hourly", hours: 3, rate: 8_000 },
  ];

  it("computes a plain quote", () => {
    const t = computeQuoteTotals({ line_items: items });
    expect(t.subtotal).toBe(124_000);
    expect(t.taxAmount).toBe(0);
    expect(t.total).toBe(124_000);
    expect(t.depositAmount).toBe(0);
    expect(t.cash).toBeNull();
  });

  it("applies sales tax with fractional rate", () => {
    const t = computeQuoteTotals({
      line_items: items,
      tax_enabled: true,
      tax_rate: 8.25,
    });
    expect(t.taxAmount).toBe(10_230); // 124000 * 8.25% = 10230
    expect(t.total).toBe(134_230);
  });

  it("percent deposit recomputes against cash-discounted total; fixed deposit is capped", () => {
    const base: QuoteMoneyInput = {
      line_items: items,
      tax_enabled: true,
      tax_rate: 10,
      deposit_enabled: true,
      deposit_type: "percent",
      deposit_value: 25,
      cash_enabled: true,
      cash_discount_type: "percent",
      cash_discount_value: 10,
    };
    const t = computeQuoteTotals(base);
    // card path: 124000 + 12400 tax = 136400; deposit 34100
    expect(t.total).toBe(136_400);
    expect(t.depositAmount).toBe(34_100);
    // cash path: subtotal 111600 + 11160 tax = 122760; deposit 30690
    expect(t.cash).not.toBeNull();
    expect(t.cash!.total).toBe(122_760);
    expect(t.cash!.depositAmount).toBe(30_690);

    const fixed = computeQuoteTotals({
      ...base,
      deposit_type: "fixed",
      deposit_value: 130_000,
    });
    expect(fixed.depositAmount).toBe(130_000); // under card total
    expect(fixed.cash!.depositAmount).toBe(122_760); // capped at cash total
  });

  it("hourly fractional hours round to the cent", () => {
    expect(
      lineTotal({
        id: "x",
        description: "",
        type: "hourly",
        hours: 1.5,
        rate: 3_333,
      }),
    ).toBe(
      5_000, // 4999.5 rounds
    );
  });
});

describe("cashDiscountAmount", () => {
  it("caps fixed discounts at the subtotal", () => {
    expect(cashDiscountAmount(10_000, "fixed", 50_000)).toBe(10_000);
  });
  it("returns 0 for missing/zero values", () => {
    expect(cashDiscountAmount(10_000, "percent", 0)).toBe(0);
    expect(cashDiscountAmount(10_000, undefined, undefined)).toBe(0);
  });
});

describe("feeSurcharge", () => {
  it("is ceil(2.9%) + 30", () => {
    expect(feeSurcharge(100_000)).toBe(2_930);
    expect(feeSurcharge(33_333)).toBe(Math.ceil(33_333 * 0.029) + 30);
    expect(feeSurcharge(0)).toBe(0);
  });
});

describe("formatCents", () => {
  it("formats USD at the display edge", () => {
    expect(formatCents(1_035_000)).toBe("$10,350.00");
    expect(formatCents(0)).toBe("$0.00");
  });
});
