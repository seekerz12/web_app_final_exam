import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "@/lib/mongodb";
import corsHeaders from "@/lib/cors";

const JWT_SECRET = process.env.JWT_SECRET || "wad_final_exam_secret_2026";

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { username, email, password } = body;
    const identifier = username || email;

    if (!identifier || !password) {
      return NextResponse.json(
        { message: "Username/Email and Password are required." },
        { status: 400, headers: corsHeaders }
      );
    }

    const db = await getDb();
    
    // Direct lookup without inline auto-seed
    const user = await db.collection("users").findOne({
      $or: [{ username: identifier }, { email: identifier }],
    });

    if (!user) {
      return NextResponse.json(
        { message: "User not found. Check credentials or run /api/seed." },
        { status: 401, headers: corsHeaders }
      );
    }

    const isMatch =
      (await bcrypt.compare(password, user.password).catch(() => false)) ||
      password === user.password;

    if (!isMatch) {
      return NextResponse.json(
        { message: "Incorrect password." },
        { status: 401, headers: corsHeaders }
      );
    }

    const token = jwt.sign(
      {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return NextResponse.json(
      {
        message: "Login successful",
        token,
        user: {
          id: user._id.toString(),
          username: user.username,
          email: user.email,
          role: user.role,
        },
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    return NextResponse.json(
      { message: err.message || "Database connection error" },
      { status: 500, headers: corsHeaders }
    );
  }
}