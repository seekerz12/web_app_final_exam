import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { verifyJWT, withCors } from "@/lib/auth";
import corsHeaders from "@/lib/cors";

// Helper to construct a query supporting both ObjectId and fallback string IDs
function buildCourseQuery(rawId) {
  if (!rawId) return null;
  const cleanId = String(rawId).trim();

  // If it's a valid 24-char hex string, query by ObjectId first, fallback to string
  if (/^[0-9a-fA-F]{24}$/.test(cleanId) && ObjectId.isValid(cleanId)) {
    return {
      $or: [{ _id: new ObjectId(cleanId) }, { _id: cleanId }],
    };
  }

  // If it's another format (e.g., seeded string ID), query directly as string
  return { _id: cleanId };
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders });
}

// --- GET Course Details ---
export async function GET(req, context) {
  const user = verifyJWT(req);
  if (!user) {
    return withCors({ message: "Unauthorized: Please log in" }, 401);
  }

  try {
    const params = await context?.params;
    const rawId = params?.id?.trim();

    if (!rawId || rawId === "new" || rawId === "undefined") {
      return withCors({ message: `Invalid Course ID: "${rawId}"` }, 400);
    }

    const query = buildCourseQuery(rawId);
    const db = await getDb();
    const course = await db.collection("courses").findOne(query);

    if (!course) {
      return withCors({ message: "Course not found" }, 404);
    }

    return withCors(
      {
        ...course,
        _id: course._id.toString(),
      },
      200
    );
  } catch (err) {
    return withCors({ message: err.message }, 500);
  }
}

// --- PUT Update Course ---
export async function PUT(req, context) {
  const user = verifyJWT(req);
  if (!user) {
    return withCors({ message: "Unauthorized: Please log in" }, 401);
  }
  if (user.role !== "Teacher") {
    return withCors({ message: "Forbidden: Only Teachers can update courses" }, 403);
  }

  try {
    const params = await context?.params;
    const rawId = params?.id?.trim();

    if (!rawId || rawId === "new" || rawId === "undefined") {
      return withCors({ message: `Invalid Course ID: "${rawId}"` }, 400);
    }

    const query = buildCourseQuery(rawId);
    const db = await getDb();
    const coursesCollection = db.collection("courses");

    const course = await coursesCollection.findOne(query);
    if (!course) {
      return withCors({ message: "Course not found" }, 404);
    }

    // Ownership check using string comparison to avoid ObjectId/string mismatch
    if (String(course.teacherId) !== String(user.id)) {
      return withCors({ message: "Forbidden: You can only edit your own courses" }, 403);
    }

    const body = await req.json();
    const { courseName, duration, topics, price, maxStudent, status } = body;
    const updateDoc = {};

    if (courseName !== undefined) updateDoc.courseName = String(courseName).trim();
    if (duration !== undefined) updateDoc.duration = Number(duration);
    if (price !== undefined) updateDoc.price = Number(price);
    if (maxStudent !== undefined) updateDoc.maxStudent = Number(maxStudent);

    if (topics !== undefined) {
      updateDoc.topics = Array.isArray(topics)
        ? topics.map((t) => String(t).trim()).filter(Boolean)
        : String(topics)
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
    }

    if (status !== undefined) {
      const allowed = ["Open", "Close", "Cancel"];
      updateDoc.status = allowed.includes(status) ? status : course.status;
    }

    updateDoc.updatedAt = new Date();

    await coursesCollection.updateOne(query, { $set: updateDoc });

    return withCors({ message: "Course updated successfully" }, 200);
  } catch (err) {
    return withCors({ message: err.message }, 500);
  }
}

// --- DELETE Course ---
export async function DELETE(req, context) {
  const user = verifyJWT(req);
  if (!user) {
    return withCors({ message: "Unauthorized: Please log in" }, 401);
  }
  if (user.role !== "Teacher") {
    return withCors({ message: "Forbidden: Only Teachers can delete courses" }, 403);
  }

  try {
    const params = await context?.params;
    const rawId = params?.id?.trim();

    if (!rawId || rawId === "new" || rawId === "undefined") {
      return withCors({ message: `Invalid Course ID: "${rawId}"` }, 400);
    }

    const query = buildCourseQuery(rawId);
    const db = await getDb();
    const coursesCollection = db.collection("courses");

    const course = await coursesCollection.findOne(query);
    if (!course) {
      return withCors({ message: "Course not found" }, 404);
    }

    // Ownership check using string comparison
    if (String(course.teacherId) !== String(user.id)) {
      return withCors({ message: "Forbidden: You can only delete your own courses" }, 403);
    }

    // Prevent deletion if students have enrolled
    if (course.enrolledStudents && course.enrolledStudents.length > 0) {
      return withCors(
        { message: "Cannot delete course: Students are currently enrolled." },
        400
      );
    }

    await coursesCollection.deleteOne(query);

    return withCors({ message: "Course deleted successfully" }, 200);
  } catch (err) {
    return withCors({ message: err.message }, 500);
  }
}