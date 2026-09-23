import { getDb } from "@/db/client";
import { isDomainError } from "@/domain/errors";
import { auth } from "@/auth";
import { getQuizResults, resultsToCsv } from "@/server/results";

type RouteContext = { params: Promise<{ quizId: string }> };

const safeFileName = (title: string) => title.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 60) || "quiz";

export async function GET(_request: Request, { params }: RouteContext): Promise<Response> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.role) return new Response("Sign in first", { status: 401 });

  const quizId = Number((await params).quizId);
  if (!Number.isInteger(quizId) || quizId <= 0) return new Response("Not found", { status: 404 });

  try {
    const actor = { id: Number(user.id), role: user.role, classId: user.classId };
    const results = await getQuizResults(getDb(), actor, quizId, new Date());
    const fileName = `${safeFileName(results.quiz.title)}-results.csv`;
    return new Response(resultsToCsv(results), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="results.csv"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (isDomainError(error) && (error.code === "FORBIDDEN" || error.code === "NOT_FOUND")) {
      return new Response("Not found", { status: 404 });
    }
    throw error;
  }
}
