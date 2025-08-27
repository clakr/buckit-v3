import { Button as UIButton } from "@/components/ui/button";
import { useFormContext } from "@/hooks/form";
import { Icon } from "@iconify/react";

type Props = {} & React.ComponentProps<"button">;

export default function Button({ children, ...props }: Props) {
	const form = useFormContext();

	return (
		<form.Subscribe
			selector={(state) => [
				state.canSubmit,
				state.isSubmitting,
				state.errors.length > 0,
			]}
		>
			{([canSubmit, isSubmitting, hasErrors]) => (
				<UIButton {...props} disabled={!canSubmit || isSubmitting || hasErrors}>
					{isSubmitting ? (
						<Icon icon="bx:loader-alt" className="animate-spin" />
					) : (
						children
					)}
				</UIButton>
			)}
		</form.Subscribe>
	);
}
