import { Badge } from "@/components/ui/badge";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { GoalTransaction } from "@/integrations/supabase/types";
import { cn, formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";

export const columns: ColumnDef<GoalTransaction>[] = [
	{
		accessorKey: "created_at",
		header: "Date",
		cell: ({ getValue }) => {
			const date = getValue<GoalTransaction["created_at"]>();

			return (
				<Tooltip>
					<TooltipTrigger>{formatDate(date)}</TooltipTrigger>
					<TooltipContent>{formatDateTime(date)}</TooltipContent>
				</Tooltip>
			);
		},
	},
	{
		accessorKey: "type",
		header: "Type",
		cell: ({ getValue }) => {
			const type = getValue<GoalTransaction["type"]>();

			return (
				<Badge
					variant={type === "inbound" ? "default" : "secondary"}
					className="capitalize"
				>
					{type === "inbound" ? "Deposit" : "Withdrawal"}
				</Badge>
			);
		},
	},
	{
		accessorKey: "description",
		header: "Description",
		cell: ({ getValue }) => {
			const description = getValue<GoalTransaction["description"]>();

			return description;
		},
	},
	{
		accessorKey: "amount",
		header: "Amount",
		cell: ({ row }) => {
			const { type, amount } = row.original;

			return (
				<span
					className={cn(
						"font-medium",
						type === "inbound" ? "text-primary" : "text-muted-foreground",
					)}
				>
					{type === "inbound" ? "+" : "-"} {formatCurrency(amount)}
				</span>
			);
		},
	},
	{
		accessorKey: "balance_after",
		header: "Balance",
		cell: ({ getValue }) => {
			const balance = getValue<GoalTransaction["balance_after"]>();

			return <span className="font-medium">{formatCurrency(balance)}</span>;
		},
	},
];
