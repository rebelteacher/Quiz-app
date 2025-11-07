import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StudentReport = ({ user }) => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, [studentId]);

  const fetchReport = async () => {
    try {
      const response = await axios.get(`${API}/reports/student/${studentId}`);
      setReport(response.data);
    } catch (e) {
      toast.error("Failed to load student report");
      navigate("/teacher");
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

  if (!report) return null;

  return (
    <div className="dashboard" data-testid="student-report-page">
      <div className="dashboard-header">
        <div className="header-left">
          <h1>{report.student_name}'s Performance</h1>
          <p>{report.student_email}</p>
        </div>
        <div className="header-right">
          <button className="btn btn-secondary" onClick={() => navigate(-1)} data-testid="back-btn">
            ← Back
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
        {/* Overview Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
          <div style={{ background: "white", padding: "1.5rem", borderRadius: "16px", boxShadow: "0 4px 15px rgba(0,0,0,0.08)" }}>
            <div style={{ fontSize: "0.875rem", color: "#718096", marginBottom: "0.5rem" }}>Tests Completed</div>
            <div style={{ fontSize: "2rem", fontWeight: "700", color: "#2d3748" }}>{report.total_tests}</div>
          </div>
          <div style={{ background: "white", padding: "1.5rem", borderRadius: "16px", boxShadow: "0 4px 15px rgba(0,0,0,0.08)" }}>
            <div style={{ fontSize: "0.875rem", color: "#718096", marginBottom: "0.5rem" }}>Average Score</div>
            <div style={{ fontSize: "2rem", fontWeight: "700", color: "#ff8c42" }}>{report.average_score}%</div>
          </div>
        </div>

        {/* Overall Standards Performance */}
        <div style={{ background: "white", padding: "2rem", borderRadius: "16px", boxShadow: "0 4px 15px rgba(0,0,0,0.08)", marginBottom: "2rem" }}>
          <h2 style={{ marginBottom: "1.5rem" }}>Overall Standards Performance</h2>
          {Object.keys(report.overall_standards_performance).length === 0 ? (
            <p style={{ color: "#718096", textAlign: "center", padding: "2rem" }}>No standards data available</p>
          ) : (
            <div style={{ display: "grid", gap: "1rem" }}>
              {Object.entries(report.overall_standards_performance)
                .sort((a, b) => b[1].percentage - a[1].percentage)
                .map(([standard, stats]) => (
                  <div key={standard} style={{ border: "2px solid #e2e8f0", borderRadius: "12px", padding: "1rem" }} data-testid={`standard-${standard}`}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                      <div>
                        <div style={{ fontWeight: "600", color: "#2d3748" }}>{standard}</div>
                        <div style={{ fontSize: "0.875rem", color: "#718096" }}>
                          {stats.correct} / {stats.total} correct across {stats.tests_count} test{stats.tests_count !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div style={{ fontSize: "1.5rem", fontWeight: "700", color: stats.percentage >= 70 ? "#10b981" : stats.percentage >= 50 ? "#f59e0b" : "#ef4444" }}>
                        {stats.percentage}%
                      </div>
                    </div>
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
                ))}
            </div>
          )}
        </div>

        {/* Test History */}
        <div style={{ background: "white", padding: "2rem", borderRadius: "16px", boxShadow: "0 4px 15px rgba(0,0,0,0.08)" }}>
          <h2 style={{ marginBottom: "1.5rem" }}>Test History</h2>
          {report.test_history.length === 0 ? (
            <p style={{ color: "#718096", textAlign: "center", padding: "2rem" }}>No tests completed yet</p>
          ) : (
            <div style={{ display: "grid", gap: "1rem" }}>
              {report.test_history.map((test) => (
                <div key={test.test_id} style={{ border: "2px solid #e2e8f0", borderRadius: "12px", padding: "1rem" }} data-testid={`test-${test.test_id}`}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.75rem" }}>
                    <div>
                      <div style={{ fontWeight: "600", color: "#2d3748", marginBottom: "0.25rem" }}>{test.test_title}</div>
                      <div style={{ fontSize: "0.75rem", color: "#718096" }}>
                        {new Date(test.submitted_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ fontSize: "1.25rem", fontWeight: "700", color: test.score >= 70 ? "#10b981" : test.score >= 50 ? "#f59e0b" : "#ef4444" }}>
                      {test.score}%
                    </div>
                  </div>
                  
                  {/* Standards breakdown for this test */}
                  <div style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "#718096", marginBottom: "0.5rem" }}>Standards:</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                      {Object.entries(test.standards_breakdown).map(([standard, stats]) => (
                        <div
                          key={standard}
                          style={{
                            padding: "0.375rem 0.75rem",
                            background: stats.percentage >= 70 ? "#d1fae5" : stats.percentage >= 50 ? "#fef3c7" : "#fee2e2",
                            color: stats.percentage >= 70 ? "#065f46" : stats.percentage >= 50 ? "#92400e" : "#991b1b",
                            borderRadius: "6px",
                            fontSize: "0.8125rem",
                            fontWeight: "500"
                          }}
                        >
                          {standard}: {stats.percentage}%
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentReport;
