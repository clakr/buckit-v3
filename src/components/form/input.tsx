import { Input as UIInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFieldContext } from "@/hooks/form";
import { useStore } from "@tanstack/react-form";

type Props = { label: string; id: string } & React.ComponentProps<"input">;

export default function Input({ label, id, children, ...props }: Props) {
	const field = useFieldContext<string>();

	const errors = useStore(field.store, (state) => state.meta.errors);

	const errorElementId = `${id}-error`;

	return (
		<div className="flex flex-col gap-y-2 ">
			<Label htmlFor={id}>{label}</Label>
			<UIInput
				{...props}
				id={id}
				value={field.state.value}
				onBlur={field.handleBlur}
				onChange={(e) => field.handleChange(e.target.value)}
				aria-invalid={errors.length > 0}
				aria-describedby={errors.length > 0 ? errorElementId : undefined}
			/>
			{errors.length > 0 && (
				<span id={errorElementId} className="text-destructive text-xs">
					{errors.at(0).message}
				</span>
			)}
		</div>
	);
}
