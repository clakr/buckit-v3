import { Label } from "@/components/ui/label";
import {
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Select as UISelect,
} from "@/components/ui/select";
import { useFieldContext } from "@/hooks/form";
import { useStore } from "@tanstack/react-form";
import type { z } from "zod";

type Props<T extends z.ZodEnum<[string, ...string[]]>> = {
	label: string;
	id: string;
	enumSchema: T;
	placeholder?: string;
} & Omit<React.ComponentProps<typeof UISelect>, "value" | "onValueChange">;

export default function Select<T extends z.ZodEnum<[string, ...string[]]>>({
	label,
	id,
	enumSchema,
	placeholder,
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
		<div className="flex flex-col gap-y-2">
			<Label htmlFor={id}>{label}</Label>
			<UISelect
				{...props}
				value={field.state.value}
				onValueChange={(value) => field.handleChange(value as z.infer<T>)}
			>
				<SelectTrigger
					id={id}
					aria-invalid={isError}
					aria-describedby={isError ? errorElementId : undefined}
					className="w-full"
				>
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>
					{options.map((option) => (
						<SelectItem key={option} value={option}>
							{option.charAt(0).toUpperCase() + option.slice(1)}
						</SelectItem>
					))}
				</SelectContent>
			</UISelect>
			{isError && (
				<span id={errorElementId} className="text-destructive text-xs">
					{errors.at(0)?.message}
				</span>
			)}
		</div>
	);
}
