import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { verifyJWT } from "@/lib/auth";
import corsHeaders from "@/lib/cors";

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

// GET /api/user/[id]
export async function GET(req, context) {
  const authUser = verifyJWT(req);
  if (!authUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }

  try {
    const { id } = await context.params;
    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid user ID" }, { status: 400, headers: corsHeaders });
    }

    const db = await getDb();
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(id) },
      { projection: { password: 0 } }
    );

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404, headers: corsHeaders });
    }

    return NextResponse.json(user, { status: 200, headers: corsHeaders });
  } catch (err) {
    return NextResponse.json({ message: err.message }, { status: 500, headers: corsHeaders });
  }
}