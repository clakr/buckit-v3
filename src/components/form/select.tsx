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

type Props = {
	label: string;
	id: string;
	options: Array<string> | Array<{ label: string; value: string }>;
	placeholder?: string;
} & Omit<React.ComponentProps<typeof UISelect>, "value" | "onValueChange">;

function Select({ label, id, options, placeholder, ...props }: Props) {
	const field = useFieldContext<string>();

	const isError = useStore(
		field.store,
		(state) => state.meta.isTouched && state.meta.errors.length > 0,
	);
	const errors = useStore(field.store, (state) => state.meta.errors);

	const errorElementId = `${id}-error`;

	const isObjectOptions = (
		opts: typeof options,
	): opts is Array<{ label: string; value: string }> => {
		return opts.length > 0 && typeof opts[0] === "object" && "label" in opts[0];
	};

	const selectOptions = isObjectOptions(options)
		? options
		: options.map((option) => ({ label: option, value: option }));

	return (
		<div className="flex flex-col gap-y-2">
			<Label htmlFor={id}>{label}</Label>
			<UISelect
				{...props}
				value={field.state.value}
				onValueChange={(value) => field.handleChange(value)}
			>
				<SelectTrigger
					id={id}
					aria-invalid={isError}
					aria-describedby={isError ? errorElementId : undefined}
					className="w-full capitalize"
				>
					<SelectValue placeholder={placeholder} />
				</SelectTrigger>
				<SelectContent>
					{selectOptions.map(({ label: optionLabel, value }) => (
						<SelectItem key={value} value={value} className="capitalize">
							{optionLabel}
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

export default Select;
