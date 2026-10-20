import { verifyJWT, withCors } from "@/lib/auth";
import corsHeaders from "@/lib/cors";

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function GET(req) {
  const user = verifyJWT(req);
  if (!user) {
    return withCors({ message: "Unauthorized" }, 401);
  }
  return withCors(user, 200);
}