import z from "zod";

export const currencyCodec = z.codec(
  z
    .number()
    .refine(
      (val) => Number.isInteger(val * 100),
      "Input value must have atmost 2 (two) decimal places",
    ),
  z.number().int("Output value must be in cents (whole number)"),
  {
    encode: (input) => input / 100,
    decode: (output) => Math.round(output * 100),
  },
);
