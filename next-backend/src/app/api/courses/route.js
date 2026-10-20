import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { verifyJWT, withCors } from "@/lib/auth";
import corsHeaders from "@/lib/cors";

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders });
}

export async function GET(request) {
  const user = verifyJWT(request);
  if (!user) {
    return withCors({ message: "Unauthorized: Please log in" }, 401);
  }

  try {
    const db = await getDb();
    const { searchParams } = new URL(request.url);
    const enrolledOnly = searchParams.get("enrolled") === "true";

    let filter = {};

    if (user.role === "Teacher") {
      // Teachers only see their own courses
      filter = {
        $or: [
          { teacherId: String(user.userId || user.id) },
          { teacherName: user.username },
        ],
      };
    } else {
      // Student view
      if (enrolledOnly) {
        filter = {
          enrolledStudents: {
            $elemMatch: {
              $or: [
                { studentId: String(user.userId || user.id) },
                { studentName: user.username },
              ],
            },
          },
        };
      } else {
        // Active catalog excludes Cancelled courses
        filter = { status: { $ne: "Cancel" } };
      }
    }

    const courses = await db.collection("courses").find(filter).toArray();
    return withCors(courses, 200);
  } catch (error) {
    console.error("GET /api/courses error:", error);
    return withCors({ message: error.message || "Failed to load courses" }, 500);
  }
}

export async function POST(request) {
  const user = verifyJWT(request);
  if (!user) {
    return withCors({ message: "Unauthorized: Please log in" }, 401);
  }

  if (user.role !== "Teacher") {
    return withCors({ message: "Forbidden: Only teachers can create courses" }, 403);
  }

  try {
    const body = await request.json();
    const { courseName, duration, topics, price, maxStudent, status } = body;

    if (!courseName || !duration || !price || !maxStudent) {
      return withCors({ message: "Missing required fields" }, 400);
    }

    const db = await getDb();
    const newCourse = {
      courseName: String(courseName).trim(),
      duration: Number(duration),
      price: Number(price),
      maxStudent: Number(maxStudent),
      topics: Array.isArray(topics)
        ? topics
        : String(topics || "")
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
      status: status || "Open",
      teacherId: String(user.userId || user.id),
      teacherName: user.username,
      teacherEmail: user.email || "",
      enrolledStudents: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("courses").insertOne(newCourse);
    return withCors(
      { message: "Course created successfully", courseId: result.insertedId },
      201
    );
  } catch (error) {
    console.error("POST /api/courses error:", error);
    return withCors({ message: error.message || "Internal server error" }, 500);
  }
}