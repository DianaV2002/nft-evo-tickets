import { useState } from "react"
import { useLocation, NavLink } from "react-router-dom"
import {
  Home,
  Calendar,
  Ticket,
  User,
  Plus,
  Wallet,
  TrendingUp,
  LogOut,
  Users,
  Gift
} from "lucide-react"
import { useWallet } from "@solana/wallet-adapter-react"
import logo from "@/assets/logo.png";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

const mainItems = [
  { title: "Dashboard", url: "/", icon: Home },
  { title: "Community", url: "/community", icon: Users },
  { title: "Events", url: "/events", icon: Calendar },
  { title: "Marketplace", url: "/marketplace", icon: TrendingUp },
  { title: "My Tickets", url: "/tickets", icon: Ticket },
  { title: "Profile", url: "/profile/1", icon: User },
  { title: "Rewards", url: "/rewards", icon: Gift },
]

const organizerItems = [
  { title: "Create Event", url: "/create-event", icon: Plus },
  { title: "My Events", url: "/my-events", icon: Calendar },
]

export function EvoSidebar() {
  const { state } = useSidebar()
  const location = useLocation()
  const currentPath = location.pathname
  const collapsed = state === "collapsed"
  const { disconnect, connected } = useWallet() // <-- Add connected

  const isActive = (path: string) => currentPath === path
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "bg-primary/20 text-primary border-primary/50 neon-glow"
      : "hover:bg-muted/50 hover:text-primary transition-all duration-300"

  return (
    <Sidebar
      className={`${collapsed ? "w-16" : "w-64"} glass-card border-r border-border/50`}
      collapsible="icon"
    >
      <SidebarContent className="p-4">
        {/* Logo */}
        <div className="mb-8 px-2">
          {!collapsed ? (
            <img
              src={logo}
              alt="logo"
              className="w-36 h-auto"
            />) : (
            <div className="w-8 h-8 bg-gradient-primary rounded-lg neon-glow"></div>
          )}
        </div>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
            {!collapsed && "Main"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className={({ isActive }) => `
                        flex items-center rounded-lg px-3 py-2 border border-transparent
                        ${getNavCls({ isActive })}
                      `}
                    >
                      <item.icon className="h-5 w-5" />
                      {!collapsed && <span className="ml-3">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Organizer Tools */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wide text-muted-foreground mb-3 mt-6">
            {!collapsed && "Organizer"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {organizerItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className={({ isActive }) => `
                        flex items-center rounded-lg px-3 py-2 border border-transparent
                        ${getNavCls({ isActive })}
                      `}
                    >
                      <item.icon className="h-5 w-5" />
                      {!collapsed && <span className="ml-3">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* User Actions */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">


              {/* Logout - only show if connected */}
              {connected && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className="flex items-center rounded-lg px-3 py-2 w-full text-left hover:bg-destructive/20 hover:text-destructive transition-all duration-300"
                    onClick={disconnect}
                  >
                    <LogOut className="h-5 w-5" />
                    {!collapsed && <span className="ml-3">Logout</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}