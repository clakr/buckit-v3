import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useFieldContext } from "@/hooks/form";
import { useStore } from "@tanstack/react-form";

type Props = {
	label: string;
	id: string;
	options: Array<string> | Array<{ label: string; value: string }>;
} & Omit<React.ComponentProps<typeof RadioGroup>, "value" | "onValueChange">;

export default function Radio({ label, id, options, ...props }: Props) {
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

	const radioOptions = isObjectOptions(options)
		? options
		: options.map((option) => ({ label: option, value: option }));

	return (
		<div className="flex flex-col gap-y-3">
			<Label>{label}</Label>
			<RadioGroup
				{...props}
				value={field.state.value}
				onValueChange={(value) => field.handleChange(value)}
				aria-invalid={isError}
				aria-describedby={isError ? errorElementId : undefined}
			>
				{radioOptions.map(({ label: optionLabel, value }) => {
					const optionId = `${id}-${value}`;

					return (
						<div key={value} className="flex items-center space-x-1.5">
							<RadioGroupItem value={value} id={optionId} />
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
