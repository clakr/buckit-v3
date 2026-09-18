import { IconBucket, IconWallet } from "@tabler/icons-react";
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
                  <svg />
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
          <SidebarMenuItem>
            <SidebarMenuButton
              render={
                <Link to="/transactions" activeProps={{ "data-active": true }}>
                  <svg />
                  Transactions
                </Link>
              }
            />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              render={
                <Link to="/allocations" activeProps={{ "data-active": true }}>
                  <svg />
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
