import React, { useState, useEffect } from 'react';
import {
  HashRouter,
  Routes,
  Route,
  Navigate,
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';

// Clean base API URL: strips trailing slash, defaults to local dev port 3000
const RAW_API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const API_BASE = RAW_API_BASE.replace(/\/+$/, '');

// Utility helper to safely parse API responses
async function parseResponseBody(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { message: text || `HTTP Error ${res.status}` };
  }
}

// Global Navigation Bar
function Navigation({ user, onLogout }) {
  return (
    <nav style={styles.navBar}>
      <div style={styles.navBrand}>
        <Link to="/courses" style={styles.brandLink}>
          Online Course Service
        </Link>
      </div>
      <div style={styles.navLinks}>
        {user ? (
          <>
            <span style={styles.userBadge}>
              {user.username} ({user.role})
            </span>
            <Link to="/courses" style={styles.navItem}>
              Courses
            </Link>
            {user.role === 'student' && (
              <Link to="/my-enrollments" style={styles.navItem}>
                My Enrollments
              </Link>
            )}
            <button onClick={onLogout} style={styles.logoutBtn}>
              Logout
            </button>
          </>
        ) : (
          <Link to="/login" style={styles.navItem}>
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}

// 1. Login Component
function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await parseResponseBody(res);

      if (!res.ok) {
        throw new Error(data.message || `Login failed with status ${res.status}`);
      }

      onLoginSuccess(data.token, data.user);
      navigate('/courses');
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.authContainer}>
      <div style={styles.authCard}>
        <h2 style={styles.cardHeading}>Account Login</h2>
        {error && <div style={styles.errorBanner}>{error}</div>}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Username or Email</label>
            <input
              type="text"
              required
              value={username}
              placeholder="e.g. teacher1 or student1"
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              required
              value={password}
              placeholder="password123"
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
            />
          </div>
          <button type="submit" disabled={loading} style={styles.primaryBtn}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

// 2. Courses List Component
function CoursesListPage({ user, token }) {
  const [courses, setCourses] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  async function loadCourses(query = '') {
    try {
      setLoading(true);
      const url = new URL(`${API_BASE}/api/courses`);
      if (query) url.searchParams.set('search', query);

      const res = await fetch(url.toString(), { headers: authHeaders });
      const data = await parseResponseBody(res);

      if (!res.ok) throw new Error(data.message || 'Failed to load courses');
      setCourses(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCourses();
  }, []);

  async function handleDelete(courseId, enrolledCount) {
    if (enrolledCount > 0) {
      alert('Cannot delete course: Students are currently enrolled.');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this course?')) return;

    try {
      const res = await fetch(`${API_BASE}/api/courses/${courseId}`, {
        method: 'DELETE',
        headers: authHeaders,
      });
      const data = await parseResponseBody(res);
      if (!res.ok) throw new Error(data.message || 'Failed to delete course');
      setCourses((prev) => prev.filter((c) => (c._id || c.id) !== courseId));
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.headerRow}>
        <h2>{user.role === 'teacher' ? 'My Courses' : 'Available Courses'}</h2>
        {user.role === 'teacher' && (
          <button
            onClick={() => navigate('/courses/new')}
            style={styles.actionBtnPrimary}
          >
            + Create New Course
          </button>
        )}
      </div>

      <div style={styles.searchBar}>
        <input
          type="text"
          value={search}
          placeholder="Search by course name or teacher..."
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
        <button onClick={() => loadCourses(search)} style={styles.secondaryBtn}>
          Search
        </button>
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      {loading ? (
        <p>Loading courses...</p>
      ) : courses.length === 0 ? (
        <p style={{ marginTop: '20px' }}>No courses found.</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Course Name</th>
              <th style={styles.th}>Instructor</th>
              <th style={styles.th}>Duration</th>
              <th style={styles.th}>Price</th>
              <th style={styles.th}>Capacity</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => {
              const id = course._id || course.id;
              const enrolledCount = course.enrolledStudents
                ? course.enrolledStudents.length
                : 0;

              return (
                <tr key={id} style={styles.tr}>
                  <td style={styles.td}>
                    <strong>{course.courseName}</strong>
                  </td>
                  <td style={styles.td}>{course.teacherName || 'N/A'}</td>
                  <td style={styles.td}>{course.duration} days</td>
                  <td style={styles.td}>${course.price}</td>
                  <td style={styles.td}>
                    {enrolledCount} / {course.maxStudent}
                  </td>
                  <td style={styles.td}>
                    <span style={getStatusBadge(course.status)}>
                      {course.status}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button
                      onClick={() => navigate(`/courses/${id}`)}
                      style={styles.tableBtn}
                    >
                      Details
                    </button>
                    {user.role === 'teacher' && (
                      <>
                        <button
                          onClick={() => navigate(`/courses/${id}/edit`)}
                          style={styles.tableBtn}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(id, enrolledCount)}
                          disabled={enrolledCount > 0}
                          title={
                            enrolledCount > 0
                              ? 'Cannot delete course: Students are enrolled'
                              : 'Delete course'
                          }
                          style={{
                            ...styles.tableBtnDanger,
                            ...(enrolledCount > 0 ? styles.disabledBtn : {}),
                          }}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// 3. Course Details & Enrollment Component
function CourseDetailPage({ user, token }) {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [enrolling, setEnrolling] = useState(false);
  const navigate = useNavigate();

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  async function fetchDetails() {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/api/courses/${id}`, {
        headers: authHeaders,
      });
      const data = await parseResponseBody(res);
      if (!res.ok) throw new Error(data.message || 'Failed to fetch course');
      setCourse(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDetails();
  }, [id]);

  async function handleEnroll() {
    try {
      setEnrolling(true);
      const res = await fetch(`${API_BASE}/api/courses/${id}/enroll`, {
        method: 'POST',
        headers: authHeaders,
      });
      const data = await parseResponseBody(res);
      if (!res.ok) throw new Error(data.message || 'Enrollment failed');
      alert('Successfully enrolled!');
      fetchDetails();
    } catch (err) {
      alert(err.message);
    } finally {
      setEnrolling(false);
    }
  }

  if (loading) return <div style={styles.container}>Loading details...</div>;
  if (error)
    return (
      <div style={styles.container}>
        <div style={styles.errorBanner}>{error}</div>
        <button onClick={() => navigate('/courses')} style={styles.secondaryBtn}>
          Back to Courses
        </button>
      </div>
    );
  if (!course) return null;

  const enrolledCount = course.enrolledStudents ? course.enrolledStudents.length : 0;
  const isFull = enrolledCount >= course.maxStudent;
  const isEnrolled =
    course.enrolledStudents &&
    course.enrolledStudents.some((s) => s.userId === user.id || s.email === user.email);

  return (
    <div style={styles.container}>
      <button onClick={() => navigate('/courses')} style={styles.secondaryBtn}>
        ← Back
      </button>
      <div style={styles.detailCard}>
        <h2>{course.courseName}</h2>
        <p><strong>Instructor:</strong> {course.teacherName} ({course.teacherEmail})</p>
        <p><strong>Duration:</strong> {course.duration} days</p>
        <p><strong>Price:</strong> ${course.price}</p>
        <p><strong>Capacity:</strong> {enrolledCount} / {course.maxStudent}</p>
        <p>
          <strong>Status:</strong>{' '}
          <span style={getStatusBadge(course.status)}>{course.status}</span>
        </p>
        <p>
          <strong>Topics Covered:</strong>{' '}
          {Array.isArray(course.topics)
            ? course.topics.join(', ')
            : course.topics || 'None listed'}
        </p>

        {user.role === 'student' && (
          <div style={{ marginTop: '20px' }}>
            {isEnrolled ? (
              <span style={styles.badgeSuccess}>Already Enrolled</span>
            ) : isFull ? (
              <span style={styles.badgeDanger}>Course Full</span>
            ) : course.status !== 'Open' ? (
              <span style={styles.badgeMuted}>Registration Not Open</span>
            ) : (
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                style={styles.primaryBtn}
              >
                {enrolling ? 'Enrolling...' : 'Enroll Now'}
              </button>
            )}
          </div>
        )}

        {user.role === 'teacher' && (
          <div style={{ marginTop: '30px' }}>
            <h3>Enrolled Students ({enrolledCount})</h3>
            {enrolledCount === 0 ? (
              <p>No students enrolled yet.</p>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Username</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Enrolled Date</th>
                  </tr>
                </thead>
                <tbody>
                  {course.enrolledStudents.map((student, idx) => (
                    <tr key={idx} style={styles.tr}>
                      <td style={styles.td}>{student.username}</td>
                      <td style={styles.td}>{student.email}</td>
                      <td style={styles.td}>
                        {student.enrolledAt
                          ? new Date(student.enrolledAt).toLocaleDateString()
                          : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// 4. Create / Edit Course Form Component
function CourseFormPage({ user, token, isEdit = false }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    courseName: '',
    duration: '',
    price: '',
    maxStudent: '',
    status: 'Open',
    topics: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  useEffect(() => {
    if (isEdit && id) {
      fetch(`${API_BASE}/api/courses/${id}`, { headers: authHeaders })
        .then((res) => parseResponseBody(res))
        .then((data) => {
          setFormData({
            courseName: data.courseName || '',
            duration: data.duration || '',
            price: data.price || '',
            maxStudent: data.maxStudent || '',
            status: data.status || 'Open',
            topics: Array.isArray(data.topics)
              ? data.topics.join(', ')
              : data.topics || '',
          });
        })
        .catch((err) => setError(err.message));
    }
  }, [isEdit, id]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);

    const payload = {
      ...formData,
      duration: Number(formData.duration),
      price: Number(formData.price),
      maxStudent: Number(formData.maxStudent),
      topics: formData.topics
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    };

    try {
      const endpoint = isEdit
        ? `${API_BASE}/api/courses/${id}`
        : `${API_BASE}/api/courses`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: authHeaders,
        body: JSON.stringify(payload),
      });

      const data = await parseResponseBody(res);
      if (!res.ok) throw new Error(data.message || 'Operation failed');

      navigate('/courses');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.formCard}>
        <h2>{isEdit ? 'Edit Course' : 'Create New Course'}</h2>
        {error && <div style={styles.errorBanner}>{error}</div>}
        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formGroup}>
            <label style={styles.label}>Course Name</label>
            <input
              type="text"
              required
              value={formData.courseName}
              onChange={(e) =>
                setFormData({ ...formData, courseName: e.target.value })
              }
              style={styles.input}
            />
          </div>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Duration (days)</label>
              <input
                type="number"
                min="1"
                required
                value={formData.duration}
                onChange={(e) =>
                  setFormData({ ...formData, duration: e.target.value })
                }
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Price ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
                style={styles.input}
              />
            </div>
          </div>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Max Capacity</label>
              <input
                type="number"
                min="1"
                required
                value={formData.maxStudent}
                onChange={(e) =>
                  setFormData({ ...formData, maxStudent: e.target.value })
                }
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Status</label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
                style={styles.input}
              >
                <option value="Open">Open</option>
                <option value="Close">Close</option>
                <option value="Cancel">Cancel</option>
              </select>
            </div>
          </div>
          <div style={styles.formGroup}>
            <label style={styles.label}>Topics (comma separated)</label>
            <input
              type="text"
              placeholder="e.g. React, Next.js, Node.js"
              value={formData.topics}
              onChange={(e) =>
                setFormData({ ...formData, topics: e.target.value })
              }
              style={styles.input}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="submit" disabled={saving} style={styles.primaryBtn}>
              {saving ? 'Saving...' : 'Save Course'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/courses')}
              style={styles.secondaryBtn}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 5. Student My Enrollments Component
function MyEnrollmentsPage({ token }) {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    async function loadEnrollments() {
      try {
        const res = await fetch(`${API_BASE}/api/courses?enrolled=true`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await parseResponseBody(res);
        if (!res.ok) throw new Error(data.message || 'Failed to load enrollments');
        setEnrollments(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadEnrollments();
  }, [token]);

  return (
    <div style={styles.container}>
      <h2>My Registered Courses</h2>
      {error && <div style={styles.errorBanner}>{error}</div>}
      {loading ? (
        <p>Loading enrollments...</p>
      ) : enrollments.length === 0 ? (
        <p>You have not enrolled in any courses yet.</p>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Course Name</th>
              <th style={styles.th}>Instructor</th>
              <th style={styles.th}>Duration</th>
              <th style={styles.th}>Price</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {enrollments.map((course) => {
              const id = course._id || course.id;
              return (
                <tr key={id} style={styles.tr}>
                  <td style={styles.td}><strong>{course.courseName}</strong></td>
                  <td style={styles.td}>{course.teacherName || 'N/A'}</td>
                  <td style={styles.td}>{course.duration} days</td>
                  <td style={styles.td}>${course.price}</td>
                  <td style={styles.td}>
                    <span style={getStatusBadge(course.status)}>{course.status}</span>
                  </td>
                  <td style={styles.td}>
                    <button
                      onClick={() => navigate(`/courses/${id}`)}
                      style={styles.tableBtn}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// Main Application Root
export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  function handleLoginSuccess(newToken, newUser) {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
  }

  return (
    <HashRouter>
      <Navigation user={user} onLogout={handleLogout} />
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
            user ? (
              <CoursesListPage user={user} token={token} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/courses/new"
          element={
            user && user.role === 'teacher' ? (
              <CourseFormPage user={user} token={token} />
            ) : (
              <Navigate to="/courses" replace />
            )
          }
        />
        <Route
          path="/courses/:id"
          element={
            user ? (
              <CourseDetailPage user={user} token={token} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
        <Route
          path="/courses/:id/edit"
          element={
            user && user.role === 'teacher' ? (
              <CourseFormPage user={user} token={token} isEdit />
            ) : (
              <Navigate to="/courses" replace />
            )
          }
        />
        <Route
          path="/my-enrollments"
          element={
            user && user.role === 'student' ? (
              <MyEnrollmentsPage user={user} token={token} />
            ) : (
              <Navigate to="/courses" replace />
            )
          }
        />
        <Route
          path="*"
          element={<Navigate to={user ? '/courses' : '/login'} replace />}
        />
      </Routes>
    </HashRouter>
  );
}

// Helpers & Styles
function getStatusBadge(status) {
  const base = {
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '0.85rem',
    fontWeight: 'bold',
  };
  if (status === 'Open') return { ...base, backgroundColor: '#d1fae5', color: '#065f46' };
  if (status === 'Close') return { ...base, backgroundColor: '#fef3c7', color: '#92400e' };
  return { ...base, backgroundColor: '#fee2e2', color: '#991b1b' };
}

const styles = {
  navBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 24px',
    backgroundColor: '#1e293b',
    color: '#fff',
  },
  brandLink: {
    color: '#fff',
    fontWeight: 'bold',
    textDecoration: 'none',
    fontSize: '1.2rem',
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  navItem: {
    color: '#cbd5e1',
    textDecoration: 'none',
    fontSize: '0.95rem',
  },
  userBadge: {
    fontSize: '0.85rem',
    backgroundColor: '#334155',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  logoutBtn: {
    backgroundColor: '#ef4444',
    border: 'none',
    color: '#fff',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  container: {
    maxWidth: '1000px',
    margin: '30px auto',
    padding: '0 20px',
    fontFamily: 'sans-serif',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  authContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '75vh',
    fontFamily: 'sans-serif',
  },
  authCard: {
    width: '100%',
    maxWidth: '400px',
    padding: '24px',
    borderRadius: '8px',
    backgroundColor: '#ffffff',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
  },
  cardHeading: {
    textAlign: 'center',
    marginBottom: '20px',
    color: '#1e293b',
  },
  formCard: {
    maxWidth: '600px',
    margin: '20px auto',
    padding: '24px',
    borderRadius: '8px',
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
  },
  detailCard: {
    marginTop: '20px',
    padding: '24px',
    borderRadius: '8px',
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1,
  },
  formRow: {
    display: 'flex',
    gap: '12px',
  },
  label: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#334155',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '0.95rem',
    outline: 'none',
  },
  searchBar: {
    display: 'flex',
    gap: '10px',
    margin: '20px 0',
  },
  searchInput: {
    flex: 1,
    padding: '10px 14px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
  },
  primaryBtn: {
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  secondaryBtn: {
    backgroundColor: '#64748b',
    color: '#fff',
    border: 'none',
    padding: '8px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  actionBtnPrimary: {
    backgroundColor: '#10b981',
    color: '#fff',
    border: 'none',
    padding: '10px 16px',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  tableBtn: {
    backgroundColor: '#e2e8f0',
    border: 'none',
    padding: '4px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
    marginRight: '6px',
  },
  tableBtnDanger: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    border: 'none',
    padding: '4px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  disabledBtn: {
    opacity: 0.45,
    cursor: 'not-allowed',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '15px',
    fontSize: '0.95rem',
  },
  th: {
    textAlign: 'left',
    padding: '12px 10px',
    borderBottom: '2px solid #cbd5e1',
    backgroundColor: '#f8fafc',
  },
  tr: {
    borderBottom: '1px solid #e2e8f0',
  },
  td: {
    padding: '12px 10px',
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    padding: '10px 14px',
    borderRadius: '6px',
    marginBottom: '14px',
    fontSize: '0.9rem',
  },
  badgeSuccess: {
    padding: '6px 12px',
    borderRadius: '4px',
    backgroundColor: '#d1fae5',
    color: '#065f46',
    fontWeight: 'bold',
  },
  badgeDanger: {
    padding: '6px 12px',
    borderRadius: '4px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    fontWeight: 'bold',
  },
  badgeMuted: {
    padding: '6px 12px',
    borderRadius: '4px',
    backgroundColor: '#f1f5f9',
    color: '#64748b',
    fontWeight: 'bold',
  },
};