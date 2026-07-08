import { IconBucket, IconLayoutDashboard } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

import {
  SidebarContent as UISidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "../ui/sidebar";

export function SidebarContent() {
  return (
    <UISidebarContent>
      <SidebarGroup>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/dashboard" activeProps={{ "data-active": true }}>
                <IconLayoutDashboard />
                Dashboard
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link to="/buckets" activeProps={{ "data-active": true }}>
                <IconBucket />
                Buckets
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </UISidebarContent>
  );
}
