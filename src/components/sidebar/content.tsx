import { IconLayoutDashboard, IconWallet } from "@tabler/icons-react";
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
              <Link to="/accounts" activeProps={{ "data-active": true }}>
                <IconWallet />
                Accounts
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </UISidebarContent>
  );
}
