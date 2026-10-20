import { NextResponse } from "next/server";
import corsHeaders from "@/lib/cors";

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

export async function POST() {
  const response = NextResponse.json(
    { message: "Logged out successfully" },
    { status: 200, headers: corsHeaders }
  );
  response.cookies.set("token", "", { maxAge: 0, path: "/" });
  return response;
}