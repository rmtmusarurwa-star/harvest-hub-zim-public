import { Link } from "@tanstack/react-router";
import { PlusCircle, Search, Truck, MessageSquare } from "lucide-react";

const ACTIONS: { label: string; icon: typeof PlusCircle; to: string; primary?: boolean }[] = [
  { label: "Post a Listing", icon: PlusCircle, to: "/marketplace", primary: true },
  { label: "Find a Supplier", icon: Search, to: "/farmers" },
  { label: "Book Transport", icon: Truck, to: "/transport" },
  { label: "Chat with Buyer", icon: MessageSquare, to: "/chat" },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {ACTIONS.map((a) => (
        <Link
          key={a.label}
          to={a.to as "/marketplace"}
          className={`group glass flex items-center gap-3 rounded-2xl p-4 transition hover:border-secondary/30 ${
            a.primary ? "ring-1 ring-secondary/30" : ""
          }`}
        >
          <div
            className={`grid h-10 w-10 place-items-center rounded-xl ${
              a.primary
                ? "bg-secondary text-secondary-foreground"
                : "bg-white/5 text-secondary"
            }`}
          >
            <a.icon className="h-5 w-5" />
          </div>
          <div className="text-sm text-foreground">{a.label}</div>
        </Link>
      ))}
    </div>
  );
}
