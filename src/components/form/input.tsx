import { Input as UIInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFieldContext } from "@/hooks/form";
import { useStore } from "@tanstack/react-form";

type Props = { label: string; id: string } & React.ComponentProps<"input">;

export default function Input({ label, id, children, type, ...props }: Props) {
	const field = useFieldContext<string>();

	const isError = useStore(
		field.store,
		(state) => state.meta.isTouched && state.meta.errors.length > 0,
	);
	const errors = useStore(field.store, (state) => state.meta.errors);

	const errorElementId = `${id}-error`;

	return type === "hidden" ? (
		<UIInput
			{...props}
			type={type}
			id={id}
			value={field.state.value}
			onBlur={field.handleBlur}
			onChange={(e) => field.handleChange(e.target.value)}
			aria-invalid={isError}
			aria-describedby={isError ? errorElementId : undefined}
		/>
	) : (
		<div className="flex flex-col gap-y-2">
			<Label htmlFor={id}>{label}</Label>
			<UIInput
				{...props}
				type={type}
				id={id}
				value={field.state.value}
				onBlur={field.handleBlur}
				onChange={(e) => field.handleChange(e.target.value)}
				aria-invalid={isError}
				aria-describedby={isError ? errorElementId : undefined}
			/>
			{isError && (
				<span id={errorElementId} className="text-destructive text-xs">
					{errors.at(0).message}
				</span>
			)}
		</div>
	);
}
