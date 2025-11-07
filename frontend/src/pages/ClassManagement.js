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
  const [studentEmails, setStudentEmails] = useState("");

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
    setStudentEmails("");
    setShowModal(true);
  };

  const openEditModal = async (classObj) => {
    setEditingClass(classObj);
    setClassName(classObj.name);
    setClassDescription(classObj.description || "");
    setStudentEmails(classObj.student_emails.join(", "));
    setShowModal(true);
  };

  const handleSaveClass = async () => {
    if (!className.trim()) {
      toast.error("Class name is required");
      return;
    }

    const emails = studentEmails
      .split(",")
      .map((e) => e.trim())
      .filter((e) => e);

    try {
      if (editingClass) {
        await axios.put(`${API}/classes/${editingClass.id}`, {
          name: className,
          description: classDescription,
          student_emails: emails,
        });
        toast.success("Class updated");
      } else {
        await axios.post(`${API}/classes`, {
          name: className,
          description: classDescription,
          student_emails: emails,
        });
        toast.success("Class created");
      }
      setShowModal(false);
      fetchClasses();
    } catch (e) {
      toast.error("Failed to save class");
    }
  };

  const handleDeleteClass = async (classId) => {
    if (!window.confirm("Delete this class? This won't delete students.")) return;

    try {
      await axios.delete(`${API}/classes/${classId}`);
      toast.success("Class deleted");
      fetchClasses();
    } catch (e) {
      toast.error("Failed to delete class");
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="dashboard" data-testid="class-management-page">
      <div className="dashboard-header">
        <div className="header-left">
          <h1>Class Management</h1>
          <p>Organize your students into classes</p>
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
          <p>Create your first class to organize students</p>
          <button className="btn btn-primary" onClick={openCreateModal}>
            Create Class
          </button>
        </div>
      ) : (
        <div className="tests-grid">
          {classes.map((cls) => (
            <div key={cls.id} className="test-card" data-testid={`class-card-${cls.id}`}>
              <div className="test-card-header">
                <h3>{cls.name}</h3>
              </div>
              <p>{cls.description || "No description"}</p>
              <div className="test-meta">
                <span>👥 {cls.student_count} students</span>
              </div>
              <div className="test-actions">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => openEditModal(cls)}
                  data-testid={`edit-class-btn-${cls.id}`}
                >
                  Edit
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => handleDeleteClass(cls.id)}
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
            <div className="form-group">
              <label>Student Emails</label>
              <textarea
                className="form-textarea"
                value={studentEmails}
                onChange={(e) => setStudentEmails(e.target.value)}
                placeholder="student1@example.com, student2@example.com"
                rows={4}
                data-testid="class-students-input"
              />
              <p style={{ fontSize: "0.75rem", color: "#718096", marginTop: "0.5rem" }}>
                Separate emails with commas
              </p>
            </div>
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
