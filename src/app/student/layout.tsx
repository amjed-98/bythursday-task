import { RoleLayout } from "@/components/role-layout";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <RoleLayout roles={["student"]}>{children}</RoleLayout>;
}
