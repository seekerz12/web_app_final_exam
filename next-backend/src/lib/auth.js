import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import corsHeaders from "./cors";

export function verifyJWT(request) {
  try {
    const authHeader = request.headers.get("authorization") || "";
    if (!authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.split(" ")[1];
    return jwt.verify(token, process.env.JWT_SECRET || "fallback_secret");
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