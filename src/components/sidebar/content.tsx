import { IconBucket, IconLayoutDashboard, IconWallet } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

import {
  SidebarContent as UISidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "#/components/ui/sidebar";

export function SidebarContent() {
  return (
    <UISidebarContent>
      <SidebarGroup>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={
                <Link to="/dashboard" activeProps={{ "data-active": true }}>
                  <IconLayoutDashboard />
                  Dashboard
                </Link>
              }
            />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={
                <Link to="/accounts" activeProps={{ "data-active": true }}>
                  <IconWallet />
                  Accounts
                </Link>
              }
            />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={
                <Link to="/buckets" activeProps={{ "data-active": true }}>
                  <IconBucket />
                  Buckets
                </Link>
              }
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </UISidebarContent>
  );
}
