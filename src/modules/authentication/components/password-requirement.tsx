import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Icon } from "@iconify/react/dist/iconify.js";

interface Props {
	password: string;
}

export function PasswordRequirements({ password }: Props) {
	const requirements = [
		{
			text: "At least 8 characters",
			isValid: password.length >= 8,
		},
		{
			text: "At least one uppercase letter",
			isValid: /[A-Z]/.test(password),
		},
		{
			text: "At least one lowercase letter",
			isValid: /[a-z]/.test(password),
		},
		{
			text: "At least one number",
			isValid: /[0-9]/.test(password),
		},
		{
			text: "At least one special character",
			isValid: /[^A-Za-z0-9]/.test(password),
		},
	];

	return (
		<div className="flex flex-col gap-y-2">
			<Label>Password Requirements: </Label>
			<ul className="text-xs flex flex-col gap-y-1">
				{requirements.map((requirement) => (
					<li
						key={requirement.text}
						className={cn(
							"flex items-center gap-x-2",
							requirement.isValid ? "text-green-500" : "text-muted-foreground",
						)}
					>
						<Icon icon={requirement.isValid ? "bx:check" : "bx:x"} />
						<span>{requirement.text}</span>
					</li>
				))}
			</ul>
		</div>
	);
}
