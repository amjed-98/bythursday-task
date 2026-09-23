import { RoleLayout } from "@/components/role-layout";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return <RoleLayout roles={["teacher"]}>{children}</RoleLayout>;
}
