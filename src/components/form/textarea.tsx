import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea as UITextarea } from "@/components/ui/textarea";
import { useFieldContext } from "@/hooks/form";
import { useStore } from "@tanstack/react-form";

type Props = { label: string; id: string } & React.ComponentProps<"textarea">;

export default function Textarea({ label, id, children, ...props }: Props) {
	const field = useFieldContext<string>();

	const isError = useStore(
		field.store,
		(state) => state.meta.isTouched && state.meta.errors.length > 0,
	);
	const errors = useStore(field.store, (state) => state.meta.errors);

	const errorElementId = `${id}-error`;

	return (
		<Field>
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			<UITextarea
				{...props}
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
