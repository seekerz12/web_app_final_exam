import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { verifyJWT, withCors } from "@/lib/auth";
import corsHeaders from "@/lib/cors";

function parseCourseId(rawId) {
  if (!rawId) return null;
  const clean = String(rawId).trim();
  if (!ObjectId.isValid(clean)) return null;
  return new ObjectId(clean);
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders });
}

export async function POST(request, { params }) {
  const user = verifyJWT(request);
  if (!user) return withCors({ message: "Unauthorized: Please log in" }, 401);
  if (user.role !== "Student") return withCors({ message: "Forbidden: Only students can enroll" }, 403);

  const { id } = await params;
  const courseObjectId = parseCourseId(id);
  if (!courseObjectId) return withCors({ message: "Invalid course ID" }, 400);

  try {
    const db = await getDb();
    const course = await db.collection("courses").findOne({ _id: courseObjectId });
    if (!course) return withCors({ message: "Course not found" }, 404);

    if (course.status !== "Open") {
      return withCors({ message: `Cannot enroll: Course status is ${course.status}` }, 400);
    }

    const enrolledList = course.enrolledStudents || [];
    const currentUserId = String(user.userId || user.id);

    // Check duplicate enrollment
    const isEnrolled = enrolledList.some(
      (s) => String(s.studentId) === currentUserId || s.studentName === user.username
    );
    if (isEnrolled) {
      return withCors({ message: "You are already enrolled in this course" }, 400);
    }

    // Check capacity
    if (enrolledList.length >= Number(course.maxStudent)) {
      return withCors({ message: "Course has reached maximum student capacity" }, 400);
    }

    const enrollmentRecord = {
      studentId: currentUserId,
      studentName: user.username,
      studentEmail: user.email || "",
      enrolledAt: new Date(),
    };

    await db.collection("courses").updateOne(
      { _id: courseObjectId },
      { $push: { enrolledStudents: enrollmentRecord } }
    );

    return withCors({ message: "Enrolled successfully" }, 200);
  } catch (error) {
    return withCors({ message: error.message }, 500);
  }
}