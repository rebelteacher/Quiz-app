import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ClassManagement = ({ user }) => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [className, setClassName] = useState("");
  const [classDescription, setClassDescription] = useState("");
  const [selectedClass, setSelectedClass] = useState(null);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await axios.get(`${API}/classes`);
      setClasses(response.data);
    } catch (e) {
      toast.error("Failed to load classes");
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingClass(null);
    setClassName("");
    setClassDescription("");
    setShowModal(true);
  };

  const openEditModal = async (classObj) => {
    setEditingClass(classObj);
    setClassName(classObj.name);
    setClassDescription(classObj.description || "");
    setShowModal(true);
  };

  const handleSaveClass = async () => {
    if (!className.trim()) {
      toast.error("Class name is required");
      return;
    }

    try {
      if (editingClass) {
        await axios.put(`${API}/classes/${editingClass.id}`, {
          name: className,
          description: classDescription,
        });
        toast.success("Class updated");
      } else {
        await axios.post(`${API}/classes`, {
          name: className,
          description: classDescription,
        });
        toast.success("Class created! Share the class code with students.");
      }
      setShowModal(false);
      fetchClasses();
    } catch (e) {
      toast.error("Failed to save class");
    }
  };

  const handleDeleteClass = async (classId) => {
    if (!window.confirm("Delete this class? This won't remove students from the system.")) return;

    try {
      await axios.delete(`${API}/classes/${classId}`);
      toast.success("Class deleted");
      fetchClasses();
    } catch (e) {
      toast.error("Failed to delete class");
    }
  };

  const viewClassDetails = async (classObj) => {
    try {
      const response = await axios.get(`${API}/classes/${classObj.id}`);
      // Merge the response with the original classObj to ensure we have class_code
      setSelectedClass({
        ...classObj,
        ...response.data
      });
    } catch (e) {
      console.error("Failed to load class details:", e);
      toast.error("Failed to load class details");
      // Fallback to using what we have
      setSelectedClass({
        ...classObj,
        students: []
      });
    }
  };

  const copyClassCode = (code) => {
    if (!code || code === 'undefined') {
      toast.error("Class code not available");
      return;
    }
    navigator.clipboard.writeText(code);
    toast.success("Class code copied to clipboard!");
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (selectedClass) {
    return (
      <div className="dashboard" data-testid="class-details-page">
        <div className="dashboard-header">
          <div className="header-left">
            <h1>{selectedClass.name}</h1>
            <p>{selectedClass.students?.length || 0} students enrolled</p>
          </div>
          <div className="header-right">
            <button className="btn btn-secondary" onClick={() => setSelectedClass(null)} data-testid="back-btn">
              ← Back
            </button>
          </div>
        </div>

        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          {/* Class Code Card */}
          <div style={{ background: "white", padding: "2rem", borderRadius: "16px", boxShadow: "0 4px 15px rgba(0,0,0,0.08)", marginBottom: "2rem", textAlign: "center" }}>
            <h3 style={{ fontSize: "1rem", color: "#718096", marginBottom: "1rem" }}>Class Code</h3>
            <div
              onClick={() => copyClassCode(selectedClass.class_code)}
              style={{
                display: "inline-block",
                padding: "1rem 2rem",
                background: "linear-gradient(135deg, #ff8c42 0%, #ff6b9d 100%)",
                color: "white",
                fontSize: "2rem",
                fontWeight: "700",
                borderRadius: "12px",
                cursor: "pointer",
                letterSpacing: "0.2em",
                transition: "transform 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              data-testid="class-code"
            >
              {selectedClass.class_code || "Loading..."}
            </div>
            <p style={{ fontSize: "0.875rem", color: "#718096", marginTop: "1rem" }}>
              Click to copy • Share this code with students
            </p>
          </div>

          {/* Students List */}
          <div style={{ background: "white", padding: "2rem", borderRadius: "16px", boxShadow: "0 4px 15px rgba(0,0,0,0.08)" }}>
            <h3 style={{ marginBottom: "1.5rem" }}>Enrolled Students</h3>
            {selectedClass.students?.length === 0 ? (
              <p style={{ color: "#718096", textAlign: "center", padding: "2rem" }}>
                No students enrolled yet. Share the class code with your students!
              </p>
            ) : (
              <div style={{ display: "grid", gap: "1rem" }}>
                {selectedClass.students?.map((student) => (
                  <div
                    key={student.id}
                    style={{
                      padding: "1rem",
                      border: "2px solid #e2e8f0",
                      borderRadius: "12px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                    data-testid={`student-${student.id}`}
                  >
                    <div>
                      <div style={{ fontWeight: "600", color: "#2d3748" }}>{student.name}</div>
                      <div style={{ fontSize: "0.875rem", color: "#718096" }}>{student.email}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard" data-testid="class-management-page">
      <div className="dashboard-header">
        <div className="header-left">
          <h1>Class Management</h1>
          <p>Create classes and get codes for students to join</p>
        </div>
        <div className="header-right">
          <button className="btn btn-primary" onClick={openCreateModal} data-testid="create-class-btn">
            + Create Class
          </button>
          <button className="btn btn-secondary" onClick={() => navigate("/teacher")} data-testid="back-btn">
            Back
          </button>
        </div>
      </div>

      {classes.length === 0 ? (
        <div className="empty-state" data-testid="no-classes">
          <div className="empty-icon">🎓</div>
          <h3>No Classes Yet</h3>
          <p>Create your first class to get started</p>
          <button className="btn btn-primary" onClick={openCreateModal}>
            Create Class
          </button>
        </div>
      ) : (
        <div className="tests-grid">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className="test-card"
              onClick={() => viewClassDetails(cls)}
              data-testid={`class-card-${cls.id}`}
            >
              <div className="test-card-header">
                <h3>{cls.name}</h3>
                <span 
                  className="test-badge badge-complete"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyClassCode(cls.class_code);
                  }}
                  style={{ cursor: "pointer" }}
                  title="Click to copy code"
                  data-testid={`class-code-badge-${cls.id}`}
                >
                  {cls.class_code}
                </span>
              </div>
              <p>{cls.description || "No description"}</p>
              <div className="test-meta">
                <span>👥 {cls.student_count} students</span>
              </div>
              <div className="test-actions">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    copyClassCode(cls.class_code);
                  }}
                  data-testid={`copy-code-btn-${cls.id}`}
                >
                  Copy Code
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    viewClassDetails(cls);
                  }}
                  data-testid={`view-class-btn-${cls.id}`}
                >
                  View Students
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditModal(cls);
                  }}
                  data-testid={`edit-class-btn-${cls.id}`}
                >
                  Edit
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClass(cls.id);
                  }}
                  data-testid={`delete-class-btn-${cls.id}`}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: "white",
              padding: "2rem",
              borderRadius: "20px",
              maxWidth: "500px",
              width: "90%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
            data-testid="class-modal"
          >
            <h2 style={{ marginBottom: "1rem" }}>
              {editingClass ? "Edit Class" : "Create New Class"}
            </h2>
            <div className="form-group">
              <label>Class Name *</label>
              <input
                type="text"
                className="form-input"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="e.g., Period 3 - Algebra"
                data-testid="class-name-input"
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <input
                type="text"
                className="form-input"
                value={classDescription}
                onChange={(e) => setClassDescription(e.target.value)}
                placeholder="e.g., 9th grade algebra class"
                data-testid="class-description-input"
              />
            </div>
            {!editingClass && (
              <p style={{ fontSize: "0.875rem", color: "#718096", marginBottom: "1rem", background: "#f7fafc", padding: "1rem", borderRadius: "8px" }}>
                💡 A unique class code will be generated. Share it with students so they can join!
              </p>
            )}
            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)} data-testid="cancel-btn">
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveClass} data-testid="save-class-btn">
                {editingClass ? "Update Class" : "Create Class"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassManagement;
