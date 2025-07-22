import {
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
	Breadcrumb as UIBreadcrumb,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Link, useLocation } from "@tanstack/react-router";
import { Fragment, type PropsWithChildren } from "react";

type Props = PropsWithChildren<{
	heading: string;
}>;

export function Template({ children, heading }: Props) {
	return (
		<>
			<Header />
			<div className="p-6">
				<h1 className="font-bold text-3xl">{heading}</h1>
				{children}
			</div>
		</>
	);
}

function Header() {
	return (
		<header className="px-6 py-4 border-b flex items-center gap-x-4">
			<SidebarTrigger />
			<Separator orientation="vertical" />
			<Breadcrumbs />
		</header>
	);
}

function Breadcrumbs() {
	const location = useLocation();

	const pathSegments = location.pathname.split("/").filter(Boolean);

	const breadcrumbs = pathSegments.map((segment, index) => {
		const path = `/${pathSegments.slice(0, index + 1).join("/")}`;

		return {
			label: segment,
			path,
		};
	});

	if (breadcrumbs.length === 0) return null;

	return (
		<UIBreadcrumb>
			<BreadcrumbList>
				{breadcrumbs.map((breadcrumb, index) => (
					<Fragment key={breadcrumb.path}>
						<BreadcrumbItem>
							{index === breadcrumbs.length - 1 ? (
								<BreadcrumbPage>{breadcrumb.label}</BreadcrumbPage>
							) : (
								<BreadcrumbLink asChild>
									<Link to={breadcrumb.path}>{breadcrumb.label}</Link>
								</BreadcrumbLink>
							)}
						</BreadcrumbItem>
						{index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
					</Fragment>
				))}
			</BreadcrumbList>
		</UIBreadcrumb>
	);
}
