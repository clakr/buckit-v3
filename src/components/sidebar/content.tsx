import { Link } from "@tanstack/react-router";

import {
  SidebarContent as UISidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "#/components/ui/sidebar";
import { MODULE_ICONS } from "#/lib/constants";

export function SidebarContent() {
  return (
    <UISidebarContent>
      <SidebarGroup>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={
                <Link to="/dashboard" activeProps={{ "data-active": true }}>
                  <MODULE_ICONS.dashboard />
                  Dashboard
                </Link>
              }
            />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={
                <Link to="/accounts" activeProps={{ "data-active": true }}>
                  <MODULE_ICONS.accounts />
                  Accounts
                </Link>
              }
            />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={
                <Link to="/buckets" activeProps={{ "data-active": true }}>
                  <MODULE_ICONS.buckets />
                  Buckets
                </Link>
              }
            />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={
                <Link to="/debts" activeProps={{ "data-active": true }}>
                  <MODULE_ICONS.debts />
                  Debts
                </Link>
              }
            />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={
                <Link to="/transactions" activeProps={{ "data-active": true }}>
                  <MODULE_ICONS.transactions />
                  Transactions
                </Link>
              }
            />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={
                <Link to="/allocations" activeProps={{ "data-active": true }}>
                  <MODULE_ICONS.allocations />
                  Allocations
                </Link>
              }
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
    </UISidebarContent>
  );
}
