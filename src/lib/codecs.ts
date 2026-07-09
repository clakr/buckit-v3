import z from "zod";

export const currencyCodec = z.codec(
  z.number().int("Input value must be in cents (whole number)"),
  z
    .number()
    .refine(
      (val) => Number.isInteger(val * 100),
      "Output value must have atleast two (2) decimal places",
    ),
  {
    decode: (input) => input / 100,
    encode: (output) => Math.round(output * 100),
  },
);
