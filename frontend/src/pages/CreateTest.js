import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const GRADE_LEVELS = [
  "Kindergarten",
  "1st Grade",
  "2nd Grade",
  "3rd Grade",
  "4th Grade",
  "5th Grade",
  "6th Grade",
  "7th Grade",
  "8th Grade",
  "9th Grade",
  "10th Grade",
  "11th Grade",
  "12th Grade",
  "College"
];

const STATE_STANDARDS = [
  "Common Core State Standards",
  "Texas TEKS",
  "California Standards",
  "Florida Standards",
  "New York Standards",
  "NGSS (Science)",
  "Other"
];

const CreateTest = ({ user }) => {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [resourceDescription, setResourceDescription] = useState("");
  const [numQuestions, setNumQuestions] = useState(20);
  const [gradeLevel, setGradeLevel] = useState("");
  const [stateStandards, setStateStandards] = useState("Common Core State Standards");
  const [standards, setStandards] = useState("");
  const [file, setFile] = useState(null);
  const [generating, setGenerating] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim() || !resourceDescription.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!gradeLevel) {
      toast.error("Please select a grade level");
      return;
    }
    
    setGenerating(true);
    
    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("resource_description", resourceDescription);
      formData.append("num_questions", numQuestions.toString());
      formData.append("grade_level", gradeLevel);
      formData.append("state_standards", stateStandards);
      if (standards) {
        formData.append("standards", standards);
      }
      if (file) {
        formData.append("file", file);
      }
      
      const response = await axios.post(`${API}/tests/generate`, formData, {
        headers: {
          "Content-Type": "multipart/form-data"
        }
      });
      
      toast.success("Test generated! Review and publish when ready.");
      navigate(`/teacher/preview/${response.data.id}`);
    } catch (e) {
      console.error(e);
      toast.error(e.response?.data?.detail || "Failed to generate test. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="dashboard" data-testid="create-test-page">
      <div className="dashboard-header">
        <div className="header-left">
          <h1>Create New Test</h1>
          <p>AI will generate questions aligned with standards</p>
        </div>
        <div className="header-right">
          <button className="btn btn-secondary" onClick={() => navigate("/teacher")} data-testid="dashboard-btn">
            ← Dashboard
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <div style={{ background: "white", padding: "2rem", borderRadius: "20px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Test Title *</label>
              <input
                type="text"
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Code.org Unit 3 - Lessons 16-17 Quiz"
                required
                data-testid="test-title-input"
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label>Grade Level *</label>
                <select
                  className="form-input"
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  required
                  data-testid="grade-level-select"
                  style={{ cursor: "pointer" }}
                >
                  <option value="">Select Grade Level</option>
                  {GRADE_LEVELS.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>State Standards *</label>
                <select
                  className="form-input"
                  value={stateStandards}
                  onChange={(e) => setStateStandards(e.target.value)}
                  required
                  data-testid="state-standards-select"
                  style={{ cursor: "pointer" }}
                >
                  {STATE_STANDARDS.map(standard => (
                    <option key={standard} value={standard}>{standard}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Resource Description *</label>
              <textarea
                className="form-textarea"
                value={resourceDescription}
                onChange={(e) => setResourceDescription(e.target.value)}
                placeholder="Describe the teaching materials (e.g., 'code.org unit 3, lessons 16 and 17 covering loops and conditionals')"
                required
                rows={4}
                data-testid="resource-description-input"
              />
            </div>

            <div className="form-group">
              <label>Upload Resource File (Optional)</label>
              <input
                type="file"
                className="form-input"
                onChange={handleFileChange}
                accept=".pdf,.txt,.csv,.doc,.docx"
                data-testid="file-upload-input"
              />
              <p style={{ fontSize: "0.75rem", color: "#718096", marginTop: "0.5rem" }}>
                Upload PDFs, documents, or text files with teaching materials
              </p>
            </div>

            <div className="form-group">
              <label>Number of Questions</label>
              <input
                type="number"
                className="form-input"
                value={numQuestions}
                onChange={(e) => setNumQuestions(parseInt(e.target.value) || 20)}
                min="5"
                max="50"
                data-testid="num-questions-input"
              />
            </div>

            <div className="form-group">
              <label>Specific Standards (Optional)</label>
              <input
                type="text"
                className="form-input"
                value={standards}
                onChange={(e) => setStandards(e.target.value)}
                placeholder="e.g., CCSS.Math.3.OA.A.1, CCSS.Math.3.OA.A.2"
                data-testid="standards-input"
              />
              <p style={{ fontSize: "0.75rem", color: "#718096", marginTop: "0.5rem" }}>
                AI will automatically select appropriate standards, or you can specify specific ones
              </p>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={generating}
              style={{ width: "100%", marginTop: "1rem" }}
              data-testid="generate-test-btn"
            >
              {generating ? (
                <>
                  <div className="loading-spinner" style={{ width: "20px", height: "20px", display: "inline-block", marginRight: "0.5rem" }}></div>
                  Generating Test...
                </>
              ) : (
                "Generate Test with AI"
              )}
            </button>
          </form>
        </div>

        <div style={{ background: "white", padding: "1.5rem", borderRadius: "16px", boxShadow: "0 4px 15px rgba(0,0,0,0.08)", marginTop: "1.5rem" }}>
          <h3 style={{ fontSize: "1rem", marginBottom: "0.75rem", color: "#2d3748" }}>✨ Standards-Aligned Assessment</h3>
          <ul style={{ color: "#718096", fontSize: "0.875rem", paddingLeft: "1.5rem", lineHeight: "1.8" }}>
            <li>Questions aligned with selected grade level and state standards</li>
            <li>Each question tagged with specific standard code</li>
            <li>Automatic tracking of student performance by standard</li>
            <li>Historical data analysis and trend predictions</li>
            <li>Identify standards needing additional instruction</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CreateTest;
