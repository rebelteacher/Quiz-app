import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TestPreview = ({ user }) => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [numMoreQuestions, setNumMoreQuestions] = useState(5);

  useEffect(() => {
    fetchTest();
  }, [testId]);

  const fetchTest = async () => {
    try {
      const response = await axios.get(`${API}/tests/${testId}`);
      setTest(response.data);
    } catch (e) {
      toast.error("Failed to load test");
      navigate("/teacher");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (questionId, e) => {
    // Prevent any event bubbling
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    try {
      const response = await axios.delete(`${API}/tests/${testId}/questions/${questionId}`, {
        withCredentials: true
      });
      console.log("Delete response:", response.data);
      toast.success("Question removed");
      fetchTest();
    } catch (e) {
      console.error("Delete question error:", e.response?.data || e.message);
      toast.error(e.response?.data?.detail || "Failed to remove question. Please try again.");
    }
  };

  const handleGenerateMore = async () => {
    setGenerating(true);
    try {
      const formData = new FormData();
      formData.append("num_questions", numMoreQuestions.toString());
      
      const response = await axios.post(`${API}/tests/${testId}/generate-more`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      setTest(response.data);
      toast.success(`${numMoreQuestions} more questions added!`);
    } catch (e) {
      toast.error("Failed to generate more questions");
    } finally {
      setGenerating(false);
    }
  };

  const handlePublish = async () => {
    if (test.questions.length === 0) {
      toast.error("Cannot publish test with no questions");
      return;
    }
    
    try {
      await axios.put(`${API}/tests/${testId}/publish`);
      toast.success("Test published! You can now assign it to students.");
      navigate("/teacher");
    } catch (e) {
      toast.error("Failed to publish test");
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!test) return null;

  return (
    <div className="dashboard" data-testid="test-preview-page">
      <div className="dashboard-header">
        <div className="header-left">
          <h1>{test.title}</h1>
          <p>{test.questions.length} questions • Preview & Edit</p>
        </div>
        <div className="header-right">
          <button className="btn btn-secondary" onClick={() => navigate("/teacher")} data-testid="back-btn">
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handlePublish} data-testid="publish-btn">
            Publish Test
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        {/* Generate More Section */}
        <div style={{ 
          background: "white", 
          padding: "1.5rem", 
          borderRadius: "16px", 
          boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
          marginBottom: "2rem",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          flexWrap: "wrap"
        }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: "1rem", marginBottom: "0.25rem" }}>Need more questions?</h3>
            <p style={{ fontSize: "0.875rem", color: "#718096", margin: 0 }}>Generate additional questions for this test</p>
          </div>
          <input
            type="number"
            value={numMoreQuestions}
            onChange={(e) => setNumMoreQuestions(parseInt(e.target.value) || 5)}
            min="1"
            max="20"
            style={{
              width: "80px",
              padding: "0.5rem",
              border: "2px solid #e2e8f0",
              borderRadius: "8px",
              fontSize: "1rem"
            }}
            data-testid="num-more-questions-input"
          />
          <button 
            className="btn btn-primary" 
            onClick={handleGenerateMore}
            disabled={generating}
            style={{ minWidth: "140px" }}
            data-testid="generate-more-btn"
          >
            {generating ? "Generating..." : "Generate More"}
          </button>
        </div>

        {/* Questions List */}
        <div style={{ display: "grid", gap: "1rem" }}>
          {test.questions.map((question, index) => (
            <div 
              key={question.id} 
              style={{
                background: "white",
                padding: "1.5rem",
                borderRadius: "16px",
                boxShadow: "0 4px 15px rgba(0,0,0,0.08)",
                border: "2px solid #e2e8f0"
              }}
              data-testid={`question-preview-${index}`}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1rem" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginBottom: "0.5rem" }}>
                    <span style={{ fontWeight: "600", color: "#ff8c42", fontSize: "0.875rem" }}>Q{index + 1}</span>
                    <span style={{ fontSize: "0.75rem", color: "#718096", background: "#f7fafc", padding: "0.25rem 0.75rem", borderRadius: "50px" }}>
                      {question.standard}
                    </span>
                  </div>
                  <p style={{ fontSize: "1.125rem", color: "#2d3748", margin: 0, lineHeight: 1.6 }}>
                    {question.question_text}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteQuestion(question.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ef4444",
                    cursor: "pointer",
                    fontSize: "1.25rem",
                    padding: "0.5rem",
                    lineHeight: 1
                  }}
                  data-testid={`delete-question-${index}`}
                  title="Remove question"
                >
                  ×
                </button>
              </div>
              
              <div style={{ display: "grid", gap: "0.75rem", marginTop: "1rem" }}>
                {question.options.map((option, optIndex) => (
                  <div
                    key={optIndex}
                    style={{
                      padding: "0.75rem 1rem",
                      background: optIndex === question.correct_answer ? "#d1fae5" : "#f7fafc",
                      borderRadius: "8px",
                      border: optIndex === question.correct_answer ? "2px solid #10b981" : "2px solid transparent",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem"
                    }}
                  >
                    <span style={{ fontWeight: "600", color: optIndex === question.correct_answer ? "#10b981" : "#718096" }}>
                      {String.fromCharCode(65 + optIndex)}.
                    </span>
                    <span style={{ color: "#2d3748" }}>{option}</span>
                    {optIndex === question.correct_answer && (
                      <span style={{ marginLeft: "auto", color: "#10b981", fontSize: "0.875rem", fontWeight: "600" }}>✓ Correct</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {test.questions.length === 0 && (
          <div className="empty-state" data-testid="no-questions">
            <div className="empty-icon">📝</div>
            <h3>No Questions Yet</h3>
            <p>Generate questions to start building your test</p>
          </div>
        )}

        {/* Bottom Actions */}
        <div style={{ marginTop: "2rem", display: "flex", gap: "1rem", justifyContent: "center" }}>
          <button className="btn btn-secondary" onClick={() => navigate("/teacher")} data-testid="cancel-bottom-btn">
            Cancel
          </button>
          <button className="btn btn-primary" onClick={handlePublish} data-testid="publish-bottom-btn">
            Publish Test ({test.questions.length} questions)
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestPreview;
