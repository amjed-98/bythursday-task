import { redirect } from "next/navigation";
import { homePathFor } from "@/lib/route-access";
import { requireActor } from "@/lib/session";

export default async function HomePage() {
  const actor = await requireActor();
  redirect(homePathFor(actor.role));
}
