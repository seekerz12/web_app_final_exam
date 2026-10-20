import bcrypt from "bcrypt"; // Use "bcryptjs" if your package.json uses bcryptjs
import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { signToken, verifyJWT } from "@/lib/auth";
import corsHeaders from "@/lib/cors";

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: corsHeaders });
}

// Auto-seed the 3 Teachers and 3 Students required by the exam specification
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

// GET /api/user - returns current authenticated user profile
export async function GET(req) {
  const authUser = verifyJWT(req);
  if (!authUser) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401, headers: corsHeaders });
  }
  return NextResponse.json(authUser, { status: 200, headers: corsHeaders });
}

// POST /api/user - login endpoint
export async function POST(req) {
  try {
    const db = await getDb();
    await ensureSeedUsers(db);

    const body = await req.json();
    const { username, email, password } = body;
    const identifier = username || email;

    if (!identifier || !password) {
      return NextResponse.json(
        { message: "Username/email and password are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const user = await db.collection("users").findOne({
      $or: [{ username: identifier }, { email: identifier }],
    });

    if (!user) {
      return NextResponse.json(
        { message: "Invalid credentials" },
        { status: 401, headers: corsHeaders }
      );
    }

    const isMatch =
      (await bcrypt.compare(password, user.password).catch(() => false)) ||
      password === user.password;

    if (!isMatch) {
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
      { message: error.message || "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}