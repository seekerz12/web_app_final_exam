//src/app/api/auth/login/route.js

/**
 * Your login APIs go here
 */import bcrypt from "bcrypt"; // or "bcryptjs" depending on package.json
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { signToken } from "@/lib/auth";
import corsHeaders from "@/lib/cors";

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

async function ensureSeedUsers(db) {
  const usersCol = db.collection("users");
  const count = await usersCol.countDocuments();
  if (count >= 6) return;

  const hashedPassword = await bcrypt.hash("password123", 10);
  const defaultUsers = [
    { username: "teacher1", email: "teacher1@test.com", password: hashedPassword, role: "Teacher" },
    { username: "teacher2", email: "teacher2@test.com", password: hashedPassword, role: "Teacher" },
    { username: "teacher3", email: "teacher3@test.com", password: hashedPassword, role: "Teacher" },
    { username: "student1", email: "student1@test.com", password: hashedPassword, role: "Student" },
    { username: "student2", email: "student2@test.com", password: hashedPassword, role: "Student" },
    { username: "student3", email: "student3@test.com", password: hashedPassword, role: "Student" },
  ];

  for (const u of defaultUsers) {
    await usersCol.updateOne({ email: u.email }, { $setOnInsert: u }, { upsert: true });
  }
}

export async function POST(req) {
  try {
    const db = await getDb();
    await ensureSeedUsers(db);

    const body = await req.json();
    const { email, username, password } = body;
    const identifier = email || username;

    if (!identifier || !password) {
      return NextResponse.json(
        { message: "Email/Username and password are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const user = await db.collection("users").findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });

    if (!user) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401, headers: corsHeaders }
      );
    }

    const passwordValid =
      (await bcrypt.compare(password, user.password).catch(() => false)) ||
      password === user.password;

    if (!passwordValid) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401, headers: corsHeaders }
      );
    }

    const token = signToken(user);
    const userPayload = {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
    };

    const response = NextResponse.json(
      { message: "Login successful", token, user: userPayload },
      { status: 200, headers: corsHeaders }
    );

    response.cookies.set("token", token, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { message: error.message || "Internal Server Error" },
      { status: 500, headers: corsHeaders }
    );
  }
}