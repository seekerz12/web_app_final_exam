import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import corsHeaders from "./cors";

const JWT_SECRET = process.env.JWT_SECRET || "my_super_secret_jwt_key_2026";

export function signToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role, // "Student" | "Teacher"
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function verifyJWT(req) {
  try {
    let token = null;
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
    if (!token) {
      token = req.cookies?.get("token")?.value;
    }
    if (!token) return null;

    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

export function withCors(data, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: corsHeaders,
  });
}