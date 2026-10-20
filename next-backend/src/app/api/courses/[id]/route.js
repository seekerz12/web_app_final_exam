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

export async function GET(request, { params }) {
  const user = verifyJWT(request);
  if (!user) return withCors({ message: "Unauthorized" }, 401);

  const { id } = await params;
  const courseObjectId = parseCourseId(id);
  if (!courseObjectId) return withCors({ message: "Invalid course ID" }, 400);

  try {
    const db = await getDb();
    const course = await db.collection("courses").findOne({ _id: courseObjectId });
    if (!course) return withCors({ message: "Course not found" }, 404);

    return withCors(course, 200);
  } catch (error) {
    return withCors({ message: error.message }, 500);
  }
}

export async function PUT(request, { params }) {
  const user = verifyJWT(request);
  if (!user) return withCors({ message: "Unauthorized" }, 401);
  if (user.role !== "Teacher") return withCors({ message: "Forbidden" }, 403);

  const { id } = await params;
  const courseObjectId = parseCourseId(id);
  if (!courseObjectId) return withCors({ message: "Invalid course ID" }, 400);

  try {
    const body = await request.json();
    const db = await getDb();

    const course = await db.collection("courses").findOne({ _id: courseObjectId });
    if (!course) return withCors({ message: "Course not found" }, 404);

    // Verify ownership
    const isOwner =
      String(course.teacherId) === String(user.userId || user.id) ||
      course.teacherName === user.username;
    if (!isOwner) return withCors({ message: "Forbidden: Not your course" }, 403);

    const updateDoc = {
      courseName: body.courseName ? String(body.courseName).trim() : course.courseName,
      duration: body.duration !== undefined ? Number(body.duration) : course.duration,
      price: body.price !== undefined ? Number(body.price) : course.price,
      maxStudent: body.maxStudent !== undefined ? Number(body.maxStudent) : course.maxStudent,
      topics: body.topics
        ? Array.isArray(body.topics)
          ? body.topics
          : String(body.topics).split(",").map((t) => t.trim()).filter(Boolean)
        : course.topics,
      status: body.status || course.status,
      updatedAt: new Date(),
    };

    await db.collection("courses").updateOne({ _id: courseObjectId }, { $set: updateDoc });
    return withCors({ message: "Course updated successfully" }, 200);
  } catch (error) {
    return withCors({ message: error.message }, 500);
  }
}

export async function DELETE(request, { params }) {
  const user = verifyJWT(request);
  if (!user) return withCors({ message: "Unauthorized" }, 401);
  if (user.role !== "Teacher") return withCors({ message: "Forbidden" }, 403);

  const { id } = await params;
  const courseObjectId = parseCourseId(id);
  if (!courseObjectId) return withCors({ message: "Invalid course ID" }, 400);

  try {
    const db = await getDb();
    const course = await db.collection("courses").findOne({ _id: courseObjectId });
    if (!course) return withCors({ message: "Course not found" }, 404);

    const isOwner =
      String(course.teacherId) === String(user.userId || user.id) ||
      course.teacherName === user.username;
    if (!isOwner) return withCors({ message: "Forbidden: Not your course" }, 403);

    // Business rule: Deletion blocked if any student is enrolled
    if (course.enrolledStudents && course.enrolledStudents.length > 0) {
      return withCors(
        { message: "Cannot delete course: Students are currently enrolled." },
        400
      );
    }

    await db.collection("courses").deleteOne({ _id: courseObjectId });
    return withCors({ message: "Course deleted successfully" }, 200);
  } catch (error) {
    return withCors({ message: error.message }, 500);
  }
}