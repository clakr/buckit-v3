import z from "zod";

export const currencyCodec = z.codec(
  z
    .number()
    .refine(
      // Floats can't represent most cents exactly (2100.01 * 100 = 210001.00000000003),
      // so compare to the nearest cent within a tolerance instead of `Number.isInteger`.
      (val) => Math.abs(val * 100 - Math.round(val * 100)) < 1e-6,
      "Input value must have atmost 2 (two) decimal places",
    ),
  z.number().int("Output value must be in cents (whole number)"),
  {
    encode: (input) => input / 100,
    decode: (output) => Math.round(output * 100),
  },
);
