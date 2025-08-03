import { Badge } from "@/components/ui/badge";
import type { BucketTransaction } from "@/integrations/supabase/types";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";

export const transactionColumns: ColumnDef<BucketTransaction>[] = [
	{
		accessorKey: "created_at",
		header: "Date",
		cell: ({ getValue }) => {
			const date = getValue<BucketTransaction["created_at"]>();

			return formatDateTime(date);
		},
	},
	{
		accessorKey: "type",
		header: "Type",
		cell: ({ getValue }) => {
			const type = getValue<BucketTransaction["type"]>();

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
			const description = getValue<BucketTransaction["description"]>();

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
			const balance = getValue<BucketTransaction["balance_after"]>();

			return formatCurrency(balance);
		},
	},
];
