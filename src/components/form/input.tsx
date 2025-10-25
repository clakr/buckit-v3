import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input as UIInput } from "@/components/ui/input";
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
		<Field>
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
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
			<FieldError id={errorElementId} errors={errors} />
		</Field>
	);
}
