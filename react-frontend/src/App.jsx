import React, { useState, useEffect } from "react";
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  Link,
  useNavigate,
  useParams,
} from "react-router-dom";

// Clean base URL without trailing slash
const API_BASE = (
  import.meta.env.VITE_API_URL || "https://web-app-final-exam.vercel.app"
).replace(/\/$/, "");

// Inline styles
const s = {
  nav: { display: "flex", justifyContent: "space-between", padding: "12px 24px", background: "#1e293b", color: "#fff", alignItems: "center" },
  navLinks: { display: "flex", gap: "16px", alignItems: "center" },
  link: { color: "#93c5fd", textDecoration: "none", fontWeight: "bold" },
  container: { maxWidth: "1000px", margin: "24px auto", padding: "0 16px", fontFamily: "sans-serif" },
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" },
  input: { width: "100%", padding: "10px", margin: "8px 0 16px", boxSizing: "border-box", borderRadius: "4px", border: "1px solid #cbd5e1" },
  btnPrimary: { background: "#2563eb", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "4px", cursor: "pointer", fontWeight: "bold" },
  btnDanger: { background: "#dc2626", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer" },
  btnDisabled: { background: "#94a3b8", color: "#e2e8f0", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "not-allowed" },
  btnSecondary: { background: "#64748b", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer", textDecoration: "none" },
  table: { width: "100%", borderCollapse: "collapse", marginTop: "16px" },
  th: { background: "#f8fafc", textAlign: "left", padding: "12px", borderBottom: "2px solid #e2e8f0" },
  td: { padding: "12px", borderBottom: "1px solid #e2e8f0" },
  badge: (status) => ({
    padding: "4px 8px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: "bold",
    color: "#fff",
    background: status === "Open" ? "#16a34a" : status === "Close" ? "#eab308" : "#dc2626",
  }),
};

function Navigation({ user, onLogout }) {
  return (
    <nav style={s.nav}>
      <div style={{ fontWeight: "bold", fontSize: "18px" }}>Course Management</div>
      <div style={s.navLinks}>
        {user ? (
          <>
            <span>Welcome, <strong>{user.username}</strong> ({user.role})</span>
            <Link to="/courses" style={s.link}>Courses</Link>
            {user.role === "Student" && (
              <Link to="/my-enrollments" style={s.link}>My Enrollments</Link>
            )}
            <button onClick={onLogout} style={{ ...s.btnSecondary, background: "#475569" }}>
              Logout
            </button>
          </>
        ) : (
          <Link to="/login" style={s.link}>Login</Link>
        )}
      </div>
    </nav>
  );
}

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/user/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Login failed");

      onLogin(data.token, data.user);
      navigate("/courses");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ ...s.container, maxWidth: "420px", marginTop: "60px" }}>
      <div style={s.card}>
        <h2 style={{ marginTop: 0 }}>System Login</h2>
        {error && <div style={{ color: "#dc2626", marginBottom: "12px" }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <label>Username / Email</label>
          <input
            style={s.input}
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <label>Password</label>
          <input
            style={s.input}
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button style={{ ...s.btnPrimary, width: "100%" }} type="submit" disabled={loading}>
            {loading ? "Authenticating..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

function CoursesListPage({ user, token }) {
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const loadCourses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load courses");
      setCourses(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this course?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/courses/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Delete failed");
      loadCourses();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEnroll = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/courses/${id}/enroll`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Enrollment failed");
      alert("Successfully enrolled!");
      loadCourses();
    } catch (err) {
      alert(err.message);
    }
  };

  const filtered = courses.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.courseName?.toLowerCase().includes(q) ||
      c.teacherName?.toLowerCase().includes(q) ||
      (Array.isArray(c.topics) && c.topics.some((t) => t.toLowerCase().includes(q)))
    );
  });

  return (
    <div style={s.container}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>{user.role === "Teacher" ? "My Managed Courses" : "Available Courses"}</h2>
        {user.role === "Teacher" && (
          <button style={s.btnPrimary} onClick={() => navigate("/courses/new")}>
            + Create New Course
          </button>
        )}
      </div>

      <input
        style={s.input}
        placeholder="Search courses by title, instructor, or topic..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {error && <div style={{ color: "#dc2626", margin: "12px 0" }}>{error}</div>}

      {loading ? (
        <p>Loading course offerings...</p>
      ) : (
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Course Title</th>
              <th style={s.th}>Instructor</th>
              <th style={s.th}>Duration</th>
              <th style={s.th}>Enrolled / Cap</th>
              <th style={s.th}>Status</th>
              <th style={s.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ ...s.td, textAlign: "center" }}>
                  No courses found matching your criteria.
                </td>
              </tr>
            ) : (
              filtered.map((c) => {
                const enrolledCount = c.enrolledStudents ? c.enrolledStudents.length : 0;
                const isStudent = user.role === "Student";
                const isEnrolled =
                  isStudent &&
                  c.enrolledStudents?.some(
                    (st) =>
                      String(st.studentId) === String(user.id || user.userId) ||
                      st.studentName === user.username
                  );

                return (
                  <tr key={c._id}>
                    <td style={s.td}>
                      <Link to={`/courses/${c._id}`} style={{ fontWeight: "bold", color: "#1e293b" }}>
                        {c.courseName}
                      </Link>
                    </td>
                    <td style={s.td}>{c.teacherName}</td>
                    <td style={s.td}>{c.duration} days</td>
                    <td style={s.td}>
                      {enrolledCount} / {c.maxStudent}
                    </td>
                    <td style={s.td}>
                      <span style={s.badge(c.status)}>{c.status}</span>
                    </td>
                    <td style={{ ...s.td, display: "flex", gap: "8px" }}>
                      <Link to={`/courses/${c._id}`} style={s.btnSecondary}>
                        View
                      </Link>

                      {user.role === "Teacher" && (
                        <>
                          <Link to={`/courses/${c._id}/edit`} style={s.btnSecondary}>
                            Edit
                          </Link>
                          {enrolledCount > 0 ? (
                            <button
                              style={s.btnDisabled}
                              disabled
                              title="Cannot delete course: Students are enrolled"
                            >
                              Delete
                            </button>
                          ) : (
                            <button style={s.btnDanger} onClick={() => handleDelete(c._id)}>
                              Delete
                            </button>
                          )}
                        </>
                      )}

                      {isStudent && (
                        <button
                          style={
                            isEnrolled || c.status !== "Open" || enrolledCount >= c.maxStudent
                              ? s.btnDisabled
                              : s.btnPrimary
                          }
                          disabled={isEnrolled || c.status !== "Open" || enrolledCount >= c.maxStudent}
                          onClick={() => handleEnroll(c._id)}
                        >
                          {isEnrolled ? "Enrolled" : enrolledCount >= c.maxStudent ? "Full" : "Enroll"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}

function CourseFormPage({ user, token }) {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState({
    courseName: "",
    duration: 30,
    topics: "",
    price: 0,
    maxStudent: 20,
    status: "Open",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isEdit) {
      fetch(`${API_BASE}/api/courses/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => {
          setForm({
            courseName: data.courseName || "",
            duration: data.duration || 30,
            topics: Array.isArray(data.topics) ? data.topics.join(", ") : data.topics || "",
            price: data.price || 0,
            maxStudent: data.maxStudent || 20,
            status: data.status || "Open",
          });
        })
        .catch((err) => setError("Failed to load course details"));
    }
  }, [id, isEdit, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // POST directly to /api/courses; PUT directly to /api/courses/:id
    const targetUrl = isEdit ? `${API_BASE}/api/courses/${id}` : `${API_BASE}/api/courses`;
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(targetUrl, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save course");

      navigate("/courses");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ ...s.container, maxWidth: "600px" }}>
      <div style={s.card}>
        <h2>{isEdit ? "Edit Course Offering" : "Create New Course"}</h2>
        {error && <div style={{ color: "#dc2626", marginBottom: "12px" }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <label>Course Title</label>
          <input
            style={s.input}
            required
            value={form.courseName}
            onChange={(e) => setForm({ ...form, courseName: e.target.value })}
          />

          <label>Duration (in Days)</label>
          <input
            style={s.input}
            type="number"
            min="1"
            required
            value={form.duration}
            onChange={(e) => setForm({ ...form, duration: e.target.value })}
          />

          <label>Topics (comma-separated)</label>
          <input
            style={s.input}
            placeholder="React, Node.js, Cloud Deployment"
            value={form.topics}
            onChange={(e) => setForm({ ...form, topics: e.target.value })}
          />

          <label>Tuition Price ($)</label>
          <input
            style={s.input}
            type="number"
            min="0"
            required
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />

          <label>Max Student Capacity</label>
          <input
            style={s.input}
            type="number"
            min="1"
            required
            value={form.maxStudent}
            onChange={(e) => setForm({ ...form, maxStudent: e.target.value })}
          />

          <label>Enrollment Status</label>
          <select
            style={s.input}
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="Open">Open</option>
            <option value="Close">Close</option>
            <option value="Cancel">Cancel</option>
          </select>

          <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
            <button style={s.btnPrimary} type="submit" disabled={loading}>
              {loading ? "Saving..." : isEdit ? "Update Course" : "Create Course"}
            </button>
            <button
              style={s.btnSecondary}
              type="button"
              onClick={() => navigate("/courses")}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CourseDetailsPage({ user, token }) {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_BASE}/api/courses/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setCourse(data))
      .catch((err) => setError("Failed to retrieve course details"));
  }, [id, token]);

  if (error) return <div style={s.container}>{error}</div>;
  if (!course) return <div style={s.container}>Loading details...</div>;

  return (
    <div style={s.container}>
      <div style={s.card}>
        <h2>{course.courseName}</h2>
        <p><strong>Instructor:</strong> {course.teacherName} ({course.teacherEmail})</p>
        <p><strong>Duration:</strong> {course.duration} days</p>
        <p><strong>Tuition:</strong> ${course.price}</p>
        <p><strong>Status:</strong> <span style={s.badge(course.status)}>{course.status}</span></p>
        <p><strong>Topics:</strong> {Array.isArray(course.topics) ? course.topics.join(", ") : course.topics}</p>

        {user.role === "Teacher" && (
          <div style={{ marginTop: "24px" }}>
            <h3>Enrolled Students ({course.enrolledStudents?.length || 0})</h3>
            {course.enrolledStudents?.length > 0 ? (
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Student Name</th>
                    <th style={s.th}>Email</th>
                    <th style={s.th}>Enrolled Date</th>
                  </tr>
                </thead>
                <tbody>
                  {course.enrolledStudents.map((st, i) => (
                    <tr key={i}>
                      <td style={s.td}>{st.studentName}</td>
                      <td style={s.td}>{st.studentEmail || "N/A"}</td>
                      <td style={s.td}>{new Date(st.enrolledAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ color: "#64748b" }}>No students enrolled in this course yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MyEnrollmentsPage({ user, token }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/courses?enrolled=true`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setCourses(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div style={s.container}>
      <h2>My Enrolled Courses</h2>
      {loading ? (
        <p>Loading registrations...</p>
      ) : courses.length === 0 ? (
        <p>You have not registered for any courses yet.</p>
      ) : (
        <div style={{ display: "grid", gap: "16px" }}>
          {courses.map((c) => (
            <div key={c._id} style={s.card}>
              <h3>{c.courseName}</h3>
              <p>Instructor: {c.teacherName}</p>
              <p>Duration: {c.duration} days | Status: <span style={s.badge(c.status)}>{c.status}</span></p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setToken("");
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  return (
    <HashRouter>
      <Navigation user={user} onLogout={handleLogout} />
      <Routes>
        <Route
          path="/login"
          element={!user ? <LoginPage onLogin={handleLogin} /> : <Navigate to="/courses" replace />}
        />
        {/* Exact new course route must come before :id */}
        <Route
          path="/courses/new"
          element={user && user.role === "Teacher" ? <CourseFormPage user={user} token={token} /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/courses/:id/edit"
          element={user && user.role === "Teacher" ? <CourseFormPage user={user} token={token} /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/courses/:id"
          element={user ? <CourseDetailsPage user={user} token={token} /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/courses"
          element={user ? <CoursesListPage user={user} token={token} /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/my-enrollments"
          element={user && user.role === "Student" ? <MyEnrollmentsPage user={user} token={token} /> : <Navigate to="/login" replace />}
        />
        <Route path="*" element={<Navigate to={user ? "/courses" : "/login"} replace />} />
      </Routes>
    </HashRouter>
  );
}