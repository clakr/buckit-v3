import z from "zod";

export const targetTypeEnum = z.enum(["bucket", "goal"]);
export const allocationTypeEnum = z.enum(["percentage", "fixed"]);

const splitBaseSchema = {
	id: z.string().uuid("Invalid Split ID"),

	name: z
		.string()
		.min(1, "Split name is required")
		.max(100, "Split name must be 100 characters or less")
		.trim(),

	base_amount: z
		.number({
			required_error: "Base amount is required",
			invalid_type_error: "Base amount must be a number",
		})
		.positive("Base amount must be greater than 0")
		.transform((val) => Math.round(val * 100) / 100)
		.refine(
			(val) => val > 0 && val <= 999999999.99,
			"Base amount must be between 0.01 and 999,999,999.99",
		),

	description: z
		.string()
		.max(500, "Description must be 500 characters or less")
		.trim()
		.optional()
		.nullable()
		.transform((val) => (val === "" ? null : val)),

	is_active: z.boolean().default(true),
};

const allocationSchema = z
	.object({
		split_id: splitBaseSchema.id,

		target_type: targetTypeEnum,

		target_id: z.string().uuid("Invalid target ID"),

		allocation_type: allocationTypeEnum,

		amount: z.coerce
			.number()
			.positive("Amount must be greater than 0")
			.transform((val) => Math.round(val * 100) / 100)
			.refine(
				(val) => val > 0 && val <= 999999999.99,
				"Amount must be between 0.01 and 999,999,999.99",
			)
			.nullable()
			.optional(),

		percentage: z.coerce
			.number()
			.min(0.01, "Percentage must be at least 0.01%")
			.max(100, "Percentage cannot exceed 100%")
			.transform((val) => Math.round(val * 100) / 100)
			.nullable()
			.optional(),
	})
	.refine(
		(data) => {
			if (data.allocation_type === "fixed") {
				return (
					data.amount !== null && data.amount !== undefined && !data.percentage
				);
			}
			return (
				data.percentage !== null &&
				data.percentage !== undefined &&
				!data.amount
			);
		},
		{
			message:
				"Fixed allocations must have amount, percentage allocations must have percentage",
		},
	);

export const createSplitFormSchema = z
	.object({
		id: splitBaseSchema.id,

		name: splitBaseSchema.name,

		base_amount: z.coerce
			.number({
				required_error: "Base amount is required",
				invalid_type_error: "Base amount must be a number",
			})
			.positive("Base amount must be greater than 0")
			.transform((val) => Math.round(val * 100) / 100)
			.refine(
				(val) => val > 0 && val <= 999999999.99,
				"Base amount must be between 0.01 and 999,999,999.99",
			),

		description: splitBaseSchema.description,

		is_active: splitBaseSchema.is_active,

		allocations: z
			.array(allocationSchema)
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
	.refine(
		(data) => {
			return data.allocations.every(
				(allocation) => allocation.split_id === data.id,
			);
		},
		{
			message: "All allocations must reference the parent split ID",
			path: ["allocations"],
		},
	)
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
	)
	.refine(
		(data) => {
			const totalPercentage = data.allocations
				.filter((a) => a.allocation_type === "percentage")
				.reduce((sum, a) => sum + (a.percentage || 0), 0);

			return totalPercentage <= 100;
		},
		{
			message: "Total percentage allocations cannot exceed 100%",
			path: ["allocations"],
		},
	);

export const updateSplitFormSchema = z.object({
	id: splitBaseSchema.id,

	name: splitBaseSchema.name,

	base_amount: z.coerce
		.number({
			required_error: "Base amount is required",
			invalid_type_error: "Base amount must be a number",
		})
		.positive("Base amount must be greater than 0")
		.transform((val) => Math.round(val * 100) / 100)
		.refine(
			(val) => val > 0 && val <= 999999999.99,
			"Base amount must be between 0.01 and 999,999,999.99",
		),

	description: splitBaseSchema.description,

	is_active: splitBaseSchema.is_active,
});

export type AllocationData = z.infer<typeof allocationSchema>;

export function createEmptyAllocation(splitId: string): AllocationData {
	return {
		split_id: splitId,
		target_type: "bucket",
		target_id: "",
		allocation_type: "percentage",
		amount: null,
		percentage: null,
	};
}
