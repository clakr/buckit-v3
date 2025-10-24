import { Container } from "@/components/container";
import { Heading } from "@/components/heading";
import { GoalsProgressBarChart } from "@/modules/dashboard/components/goals-progress-bar-chart";
import { PortfolioDistributionPieChart } from "@/modules/dashboard/components/portfolio-distribution-pie-chart";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/dashboard")({
	component: RouteComponent,
});

function RouteComponent() {
	return (
		<Container>
			<Heading heading="Dashboard" />

			<div className="grid xl:grid-cols-2 gap-4">
				<PortfolioDistributionPieChart />
			</div>
			<GoalsProgressBarChart />
		</Container>
	);
}
