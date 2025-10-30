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
  Gift,
  QrCode
} from "lucide-react"
import { useWallet } from "@solana/wallet-adapter-react"
import { useAuth } from "@/contexts/AuthContext"
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
  { title: "Scanner", url: "/scanner", icon: QrCode },
]

export function EvoSidebar() {
  const { state } = useSidebar()
  const location = useLocation()
  const currentPath = location.pathname
  const collapsed = state === "collapsed"
  const { disconnect, connected } = useWallet()
  const { user, isConnected, logout } = useAuth() // <-- Add connected

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
              {/* User Info - show if logged in */}
              {(connected || isConnected) && user && (
                <SidebarMenuItem>
                  <div className="flex items-center rounded-lg px-3 py-2 w-full text-left bg-muted/20 border border-border/50">
                    <User className="h-5 w-5" />
                    {!collapsed && (
                      <div className="ml-3 flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {user.name || user.email || 'User'}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {user.authMethod === 'wallet' ? 'Wallet User' : `${user.authMethod} User`}
                        </div>
                      </div>
                    )}
                  </div>
                </SidebarMenuItem>
              )}

              {/* Logout - show if wallet connected or email user logged in */}
              {(connected || isConnected) && (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className="flex items-center rounded-lg px-3 py-2 w-full text-left hover:bg-destructive/20 hover:text-destructive transition-all duration-300"
                    onClick={() => {
                      if (connected) {
                        disconnect();
                      } else if (isConnected) {
                        logout();
                      }
                    }}
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