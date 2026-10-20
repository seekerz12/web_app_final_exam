import React, { useState, useEffect } from "react";
import {
  HashRouter,
  Route,
  Routes,
  Navigate,
  useNavigate,
  useParams,
  Link,
} from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

// --- Safe JSON Response Parser Helper ---
async function parseResponseBody(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (err) {
    return { message: text || "Server returned non-JSON response" };
  }
}

// --- Global Navbar ---
function Navbar({ user, onLogout }) {
  return (
    <nav
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 20px",
        background: "#1e293b",
        color: "white",
        marginBottom: 20,
      }}
    >
      <div style={{ display: "flex", gap: 15, alignItems: "center" }}>
        <h3 style={{ margin: 0 }}>Online Course Service</h3>
        {user && (
          <>
            <Link to="/courses" style={{ color: "#93c5fd", textDecoration: "none" }}>
              {user.role === "Teacher" ? "My Courses" : "Available Courses"}
            </Link>
            {user.role === "Student" && (
              <Link to="/my-enrollments" style={{ color: "#93c5fd", textDecoration: "none" }}>
                My Enrollments
              </Link>
            )}
            {user.role === "Teacher" && (
              <Link to="/courses/new" style={{ color: "#93c5fd", textDecoration: "none" }}>
                Create Course
              </Link>
            )}
          </>
        )}
      </div>
      <div>
        {user ? (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span>
              {user.username} (<strong>{user.role}</strong>)
            </span>
            <button
              onClick={onLogout}
              style={{
                background: "#ef4444",
                color: "white",
                border: "none",
                padding: "6px 12px",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Logout
            </button>
          </div>
        ) : (
          <Link to="/login" style={{ color: "#93c5fd", textDecoration: "none" }}>
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}

// --- Protected Route Wrapper ---
function ProtectedRoute({ user, allowedRoles, children }) {
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/courses" replace />;
  }
  return children;
}

// --- Login Page ---
function LoginPage({ onLoginSuccess }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        username: identifier,
        password: password,
      };

      let res = await fetch(`${API_BASE}/api/user/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 404) {
        res = await fetch(`${API_BASE}/api/user`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await parseResponseBody(res);
      if (!res.ok) {
        throw new Error(data.message || `Login failed with status ${res.status}`);
      }

      onLoginSuccess(data.token, data.user);
      navigate("/courses");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "75vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          background: "#ffffff",
          padding: "32px",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          boxSizing: "border-box",
        }}
      >
        <h2 style={{ textAlign: "center", margin: "0 0 16px 0", color: "#1e293b" }}>Account Login</h2>
        {error && (
          <div
            style={{
              color: "#b91c1c",
              background: "#fee2e2",
              padding: "10px",
              borderRadius: "6px",
              fontSize: "0.875rem",
              marginBottom: "16px",
            }}
          >
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "16px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold", fontSize: "0.875rem" }}>
              Username or Email
            </label>
            <input
              type="text"
              placeholder="e.g. teacher1 or student1"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px", boxSizing: "border-box" }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "6px", fontWeight: "bold", fontSize: "0.875rem" }}>
              Password
            </label>
            <input
              type="password"
              placeholder="password123"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: "100%", padding: "10px", border: "1px solid #cbd5e1", borderRadius: "6px", boxSizing: "border-box" }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: "8px",
              padding: "12px",
              background: loading ? "#93c5fd" : "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- Courses List Page ---
function CoursesListPage({ user, token }) {
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const navigate = useNavigate();

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  async function loadCourses(searchTerm = search) {
    try {
      const url = new URL(`${API_BASE}/api/courses`);
      if (searchTerm) url.searchParams.set("search", searchTerm);
      const res = await fetch(url.toString(), { headers: authHeaders });
      const data = await parseResponseBody(res);
      if (!res.ok) throw new Error(data.message || "Failed to load courses");
      console.log("Raw courses received from backend:", data);
      setCourses(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    loadCourses();
  }, []);

  async function handleEnroll(courseId) {
    if (!courseId) {
      setError("Cannot enroll: Course ID is missing.");
      return;
    }
    setError("");
    setFeedback("");
    try {
      const res = await fetch(`${API_BASE}/api/courses/${courseId}/enroll`, {
        method: "POST",
        headers: authHeaders,
      });
      const data = await parseResponseBody(res);
      if (!res.ok) throw new Error(data.message || "Enrollment failed");
      setFeedback("Successfully enrolled in the course!");
      loadCourses();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(courseId) {
    if (!courseId) {
      setError("Cannot delete: Course ID is missing.");
      return;
    }
    if (!window.confirm("Are you sure you want to delete this course?")) return;
    setError("");
    setFeedback("");
    try {
      const res = await fetch(`${API_BASE}/api/courses/${courseId}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      const data = await parseResponseBody(res);
      if (!res.ok) throw new Error(data.message || "Delete failed");
      setFeedback("Course deleted successfully.");
      loadCourses();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>{user.role === "Teacher" ? "My Created Courses" : "Available Courses"}</h2>
        {user.role === "Teacher" && (
          <Link
            to="/courses/new"
            style={{
              background: "#16a34a",
              color: "white",
              padding: "8px 14px",
              borderRadius: 4,
              textDecoration: "none",
              fontWeight: "bold",
            }}
          >
            + Create New Course
          </Link>
        )}
      </div>

      {error && (
        <p style={{ background: "#fee2e2", color: "#b91c1c", padding: 10, borderRadius: 4 }}>
          {error}
        </p>
      )}
      {feedback && (
        <p style={{ background: "#dcfce7", color: "#15803d", padding: 10, borderRadius: 4 }}>
          {feedback}
        </p>
      )}

      {user.role === "Student" && (
        <div style={{ display: "flex", gap: 10, margin: "16px 0" }}>
          <input
            type="text"
            placeholder="Filter courses by course name or teacher name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              loadCourses(e.target.value);
            }}
            style={{ flex: 1, padding: "8px", boxSizing: "border-box" }}
          />
          <button onClick={() => loadCourses(search)} style={{ padding: "8px 16px", cursor: "pointer" }}>
            Search
          </button>
        </div>
      )}

      {courses.length === 0 ? (
        <p>No courses found.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            border="1"
            cellPadding="10"
            style={{
              width: "100%",
              borderCollapse: "collapse",
              borderColor: "#cbd5e1",
              marginTop: 12,
            }}
          >
            <thead style={{ background: "#f1f5f9" }}>
              <tr>
                <th>Course Name</th>
                <th>Teacher</th>
                <th>Duration (days)</th>
                <th>Price</th>
                <th>Status</th>
                <th>Seats (Enrolled / Max)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => {
                // Safeguard against missing _id or id property
                const courseId = course._id || course.id;
                const enrolledCount = course.enrolledStudents?.length || 0;
                const isAlreadyEnrolled = course.enrolledStudents?.some(
                  (s) => s.studentId === user.id
                );
                const seatsAvailable = enrolledCount < Number(course.maxStudent);
                const canEnroll =
                  course.status === "Open" && seatsAvailable && !isAlreadyEnrolled;

                return (
                  <tr key={courseId || Math.random()}>
                    <td>{course.courseName}</td>
                    <td>{course.teacherName}</td>
                    <td>{course.duration}</td>
                    <td>${course.price}</td>
                    <td>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: 4,
                          background:
                            course.status === "Open"
                              ? "#dcfce7"
                              : course.status === "Close"
                              ? "#fef9c3"
                              : "#fee2e2",
                          color:
                            course.status === "Open"
                              ? "#166534"
                              : course.status === "Close"
                              ? "#854d0e"
                              : "#991b1b",
                        }}
                      >
                        {course.status}
                      </span>
                    </td>
                    <td>
                      {enrolledCount} / {course.maxStudent}
                    </td>
                    <td style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <Link
                        to={`/courses/${courseId}`}
                        style={{
                          padding: "4px 8px",
                          background: "#0284c7",
                          color: "white",
                          textDecoration: "none",
                          borderRadius: 4,
                        }}
                      >
                        Details
                      </Link>

                      {user.role === "Teacher" && (
                        <>
                          <button
                            onClick={() => {
                              if (!courseId) {
                                alert("Course ID is missing for this item.");
                                return;
                              }
                              navigate(`/courses/${courseId}/edit`);
                            }}
                            style={{
                              padding: "4px 8px",
                              background: "#d97706",
                              color: "white",
                              border: "none",
                              borderRadius: 4,
                              cursor: "pointer",
                            }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              if (!courseId) {
                                alert("Course ID is missing for this item.");
                                return;
                              }
                              handleDelete(courseId);
                            }}
                            disabled={enrolledCount > 0}
                            style={{
                              padding: "4px 8px",
                              background: enrolledCount > 0 ? "#9ca3af" : "#dc2626",
                              color: "white",
                              border: "none",
                              borderRadius: 4,
                              cursor: enrolledCount > 0 ? "not-allowed" : "pointer",
                            }}
                            title={
                              enrolledCount > 0
                                ? "Cannot delete course: Students are enrolled"
                                : "Delete course"
                            }
                          >
                            Delete
                          </button>
                        </>
                      )}

                      {user.role === "Student" && (
                        <button
                          onClick={() => handleEnroll(courseId)}
                          disabled={!canEnroll}
                          style={{
                            padding: "4px 8px",
                            background: canEnroll ? "#16a34a" : "#9ca3af",
                            color: "white",
                            border: "none",
                            borderRadius: 4,
                            cursor: canEnroll ? "pointer" : "not-allowed",
                          }}
                        >
                          {isAlreadyEnrolled
                            ? "Enrolled"
                            : course.status !== "Open"
                            ? "Not Open"
                            : !seatsAvailable
                            ? "Full"
                            : "Enroll"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// --- Course Details Page ---
function CourseDetailsPage({ user, token }) {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchDetails() {
      if (!id || id === "new" || id === "undefined") return;
      try {
        const res = await fetch(`${API_BASE}/api/courses/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await parseResponseBody(res);
        if (!res.ok) throw new Error(data.message || "Failed to load details");
        setCourse(data);
      } catch (err) {
        setError(err.message);
      }
    }
    fetchDetails();
  }, [id, token]);

  if (error) {
    return (
      <div style={{ maxWidth: 800, margin: "20px auto", color: "red", padding: "0 20px" }}>
        {error}
      </div>
    );
  }
  if (!course) {
    return (
      <div style={{ maxWidth: 800, margin: "20px auto", padding: "0 20px" }}>
        Loading course...
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 800,
        margin: "20px auto",
        padding: 24,
        border: "1px solid #cbd5e1",
        borderRadius: 8,
      }}
    >
      <Link to="/courses" style={{ textDecoration: "none", color: "#2563eb" }}>
        ← Back to Courses
      </Link>
      <h2>{course.courseName}</h2>
      <p>
        <strong>Teacher:</strong> {course.teacherName} ({course.teacherEmail})
      </p>
      <p>
        <strong>Duration:</strong> {course.duration} days
      </p>
      <p>
        <strong>Price:</strong> ${course.price}
      </p>
      <p>
        <strong>Status:</strong> {course.status}
      </p>
      <p>
        <strong>Topics:</strong>{" "}
        {Array.isArray(course.topics)
          ? course.topics.join(", ")
          : course.topics}
      </p>
      <p>
        <strong>Enrollment Capacity:</strong>{" "}
        {course.enrolledStudents?.length || 0} / {course.maxStudent}
      </p>

      {user.role === "Teacher" && (
        <div style={{ marginTop: 24, borderTop: "1px solid #e2e8f0", paddingTop: 16 }}>
          <h3>Enrolled Students ({course.enrolledStudents?.length || 0})</h3>
          {!course.enrolledStudents || course.enrolledStudents.length === 0 ? (
            <p>No students have enrolled in this course yet.</p>
          ) : (
            <ul>
              {course.enrolledStudents.map((s, idx) => (
                <li key={idx}>
                  <strong>{s.username}</strong> ({s.email}) — Enrolled on{" "}
                  {new Date(s.enrolledAt).toLocaleDateString()}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// --- Create / Edit Course Form (Teacher Only) ---
function CourseFormPage({ user, token }) {
  const { id } = useParams();
  // Safe edit flag detection: Must be truthy, not "new", and not literal "undefined"
  const isEdit = Boolean(id && id !== "new" && id !== "undefined");
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    courseName: "",
    duration: 30,
    topics: "",
    price: 0,
    maxStudent: 20,
    status: "Open",
  });
  const [error, setError] = useState("");

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  useEffect(() => {
    if (isEdit) {
      async function fetchForEdit() {
        try {
          const res = await fetch(`${API_BASE}/api/courses/${id}`, {
            headers: authHeaders,
          });
          const data = await parseResponseBody(res);
          if (!res.ok) throw new Error(data.message || "Failed to load course");
          setFormData({
            courseName: data.courseName || "",
            duration: data.duration ?? 30,
            topics: Array.isArray(data.topics) ? data.topics.join(", ") : (data.topics || ""),
            price: data.price ?? 0,
            maxStudent: data.maxStudent ?? 20,
            status: data.status || "Open",
          });
        } catch (err) {
          setError(err.message);
        }
      }
      fetchForEdit();
    }
  }, [id, isEdit]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const payload = {
      courseName: String(formData.courseName).trim(),
      duration: Number(formData.duration) || 0,
      price: Number(formData.price) || 0,
      maxStudent: Number(formData.maxStudent) || 1,
      topics: String(formData.topics)
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      status: formData.status || "Open",
    };

    try {
      const url = isEdit
        ? `${API_BASE}/api/courses/${id}`
        : `${API_BASE}/api/courses`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      const data = await parseResponseBody(res);
      if (!res.ok) throw new Error(data.message || `Failed with status ${res.status}`);

      navigate("/courses");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div
      style={{
        maxWidth: 550,
        margin: "20px auto",
        padding: 24,
        border: "1px solid #cbd5e1",
        borderRadius: 8,
      }}
    >
      <h2>{isEdit ? "Update Course" : "Create New Course"}</h2>
      {error && (
        <p style={{ background: "#fee2e2", color: "#b91c1c", padding: 8, borderRadius: 4 }}>
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
        <div>
          <label style={{ display: "block", marginBottom: 4 }}>Course Name</label>
          <input
            type="text"
            value={formData.courseName}
            onChange={(e) =>
              setFormData({ ...formData, courseName: e.target.value })
            }
            required
            style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4 }}>
            Duration (days)
          </label>
          <input
            type="number"
            min="1"
            value={formData.duration}
            onChange={(e) =>
              setFormData({ ...formData, duration: e.target.value })
            }
            required
            style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4 }}>
            Topics (comma-separated)
          </label>
          <input
            type="text"
            placeholder="React, Next.js, Database"
            value={formData.topics}
            onChange={(e) =>
              setFormData({ ...formData, topics: e.target.value })
            }
            style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4 }}>Price ($)</label>
          <input
            type="number"
            min="0"
            value={formData.price}
            onChange={(e) =>
              setFormData({ ...formData, price: e.target.value })
            }
            required
            style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4 }}>
            Max Student
          </label>
          <input
            type="number"
            min="1"
            value={formData.maxStudent}
            onChange={(e) =>
              setFormData({ ...formData, maxStudent: e.target.value })
            }
            required
            style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 4 }}>Status</label>
          <select
            value={formData.status}
            onChange={(e) =>
              setFormData({ ...formData, status: e.target.value })
            }
            style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}
          >
            <option value="Open">Open</option>
            <option value="Close">Close</option>
            <option value="Cancel">Cancel</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <button
            type="submit"
            style={{
              padding: "10px 18px",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            {isEdit ? "Save Changes" : "Create"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/courses")}
            style={{ padding: "10px 18px", cursor: "pointer" }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// --- My Enrollments Page (Student Only) ---
function MyEnrollmentsPage({ user, token }) {
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchEnrolled() {
      try {
        const res = await fetch(`${API_BASE}/api/courses?enrolled=true`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await parseResponseBody(res);
        if (!res.ok) throw new Error(data.message || "Failed to load enrolled courses");
        setCourses(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message);
      }
    }
    fetchEnrolled();
  }, [token]);

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 20px" }}>
      <h2>My Enrolled Courses</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {courses.length === 0 ? (
        <p>You have not enrolled in any courses yet.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            border="1"
            cellPadding="10"
            style={{ width: "100%", borderCollapse: "collapse", borderColor: "#cbd5e1" }}
          >
            <thead style={{ background: "#f1f5f9" }}>
              <tr>
                <th>Course Name</th>
                <th>Teacher</th>
                <th>Duration (days)</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => {
                const cId = c._id || c.id;
                return (
                  <tr key={cId || Math.random()}>
                    <td>{c.courseName}</td>
                    <td>{c.teacherName}</td>
                    <td>{c.duration}</td>
                    <td>{c.status}</td>
                    <td>
                      <Link
                        to={`/courses/${cId}`}
                        style={{
                          padding: "4px 8px",
                          background: "#0284c7",
                          color: "white",
                          textDecoration: "none",
                          borderRadius: 4,
                        }}
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// --- Main App Component ---
export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  function handleLoginSuccess(newToken, newUser) {
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken("");
    setUser(null);
  }

  return (
    <HashRouter>
      <Navbar user={user} onLogout={handleLogout} />
      <Routes>
        <Route
          path="/login"
          element={
            user ? (
              <Navigate to="/courses" replace />
            ) : (
              <LoginPage onLoginSuccess={handleLoginSuccess} />
            )
          }
        />

        <Route
          path="/courses"
          element={
            <ProtectedRoute user={user}>
              <CoursesListPage user={user} token={token} />
            </ProtectedRoute>
          }
        />

        {/* 1. Explicit New Course Route (Must precede /courses/:id) */}
        <Route
          path="/courses/new"
          element={
            <ProtectedRoute user={user} allowedRoles={["Teacher"]}>
              <CourseFormPage user={user} token={token} />
            </ProtectedRoute>
          }
        />

        {/* 2. Explicit Edit Route */}
        <Route
          path="/courses/:id/edit"
          element={
            <ProtectedRoute user={user} allowedRoles={["Teacher"]}>
              <CourseFormPage user={user} token={token} />
            </ProtectedRoute>
          }
        />

        {/* 3. Course Details Route */}
        <Route
          path="/courses/:id"
          element={
            <ProtectedRoute user={user}>
              <CourseDetailsPage user={user} token={token} />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-enrollments"
          element={
            <ProtectedRoute user={user} allowedRoles={["Student"]}>
              <MyEnrollmentsPage user={user} token={token} />
            </ProtectedRoute>
          }
        />

        <Route
          path="*"
          element={<Navigate to={user ? "/courses" : "/login"} replace />}
        />
      </Routes>
    </HashRouter>
  );
}