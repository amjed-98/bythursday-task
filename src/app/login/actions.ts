"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export type LoginState = { error: string | null };

export async function loginAction(_previous: LoginState, formData: FormData): Promise<LoginState> {
  try {
    await signIn("credentials", {
      username: formData.get("username"),
      password: formData.get("password"),
      redirectTo: "/",
    });
    return { error: null };
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Wrong username or password. After 10 failed tries, wait 15 minutes." };
    }
    throw error;
  }
}
