import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const menuItems = [
  { href: "/", label: "Dashboard", icon: "🏠" },
  { href: "/tournaments", label: "Torneios", icon: "🏆" },
  { href: "/athletes", label: "Atletas", icon: "👥" },
  { href: "/categories", label: "Categorias", icon: "📋" },
  { href: "/communities", label: "Comunidades", icon: "🏘️" },
  { href: "/associates", label: "Associados", icon: "🤝" },
  { href: "/financeiro", label: "Financeiro", icon: "💰" },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();

  return (
    <div className={`pb-12 ${className}`}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            PingPong Pro
          </h2>
          <div className="space-y-1">
            {menuItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={location === item.href ? "secondary" : "ghost"}
                  className="w-full justify-start"
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;