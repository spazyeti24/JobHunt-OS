import { Link, useLocation } from "wouter";
import { LayoutDashboard, FileText, Settings, Activity, Briefcase } from "lucide-react";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider } from "@/components/ui/sidebar";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/resume", label: "Master Resume", icon: FileText },
    { href: "/runs", label: "Run History", icon: Activity },
    { href: "/applied", label: "Applied", icon: Briefcase },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <Sidebar className="border-r border-sidebar-border w-64 flex-shrink-0 bg-sidebar text-sidebar-foreground">
          <SidebarHeader className="h-16 flex items-center px-6 border-b border-sidebar-border">
            <div className="flex items-center gap-2">
              <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
                <Activity size={20} />
              </div>
              <h1 className="font-bold text-lg tracking-tight">JobHunt OS</h1>
            </div>
          </SidebarHeader>
          <SidebarContent className="p-4">
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link href={item.href} className="flex items-center gap-3">
                        <item.icon size={18} />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        <main className="flex-1 overflow-auto bg-background">
          <div className="h-full flex flex-col">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
