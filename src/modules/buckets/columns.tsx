import { Badge } from "@/components/ui/badge";
import type { BucketTransaction } from "@/integrations/supabase/types";
import { cn, formatCurrency, formatDate } from "@/lib/utils";
import { Icon } from "@iconify/react/dist/iconify.js";
import type { ColumnDef } from "@tanstack/react-table";

export const transactionColumns: ColumnDef<BucketTransaction>[] = [
	{
		accessorKey: "type",
		header: "Type",
		cell: ({ getValue }) => {
			const type = getValue<BucketTransaction["type"]>();

			return (
				<div className="flex items-center gap-x-2">
					<Icon
						icon={
							type === "inbound" ? "bx:up-arrow-circle" : "bx:down-arrow-circle"
						}
						className={cn(
							"size-5",
							type === "inbound" ? "text-primary" : "text-muted-foreground",
						)}
					/>
					<Badge
						variant={type === "inbound" ? "default" : "outline"}
						className="capitalize"
					>
						{type}
					</Badge>
				</div>
			);
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
		accessorKey: "description",
		header: "Description",
		cell: ({ getValue }) => {
			const description = getValue<BucketTransaction["description"]>();

			return <span className="text-muted-foreground">{description}</span>;
		},
	},
	{
		accessorKey: "balance_after",
		header: "Balance",
		cell: ({ getValue }) => {
			const balance = getValue<BucketTransaction["balance_after"]>();

			return <span className="font-medium">{formatCurrency(balance)}</span>;
		},
	},
	{
		accessorKey: "created_at",
		header: "Date",
		cell: ({ getValue }) => {
			const date = getValue<BucketTransaction["created_at"]>();

			return formatDate(date, { hour: undefined, minute: undefined });
		},
	},
];
