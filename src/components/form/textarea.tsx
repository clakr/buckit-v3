import { Label } from "@/components/ui/label";
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
		<div className="flex flex-col gap-y-2">
			<Label htmlFor={id}>{label}</Label>
			<UITextarea
				{...props}
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
