import { MAXIMUM_CURRENCY_AMOUNT } from "@/lib/constants";
import { splitAllocationTypeEnum, splitTargetTypeEnum } from "@/lib/schemas";
import z from "zod";

const splitBaseSchema = z.object({
	id: z.string().uuid("Invalid Split ID"),

	name: z
		.string()
		.min(1, "Bucket name is required")
		.max(100, "Bucket name must be 100 characters or less")
		.trim(),

	description: z
		.string()
		.max(500, "Description must be 500 characters or less")
		.trim()
		.optional()
		.nullable()
		.transform((val) => (val === "" ? null : val)),

	base_amount: z.coerce
		.number({
			required_error: "Base amount is required",
			invalid_type_error: "Base amount must be a valid number",
		})
		.positive({ message: "Base amount must be greater than 0" })
		.max(MAXIMUM_CURRENCY_AMOUNT, {
			message: `Base amount must be less than ${MAXIMUM_CURRENCY_AMOUNT}`,
		})
		.multipleOf(0.01, {
			message: "Base amount can only have up to 2 decimal places",
		}),
});

const allocationBaseSchema = z
	.object({
		id: z.string().uuid("Invalid Allocation ID"),

		split_id: splitBaseSchema.shape.id,

		target_type: splitTargetTypeEnum,

		target_id: z.string().uuid("Invalid target ID"),

		allocation_type: splitAllocationTypeEnum,

		amount: z.coerce
			.number({
				required_error: "Amount is required",
				invalid_type_error: "Amount must be a valid number",
			})
			.positive({ message: "Amount must be greater than 0" })
			.max(MAXIMUM_CURRENCY_AMOUNT, {
				message: `Amount cannot exceed ${MAXIMUM_CURRENCY_AMOUNT}`,
			})
			.multipleOf(0.01, {
				message: "Amount can only have up to 2 decimal places",
			})
			.nullable(),

		percentage: z.coerce
			.number({
				required_error: "Percentage is required",
				invalid_type_error: "Percentage must be a valid number",
			})
			.min(0.01, "Percentage must be at least 0.01%")
			.max(100, "Percentage cannot exceed 100%")
			.multipleOf(0.01, {
				message: "Percentage can only have up to 2 decimal places",
			})
			.nullable(),
	})
	// validates `allocation.allocation_type`,
	// depending on the value, checks if `allocation.amount` or `allocation.percentage` is present
	.refine(
		(data) => {
			const hasAmount = data.amount !== null;
			const hasPercentage = data.percentage !== null;

			const isValidFixed =
				data.allocation_type === "fixed" && hasAmount && !hasPercentage;
			const isValidPercentage =
				data.allocation_type === "percentage" && hasPercentage && !hasAmount;

			return isValidFixed || isValidPercentage;
		},
		{
			message:
				"Fixed allocations must have amount, percentage allocations must have percentage",
		},
	);

export const createSplitFormSchema = splitBaseSchema
	.extend({
		allocations: z
			.array(allocationBaseSchema)
			.min(1, "At least one allocation is required")
			.refine(
				(allocations) => {
					const targetKeys = allocations.map(
						(a) => `${a.target_type}-${a.target_id}`,
					);
					return targetKeys.length === new Set(targetKeys).size;
				},
				{
					message: "Each bucket or goal can only be allocated once",
				},
			),
	})
	// validates if `allocation[].split_id` references `split.id`
	.refine(
		(data) =>
			data.allocations.every((allocation) => allocation.split_id === data.id),
		{
			message: "All allocations must reference the parent split ID",
			path: ["allocations"],
		},
	)
	// validates if `allocation[].allocation_type === 'percentage'` exceeds 100%
	.refine(
		(data) => {
			const totalPercentage = data.allocations.reduce((sum, allocation) => {
				if (
					allocation.allocation_type === "percentage" &&
					allocation.percentage
				) {
					return sum + allocation.percentage;
				}

				return sum;
			}, 0);

			return totalPercentage <= 100;
		},
		{
			message: "Total percentage allocations cannot exceed 100%",
			path: ["allocations"],
		},
	)
	// validates if the accumulated amount of `allocations` exceeds `split.base_amount`
	.refine(
		(data) => {
			let totalFixed = 0;
			let totalPercentage = 0;

			for (const allocation of data.allocations) {
				if (allocation.allocation_type === "fixed" && allocation.amount) {
					totalFixed += allocation.amount;
				} else if (
					allocation.allocation_type === "percentage" &&
					allocation.percentage
				) {
					totalPercentage += allocation.percentage;
				}
			}

			const totalCalculated =
				totalFixed + (data.base_amount * totalPercentage) / 100;
			return totalCalculated <= data.base_amount;
		},
		{
			message: "Total allocations exceed base amount",
			path: ["allocations"],
		},
	);

export const updateSplitFormSchema = createSplitFormSchema;

export type AllocationData = z.infer<typeof allocationBaseSchema>;

export function createEmptyAllocation(
	payload: Partial<AllocationData>,
): AllocationData {
	return {
		id: crypto.randomUUID(),
		split_id: "",
		target_type: "bucket",
		target_id: "",
		allocation_type: "fixed",
		amount: null,
		percentage: null,
		...payload,
	};
}
