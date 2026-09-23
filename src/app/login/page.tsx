import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { cardClass } from "@/components/ui";
import { homePathFor } from "@/lib/route-access";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.role) redirect(homePathFor(session.user.role));

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-brand text-xl font-bold text-white">
            Q
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted">Use the username the centre gave you.</p>
        </div>
        <div className={`${cardClass} p-6`}>
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
