# Currency & Formatting

- Store amounts as a `number` (or `decimal` in DB). For JS, `number` is fine since we're not doing heavy math.
- Display amounts with the appropriate currency symbol:
  - QAR: `1,234.56 QAR`
  - PHP: `₱1,234.56`
- Input fields should accept values like `1234.56` (standard number input).
- Starting balance input: `type="number"`, `step="0.01"`, `min="0"`.
