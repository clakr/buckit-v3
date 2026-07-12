import z from "zod";

export const currencyCodec = z.codec(
  z
    .number()
    .refine(
      (val) => Number.isInteger(val * 100),
      "Output value must have atleast two (2) decimal places",
    ),

  z.number().int("Input value must be in cents (whole number)"),
  {
    decode: (output) => Math.round(output * 100),
    encode: (input) => input / 100,
  },
);
