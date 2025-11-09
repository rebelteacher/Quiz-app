import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = ({ user, logout, updateUserRole }) => {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRoleSelector, setShowRoleSelector] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [classCode, setClassCode] = useState("");
  const [myClasses, setMyClasses] = useState([]);

  useEffect(() => {
    // Show role selector if role not set properly
    if (!user.role || user.role === "student") {
      loadStudentData();
    } else {
      setLoading(false);
    }
  }, []);

  const loadStudentData = async () => {
    try {
      await Promise.all([fetchTests(), fetchMyClasses()]);
    } catch (e) {
      console.error("Error loading student data:", e);
    } finally {
      setLoading(false);
    }
  };

  const fetchTests = async () => {
    try {
      const response = await axios.get(`${API}/tests`);
      console.log("Student tests:", response.data);
      setTests(response.data);
    } catch (e) {
      console.error("Failed to load tests:", e);
      toast.error("Failed to load tests");
    }
  };

  const fetchMyClasses = async () => {
    try {
      const response = await axios.get(`${API}/classes/student/my-classes`);
      console.log("Student classes:", response.data);
      setMyClasses(response.data);
    } catch (e) {
      console.error("Failed to load classes:", e);
    }
  };

  const handleJoinClass = async () => {
    if (!classCode.trim()) {
      toast.error("Please enter a class code");
      return;
    }

    try {
      await axios.post(`${API}/classes/join`, {
        class_code: classCode.toUpperCase()
      });
      toast.success("Successfully joined class!");
      setShowJoinModal(false);
      setClassCode("");
      fetchMyClasses();
      fetchTests();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to join class");
    }
  };

  const handleRoleChange = async (role) => {
    try {
      await axios.post(`${API}/auth/set-role?role=${role}`);
      updateUserRole(role);
      toast.success(`Role changed to ${role}`);
      if (role === "teacher") {
        navigate("/teacher");
      }
      setShowRoleSelector(false);
    } catch (e) {
      toast.error("Failed to change role");
    }
  };

  const checkSubmission = async (testId) => {
    try {
      await axios.get(`${API}/submissions/student/${testId}`);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleTakeTest = async (testId) => {
    const submitted = await checkSubmission(testId);
    if (submitted) {
      navigate(`/results/${testId}`);
    } else {
      navigate(`/test/${testId}`);
    }
  };

  if (showRoleSelector) {
    return (
      <div className="dashboard">
        <div className="role-selector" data-testid="role-selector">
          <h2>Choose Your Role</h2>
          <p>Are you a teacher creating tests or a student taking tests?</p>
          <div className="role-buttons">
            <button 
              className="role-button" 
              onClick={() => handleRoleChange("teacher")}
              data-testid="teacher-role-btn"
            >
              <div className="role-icon">👨‍🏫</div>
              <h3>Teacher</h3>
              <p>Create and manage tests</p>
            </button>
            <button 
              className="role-button" 
              onClick={() => handleRoleChange("student")}
              data-testid="student-role-btn"
            >
              <div className="role-icon">🎓</div>
              <h3>Student</h3>
              <p>Take assigned tests</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard" data-testid="student-dashboard">
      <div className="dashboard-header">
        <div className="header-left">
          <h1>My Tests</h1>
          <p>Complete your assigned tests</p>
        </div>
        <div className="header-right">
          <div className="user-info">
            {user.picture ? (
              <img src={user.picture} alt={user.name} className="user-avatar" />
            ) : (
              <div className="user-avatar-placeholder">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{user.name}</div>
              <div style={{ fontSize: "0.75rem", color: "#718096" }}>Student</div>
            </div>
          </div>
          <button 
            className="btn btn-primary" 
            onClick={() => setShowJoinModal(true)}
            data-testid="join-class-btn"
          >
            + Join Class
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={() => setShowRoleSelector(true)}
            data-testid="switch-role-btn"
          >
            Switch to Teacher
          </button>
          <button className="btn btn-secondary" onClick={logout} data-testid="logout-btn">
            Logout
          </button>
        </div>
      </div>

      {/* My Classes Section */}
      {myClasses.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem", color: "#2d3748" }}>My Classes</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
            {myClasses.map((cls) => (
              <div
                key={cls.id}
                style={{
                  background: "white",
                  padding: "1rem 1.5rem",
                  borderRadius: "12px",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
                  border: "2px solid #e2e8f0"
                }}
                data-testid={`my-class-${cls.id}`}
              >
                <div style={{ fontWeight: "600", color: "#2d3748", marginBottom: "0.25rem" }}>{cls.name}</div>
                <div style={{ fontSize: "0.75rem", color: "#718096" }}>Teacher: {cls.teacher_name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-screen">
          <div className="loading-spinner"></div>
        </div>
      ) : tests.length === 0 ? (
        <div className="empty-state" data-testid="empty-tests">
          <div className="empty-icon">📝</div>
          <h3>No Tests Assigned</h3>
          <p>Your teacher hasn't assigned any tests yet. Check back later!</p>
        </div>
      ) : (
        <div className="tests-grid">
          {tests.map((test) => (
            <div 
              key={test.id} 
              className="test-card" 
              onClick={() => handleTakeTest(test.id)}
              data-testid={`test-card-${test.id}`}
            >
              <div className="test-card-header">
                <h3>{test.title}</h3>
              </div>
              <p>{test.resource_description}</p>
              <div className="test-meta">
                <span>📋 {test.questions.length} questions</span>
                <span>⏱️ ~{Math.ceil(test.questions.length * 1.5)} min</span>
              </div>
              <button className="btn btn-primary" data-testid={`take-test-btn-${test.id}`}>
                Start Test
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Join Class Modal */}
      {showJoinModal && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Join a Class</h3>
              <button 
                className="modal-close" 
                onClick={() => setShowJoinModal(false)}
                data-testid="close-join-modal"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>Enter the class code provided by your teacher:</p>
              <input
                type="text"
                placeholder="Enter class code"
                value={classCode}
                onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                className="form-input"
                data-testid="class-code-input"
                style={{ textTransform: "uppercase" }}
              />
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowJoinModal(false)}
                data-testid="cancel-join-btn"
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleJoinClass}
                data-testid="confirm-join-btn"
              >
                Join Class
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
