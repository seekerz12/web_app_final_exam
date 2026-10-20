import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { verifyJWT, withCors } from '@/lib/auth';
import corsHeaders from '@/lib/cors';

// Must export OPTIONS for browser CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders });
}

// Must export exact uppercase POST
export async function POST(req) {
  const user = verifyJWT(req);
  if (!user) {
    return withCors({ message: 'Unauthorized: Please log in' }, 401);
  }

  if (user.role !== 'Teacher') {
    return withCors({ message: 'Forbidden: Only Teachers can create courses' }, 403);
  }

  try {
    const body = await req.json();
    const { courseName, duration, topics, price, maxStudent, status } = body;

    if (!courseName || !duration || !price || !maxStudent) {
      return withCors({ message: 'Missing required fields' }, 400);
    }

    const db = await getDb();
    const newCourse = {
      courseName: String(courseName).trim(),
      duration: Number(duration),
      price: Number(price),
      maxStudent: Number(maxStudent),
      topics: Array.isArray(topics)
        ? topics
        : String(topics || '').split(',').map((t) => t.trim()).filter(Boolean),
      status: status || 'Open',
      teacherId: String(user.id || user.userId),
      teacherName: user.username,
      teacherEmail: user.email,
      enrolledStudents: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('courses').insertOne(newCourse);
    return withCors({ message: 'Course created successfully', courseId: result.insertedId }, 201);
  } catch (err) {
    return withCors({ message: err.message }, 500);
  }
}