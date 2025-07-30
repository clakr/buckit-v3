import { Container } from "@/components/container";
import { Heading } from "@/components/heading";
import { StateTemplate } from "@/components/states-template";
import { Button } from "@/components/ui/button";
import {
	CreateGoalDialog,
	useCreateGoalDialogStore,
} from "@/modules/goals/component/create-goal-dialog";
import { GoalCard } from "@/modules/goals/component/goal-card";
import { goalsQueryOption } from "@/modules/goals/query-options";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
	type ErrorComponentProps,
	createFileRoute,
} from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/goals/")({
	loader: async ({ context: { queryClient } }) => {
		await queryClient.ensureQueryData(goalsQueryOption);
	},
	pendingComponent: PendingComponent,
	errorComponent: ErrorComponent,
	component: RouteComponent,
});

function PendingComponent() {
	return (
		<Container>
			<Heading heading="Goals" />
			<StateTemplate
				state="loading"
				heading="Loading goals..."
				description="Please wait while we load your goals"
			/>
		</Container>
	);
}

function ErrorComponent({ reset }: ErrorComponentProps) {
	return (
		<Container>
			<Heading heading="Goals" />
			<StateTemplate
				state="error"
				heading="Failed to load goals"
				description="We encountered an error while loading your goals."
			>
				<div>
					<Button onClick={reset}>Try Again</Button>
				</div>
			</StateTemplate>
		</Container>
	);
}

function RouteComponent() {
	/**
	 * data fetching
	 */
	const { data: goals } = useSuspenseQuery(goalsQueryOption);

	/**
	 * actions
	 */
	const handleOpenCreateGoalDialog = useCreateGoalDialogStore(
		(state) => state.handleOpen,
	);

	/**
	 * empty
	 */
	if (goals.length === 0) {
		return (
			<Container>
				<Heading heading="Goals">
					<Button onClick={handleOpenCreateGoalDialog}>
						<Icon icon="bx:plus" />
						Create Goal
					</Button>
				</Heading>
				<StateTemplate
					state="empty"
					heading="No goals yet"
					description="Get started by creating your first goal"
				>
					<div>
						<Button variant="secondary" onClick={handleOpenCreateGoalDialog}>
							<Icon icon="bx:plus" />
							Create Goal
						</Button>
					</div>
				</StateTemplate>

				<CreateGoalDialog />
			</Container>
		);
	}

	return (
		<Container>
			<Heading heading="Goals">
				<Button onClick={handleOpenCreateGoalDialog}>
					<Icon icon="bx:plus" />
					Create Goal
				</Button>
			</Heading>
			<section className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
				{goals.map((goal) => (
					<GoalCard key={goal.id} goal={goal} />
				))}
			</section>

			<CreateGoalDialog />
		</Container>
	);
}
