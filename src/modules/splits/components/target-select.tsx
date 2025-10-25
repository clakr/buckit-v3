import { Button } from "@/components/ui/button";
import {
	Command,
	CommandGroup,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { useFieldContext } from "@/hooks/form";
import { cn, formatCurrency, formatPercentage } from "@/lib/utils";
import { bucketsQueryOption } from "@/modules/buckets/query-options";
import { goalsQueryOption } from "@/modules/goals/query-options";
import { Icon } from "@iconify/react";
import { useStore } from "@tanstack/react-form";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";

export default function TargetSelect() {
	const field = useFieldContext<string>();

	const isError = useStore(
		field.store,
		(state) => state.meta.isTouched && state.meta.errors.length > 0,
	);
	const errors = useStore(field.store, (state) => state.meta.errors);
	const value = useStore(field.store, (state) => state.value);

	const id = "target-id";
	const errorElementId = `${id}-error`;

	const [open, setOpen] = useState(false);

	const { data: buckets } = useSuspenseQuery(bucketsQueryOption);
	const { data: goals } = useSuspenseQuery(goalsQueryOption);

	return (
		<Field>
			<FieldLabel htmlFor={id}>Target</FieldLabel>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger
					id={id}
					aria-invalid={isError}
					aria-describedby={isError ? errorElementId : undefined}
					asChild
				>
					<Button
						variant="outline"
						role="combobox"
						aria-expanded={open}
						className="justify-between border-input"
					>
						{value
							? [...buckets, ...goals].find((option) => option.id === value)
									?.name
							: "Select target..."}
						<Icon icon="bx:chevron-down" className="opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="p-0">
					<Command>
						<CommandList>
							<CommandGroup heading="Buckets">
								{buckets.map((bucket) => (
									<CommandItem
										key={bucket.id}
										value={bucket.id}
										onSelect={(currentValue) => {
											field.setValue(currentValue);
											setOpen(false);
										}}
										className="font-bold"
									>
										{bucket.name}
										<Icon
											icon="bx:check"
											className={cn(
												"ml-auto",
												value === bucket.id ? "opacity-100" : "opacity-0",
											)}
										/>
									</CommandItem>
								))}
							</CommandGroup>
							<CommandGroup heading="Goals">
								{goals.map((goal) => (
									<CommandItem
										key={goal.id}
										value={goal.id}
										onSelect={(currentValue) => {
											field.setValue(currentValue);
											setOpen(false);
										}}
									>
										<div className="w-full flex flex-col gap-y-3 py-1">
											<div className="flex items-center justify-between gap-x-4">
												<span className="font-bold">{goal.name}</span>
												<span className="font-semibold text-xs">
													{formatPercentage(
														goal.current_amount / goal.target_amount,
													)}
												</span>
											</div>
											<Progress
												value={(goal.current_amount / goal.target_amount) * 100}
											/>
											<span className="text-xs text-end">
												<b className="font-semibold">
													{formatCurrency(goal.current_amount)}
												</b>
												{" of "}
												<b className="font-semibold">
													{formatCurrency(goal.target_amount)}
												</b>
											</span>
										</div>
										<Icon
											icon="bx:check"
											className={cn(
												"ml-auto",
												value === goal.id ? "opacity-100" : "opacity-0",
											)}
										/>
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
			<FieldError id={errorElementId} errors={errors} />
		</Field>
	);
}
