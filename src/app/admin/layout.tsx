import { RoleLayout } from "@/components/role-layout";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RoleLayout roles={["admin"]}>{children}</RoleLayout>;
}
