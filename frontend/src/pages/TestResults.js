import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TestResults = ({ user }) => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [submission, setSubmission] = useState(null);
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, [testId]);

  const fetchResults = async () => {
    try {
      const [submissionRes, testRes] = await Promise.all([
        axios.get(`${API}/submissions/student/${testId}`),
        axios.get(`${API}/tests/${testId}`)
      ]);
      setSubmission(submissionRes.data);
      setTest(testRes.data);
    } catch (e) {
      toast.error("Failed to load results");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!submission || !test) return null;

  const getScoreClass = (score) => {
    if (score >= 80) return "excellent";
    if (score >= 60) return "good";
    return "needs-improvement";
  };

  const getScoreMessage = (score) => {
    if (score >= 80) return "Excellent work!";
    if (score >= 60) return "Good job!";
    return "Keep practicing!";
  };

  return (
    <div className="dashboard" data-testid="test-results-page">
      <div className="results-container">
        <div className="dashboard-header" style={{ marginBottom: "2rem" }}>
          <div className="header-left">
            <h1>Test Results</h1>
            <p>{test.title}</p>
          </div>
          <div className="header-right">
            <button className="btn btn-secondary" onClick={() => navigate("/dashboard")} data-testid="back-dashboard-btn">
              ← Back to Dashboard
            </button>
          </div>
        </div>

        <div className="score-card" data-testid="score-card">
          <div className={`score-circle ${getScoreClass(submission.score)}`} data-testid="score-display">
            {submission.score}%
          </div>
          <h2 style={{ fontSize: "1.875rem", color: "#2d3748", marginBottom: "0.5rem" }}>
            {getScoreMessage(submission.score)}
          </h2>
          <p style={{ color: "#718096" }}>
            You answered {Math.round((submission.score / 100) * test.questions.length)} out of {test.questions.length} questions correctly
          </p>
        </div>

        <div className="standards-breakdown">
          <h2 style={{ marginBottom: "1.5rem" }}>Performance by Standard</h2>
          {Object.keys(submission.standards_breakdown).map(standard => {
            const stats = submission.standards_breakdown[standard];
            return (
              <div key={standard} className="standard-item" data-testid={`standard-${standard}`}>
                <div className="standard-header">
                  <div className="standard-name">{standard}</div>
                  <div className="standard-percentage">{stats.percentage}%</div>
                </div>
                <div className="standard-stats">
                  {stats.correct} / {stats.total} correct
                </div>
                <div style={{ marginTop: "0.5rem" }}>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ 
                        width: `${stats.percentage}%`,
                        background: stats.percentage >= 70 ? "linear-gradient(90deg, #10b981 0%, #34d399 100%)" : stats.percentage >= 50 ? "linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)" : "linear-gradient(90deg, #ef4444 0%, #f87171 100%)"
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: "center", marginTop: "2rem" }}>
          <button className="btn btn-primary" onClick={() => navigate("/dashboard")} data-testid="finish-btn">
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default TestResults;
