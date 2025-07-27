import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useFieldContext } from "@/hooks/form";
import { useStore } from "@tanstack/react-form";
import type { z } from "zod";

type Props<T extends z.ZodEnum<[string, ...string[]]>> = {
	label: string;
	id: string;
	enumSchema: T;
	labels?: Record<z.infer<T>, string>;
} & Omit<React.ComponentProps<typeof RadioGroup>, "value" | "onValueChange">;

export default function Radio<T extends z.ZodEnum<[string, ...string[]]>>({
	label,
	id,
	enumSchema,
	labels,
	...props
}: Props<T>) {
	const field = useFieldContext<z.infer<T>>();

	const isError = useStore(
		field.store,
		(state) => state.meta.isTouched && state.meta.errors.length > 0,
	);
	const errors = useStore(field.store, (state) => state.meta.errors);

	const errorElementId = `${id}-error`;
	const options = enumSchema.options;

	return (
		<div className="flex flex-col gap-y-3">
			<Label>{label}</Label>
			<RadioGroup
				{...props}
				value={field.state.value}
				onValueChange={(value) => field.handleChange(value as z.infer<T>)}
				aria-invalid={isError}
				aria-describedby={isError ? errorElementId : undefined}
			>
				{options.map((option) => {
					const optionId = `${id}-${option}`;
					const optionLabel = labels?.[option as z.infer<T>] || option;

					return (
						<div key={option} className="flex items-center space-x-1.5">
							<RadioGroupItem value={option} id={optionId} />
							<Label htmlFor={optionId} className="capitalize">
								{optionLabel}
							</Label>
						</div>
					);
				})}
			</RadioGroup>
			{isError && (
				<span id={errorElementId} className="text-destructive text-xs">
					{errors.at(0)?.message}
				</span>
			)}
		</div>
	);
}
