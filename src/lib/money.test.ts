import { describe, expect, it } from "vitest";

import {
  amountSchema,
  centsToAmountInput,
  describeInsufficientUnallocated,
  exceedsAvailable,
  formatMoney,
  nonNegativeAmountSchema,
} from "#/lib/money";

describe("amountSchema", () => {
  it("parses what the user typed to cents", () => {
    expect(amountSchema.parse("12.34")).toBe(1234);
    expect(amountSchema.parse(2100.01)).toBe(210001);
    expect(amountSchema.parse("5")).toBe(500);
  });

  it("rejects more than 2 decimal places with a message, not a throw", () => {
    const result = amountSchema.safeParse("1.005");

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Use at most 2 decimal places.");
  });

  it("rejects 0 and negatives", () => {
    expect(amountSchema.safeParse("0").error?.issues[0]?.message).toBe(
      "Amount must be greater than 0.",
    );
    expect(amountSchema.safeParse(-1).success).toBe(false);
  });
});

describe("nonNegativeAmountSchema", () => {
  const startingBalance = nonNegativeAmountSchema("Starting balance cannot be negative.");

  it("allows 0", () => {
    expect(startingBalance.parse(0)).toBe(0);
  });

  it("rejects negatives with the given message", () => {
    expect(startingBalance.safeParse(-0.01).error?.issues[0]?.message).toBe(
      "Starting balance cannot be negative.",
    );
  });
});

describe("centsToAmountInput", () => {
  it("is the inverse of parsing", () => {
    expect(amountSchema.parse(centsToAmountInput(210001))).toBe(210001);
  });
});

describe("formatMoney", () => {
  it("shows cents in their currency with 2 decimals", () => {
    expect(formatMoney(123450, "USD")).toMatch(/1,234\.50/);
    expect(formatMoney(5, "PHP")).toMatch(/0\.05/);
  });
});

describe("exceedsAvailable", () => {
  it("compares the typed amount with cents available", () => {
    expect(exceedsAvailable("10.01", 1000)).toBe(true);
    expect(exceedsAvailable("10.00", 1000)).toBe(false);
  });

  it("is never true for input that isn't a valid amount yet", () => {
    expect(exceedsAvailable("", 0)).toBe(false);
    expect(exceedsAvailable("1.005", 0)).toBe(false);
  });
});

describe("describeInsufficientUnallocated", () => {
  const bankAccount = { name: "Savings", currency: "USD" };

  it("names the account and what's available", () => {
    expect(describeInsufficientUnallocated({ bankAccount, available: 2500 })).toMatch(
      /^Insufficient unallocated balance in Savings\. Available: .*25\.00$/,
    );
  });

  it("says what the money was for", () => {
    expect(describeInsufficientUnallocated({ bankAccount, available: 0, purpose: "loan" })).toMatch(
      /^Insufficient unallocated balance in Savings for this loan\. /,
    );
  });
});
