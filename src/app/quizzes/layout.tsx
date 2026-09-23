import { RoleLayout } from "@/components/role-layout";

export default function QuizzesLayout({ children }: { children: React.ReactNode }) {
  return <RoleLayout roles={["teacher", "admin"]}>{children}</RoleLayout>;
}
