import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { verifyJWT, withCors } from "@/lib/auth";
import corsHeaders from "@/lib/cors";

// 1. Preflight handler
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders });
}

// 2. GET all courses based on role & search filters
export async function GET(req) {
  const user = verifyJWT(req);
  if (!user) {
    return withCors({ message: "Unauthorized: Please log in" }, 401);
  }

  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get("search") || "").trim();
    const enrolledOnly = searchParams.get("enrolled") === "true";

    const query = {};

    if (user.role === "Teacher") {
      // Teachers only view their own courses
      query.teacherId = user.id;
    } else if (user.role === "Student") {
      if (enrolledOnly) {
        query["enrolledStudents.studentId"] = user.id;
      } else {
        query.status = { $ne: "Cancel" };
      }

      if (search) {
        query.$or = [
          { courseName: { $regex: search, $options: "i" } },
          { teacherName: { $regex: search, $options: "i" } },
        ];
      }
    } else {
      return withCors({ message: "Forbidden: Unknown role" }, 403);
    }

    const courses = await db
      .collection("courses")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    const formattedCourses = courses.map((c) => ({
      ...c,
      _id: c._id ? c._id.toString() : "",
  id: c._id ? c._id.toString() : "",
    }));

    return withCors(formattedCourses, 200);
  } catch (err) {
    return withCors({ message: err.message }, 500);
  }
}

// 3. POST create new course (Teacher only)
export async function POST(req) {
  const user = verifyJWT(req);
  if (!user) {
    return withCors({ message: "Unauthorized: Please log in" }, 401);
  }

  if (user.role !== "Teacher") {
    return withCors(
      { message: "Forbidden: Only Teachers can create courses" },
      403
    );
  }

  try {
    const body = await req.json();
    const { courseName, duration, topics, price, maxStudent, status } = body;

    if (
      !courseName ||
      duration === undefined ||
      price === undefined ||
      maxStudent === undefined
    ) {
      return withCors({ message: "Missing required course fields" }, 400);
    }

    const parsedTopics = Array.isArray(topics)
      ? topics.map((t) => String(t).trim()).filter(Boolean)
      : String(topics || "")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);

    const allowedStatuses = ["Open", "Close", "Cancel"];
    const validStatus = allowedStatuses.includes(status) ? status : "Open";

    const newCourse = {
      courseName: String(courseName).trim(),
      duration: Number(duration),
      topics: parsedTopics,
      price: Number(price),
      maxStudent: Number(maxStudent),
      status: validStatus,
      teacherId: user.id,
      teacherName: user.username,
      teacherEmail: user.email,
      enrolledStudents: [],
      createdAt: new Date(),
    };

    const db = await getDb();
    const result = await db.collection("courses").insertOne(newCourse);

    return withCors(
      {
        ...newCourse,
        _id: result.insertedId.toString(),
      },
      201
    );
  } catch (err) {
    return withCors({ message: err.message }, 500);
  }
}