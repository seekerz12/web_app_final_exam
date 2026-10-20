import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { verifyJWT, withCors } from "@/lib/auth";
import corsHeaders from "@/lib/cors";

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders });
}

export async function POST(req, context) {
  const user = verifyJWT(req);
  if (!user) {
    return withCors({ message: "Unauthorized: Please log in" }, 401);
  }
  if (user.role !== "Student") {
    return withCors({ message: "Forbidden: Only students can enroll" }, 403);
  }

  try {
    const params = await context?.params;
    const id = params?.id;

    if (!id || !/^[0-9a-fA-F]{24}$/.test(id)) {
      return withCors({ message: "Invalid Course ID" }, 400);
    }

    const db = await getDb();
    const course = await db.collection("courses").findOne({ _id: new ObjectId(id) });

    if (!course) {
      return withCors({ message: "Course not found" }, 404);
    }

    if (course.status !== "Open") {
      return withCors({ message: "Enrollment is only allowed for Open courses" }, 400);
    }

    const enrolledList = course.enrolledStudents || [];
    if (enrolledList.length >= Number(course.maxStudent)) {
      return withCors({ message: "Course is full" }, 400);
    }

    const alreadyEnrolled = enrolledList.some((s) => s.studentId === user.id);
    if (alreadyEnrolled) {
      return withCors({ message: "You are already enrolled in this course" }, 400);
    }

    await db.collection("courses").updateOne(
      { _id: new ObjectId(id) },
      {
        $push: {
          enrolledStudents: {
            studentId: user.id,
            username: user.username,
            email: user.email,
            enrolledAt: new Date(),
          },
        },
      }
    );

    return withCors({ message: "Enrolled successfully", courseId: id }, 200);
  } catch (err) {
    return withCors({ message: err.message }, 500);
  }
}