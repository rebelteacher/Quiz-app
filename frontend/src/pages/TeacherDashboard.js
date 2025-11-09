import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TeacherDashboard = ({ user, logout }) => {
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTestId, setAssignTestId] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selectedClassIds, setSelectedClassIds] = useState([]);
  const [studentEmails, setStudentEmails] = useState("");

  useEffect(() => {
    fetchTests();
    fetchClasses();
  }, []);

  const fetchTests = async () => {
    try {
      const response = await axios.get(`${API}/tests`);
      setTests(response.data);
    } catch (e) {
      toast.error("Failed to load tests");
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await axios.get(`${API}/classes`);
      setClasses(response.data);
    } catch (e) {
      toast.error("Failed to load classes");
    }
  };

  const handleDeleteTest = async (testId, e) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this test?")) return;
    
    try {
      await axios.delete(`${API}/tests/${testId}`);
      toast.success("Test deleted");
      fetchTests();
    } catch (e) {
      toast.error("Failed to delete test");
    }
  };

  const handleViewResults = (testId, e) => {
    e.stopPropagation();
    navigate(`/teacher/reports/${testId}`);
  };

  const openAssignModal = (testId, e) => {
    e.stopPropagation();
    setAssignTestId(testId);
    
    // Load existing assignment
    axios.get(`${API}/assignments/${testId}`)
      .then(response => {
        setSelectedClassIds(response.data.class_ids || []);
      })
      .catch(() => {
        setSelectedClassIds([]);
      });
    
    setShowAssignModal(true);
  };

  const handleAssignTest = async () => {
    if (selectedClassIds.length === 0) {
      toast.error("Please select at least one class");
      return;
    }
    
    try {
      const response = await axios.post(`${API}/assignments`, {
        test_id: assignTestId,
        class_ids: selectedClassIds
      });
      console.log("Assignment successful:", response.data);
      toast.success("Test assigned to selected classes");
      setShowAssignModal(false);
      setAssignTestId(null);
      setSelectedClassIds([]);
    } catch (e) {
      console.error("Assignment error:", e.response?.data || e.message);
      const errorMsg = e.response?.data?.detail || "Failed to assign test. Please try again.";
      toast.error(errorMsg);
    }
  };

  const toggleClassSelection = (classId) => {
    setSelectedClassIds(prev => 
      prev.includes(classId) 
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  return (
    <div className="dashboard" data-testid="teacher-dashboard">
      <div className="dashboard-header">
        <div className="header-left">
          <h1>My Tests</h1>
          <p>Create and manage your tests</p>
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
              <div style={{ fontSize: "0.75rem", color: "#718096" }}>Teacher</div>
            </div>
          </div>
          <button className="btn btn-secondary" onClick={() => navigate("/teacher/classes")} data-testid="classes-btn">
            Classes
          </button>
          <button className="btn btn-primary" onClick={() => navigate("/teacher/create")} data-testid="create-test-btn">
            + Create Test
          </button>
          <button className="btn btn-secondary" onClick={logout} data-testid="logout-btn">
            Logout
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-screen">
          <div className="loading-spinner"></div>
        </div>
      ) : tests.length === 0 ? (
        <div className="empty-state" data-testid="no-tests">
          <div className="empty-icon">✨</div>
          <h3>Create Your First Test</h3>
          <p>Use AI to generate questions from your teaching resources</p>
          <button className="btn btn-primary" onClick={() => navigate("/teacher/create")} data-testid="create-first-test-btn">
            Create Test
          </button>
        </div>
      ) : (
        <div className="tests-grid">
          {tests.map((test) => (
            <div key={test.id} className="test-card" data-testid={`teacher-test-card-${test.id}`}>
              <div className="test-card-header">
                <h3>{test.title}</h3>
                <span className={`test-badge ${test.status === 'published' ? 'badge-complete' : 'badge-pending'}`}>
                  {test.status === 'published' ? 'Published' : 'Draft'}
                </span>
              </div>
              <p>{test.resource_description}</p>
              <div className="test-meta">
                <span>📋 {test.questions.length} questions</span>
              </div>
              <div className="test-actions">
                {test.status === 'draft' ? (
                  <button 
                    className="btn btn-primary btn-sm" 
                    onClick={(e) => { e.stopPropagation(); navigate(`/teacher/preview/${test.id}`); }}
                    data-testid={`edit-test-btn-${test.id}`}
                  >
                    Edit & Publish
                  </button>
                ) : (
                  <>
                    <button 
                      className="btn btn-primary btn-sm" 
                      onClick={(e) => openAssignModal(test.id, e)}
                      data-testid={`assign-test-btn-${test.id}`}
                    >
                      Assign
                    </button>
                    <button 
                      className="btn btn-secondary btn-sm" 
                      onClick={(e) => handleViewResults(test.id, e)}
                      data-testid={`view-results-btn-${test.id}`}
                    >
                      Results
                    </button>
                  </>
                )}
                <button 
                  className="btn btn-secondary btn-sm" 
                  onClick={(e) => handleDeleteTest(test.id, e)}
                  data-testid={`delete-test-btn-${test.id}`}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAssignModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }} onClick={() => setShowAssignModal(false)}>
          <div style={{
            background: "white",
            padding: "2rem",
            borderRadius: "20px",
            maxWidth: "500px",
            width: "90%",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
          }} onClick={(e) => e.stopPropagation()} data-testid="assign-modal">
            <h2 style={{ marginBottom: "1rem" }}>Assign Test</h2>
            <p style={{ color: "#718096", marginBottom: "1.5rem", fontSize: "0.875rem" }}>
              Select classes to assign this test to
            </p>
            <div className="form-group">
              <label>Select Classes</label>
              {classes.length === 0 ? (
                <p style={{ color: "#718096", fontSize: "0.875rem", padding: "1rem", background: "#f7fafc", borderRadius: "8px" }}>
                  No classes yet. Create a class first!
                </p>
              ) : (
                <div style={{ display: "grid", gap: "0.75rem", maxHeight: "300px", overflowY: "auto" }}>
                  {classes.map((cls) => (
                    <div
                      key={cls.id}
                      onClick={() => toggleClassSelection(cls.id)}
                      style={{
                        padding: "1rem",
                        border: "2px solid",
                        borderColor: selectedClassIds.includes(cls.id) ? "#ff8c42" : "#e2e8f0",
                        background: selectedClassIds.includes(cls.id) ? "#fff5f0" : "white",
                        borderRadius: "12px",
                        cursor: "pointer",
                        transition: "all 0.2s"
                      }}
                      data-testid={`class-option-${cls.id}`}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: "600", color: "#2d3748" }}>{cls.name}</div>
                          <div style={{ fontSize: "0.875rem", color: "#718096" }}>
                            {cls.student_count} students
                          </div>
                        </div>
                        {selectedClassIds.includes(cls.id) && (
                          <div style={{ color: "#ff8c42", fontSize: "1.5rem" }}>✓</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button className="btn btn-secondary" onClick={() => setShowAssignModal(false)} data-testid="cancel-assign-btn">
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleAssignTest} data-testid="confirm-assign-btn">
                Assign Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
