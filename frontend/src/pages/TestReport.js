import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TestReport = ({ user }) => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedStandard, setSelectedStandard] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    fetchReport();
  }, [testId]);

  const fetchReport = async () => {
    try {
      const response = await axios.get(`${API}/reports/test/${testId}`);
      setReport(response.data);
    } catch (e) {
      toast.error("Failed to load report");
      navigate("/teacher");
    } finally {
      setLoading(false);
    }
  };

  const viewStudentReport = (studentId) => {
    navigate(`/teacher/reports/student/${studentId}`);
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!report) return null;

  const getProficiencyColor = (level) => {
    const colors = {
      advanced: "#10b981",
      proficient: "#3b82f6",
      basic: "#f59e0b",
      below_basic: "#ef4444"
    };
    return colors[level] || "#718096";
  };

  const getProficiencyLabel = (level) => {
    const labels = {
      advanced: "Advanced (90-100%)",
      proficient: "Proficient (70-89%)",
      basic: "Basic (50-69%)",
      below_basic: "Below Basic (0-49%)"
    };
    return labels[level] || level;
  };

  return (
    <div className="dashboard" data-testid="test-report-page">
      <div className="dashboard-header">
        <div className="header-left">
          <h1>{report.test_title} - Report</h1>
          <p>Comprehensive test analysis</p>
        </div>
        <div className="header-right">
          <button className="btn btn-secondary" onClick={() => navigate("/teacher")} data-testid="back-btn">
            ← Back
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Overview Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
          <div style={{ background: "white", padding: "1.5rem", borderRadius: "16px", boxShadow: "0 4px 15px rgba(0,0,0,0.08)" }}>
            <div style={{ fontSize: "0.875rem", color: "#718096", marginBottom: "0.5rem" }}>Total Submissions</div>
            <div style={{ fontSize: "2rem", fontWeight: "700", color: "#2d3748" }}>{report.total_submissions}</div>
          </div>
          <div style={{ background: "white", padding: "1.5rem", borderRadius: "16px", boxShadow: "0 4px 15px rgba(0,0,0,0.08)" }}>
            <div style={{ fontSize: "0.875rem", color: "#718096", marginBottom: "0.5rem" }}>Class Average</div>
            <div style={{ fontSize: "2rem", fontWeight: "700", color: "#ff8c42" }}>{report.class_average}%</div>
          </div>
        </div>

        {/* Overall Proficiency Groups */}
        <div style={{ background: "white", padding: "2rem", borderRadius: "16px", boxShadow: "0 4px 15px rgba(0,0,0,0.08)", marginBottom: "2rem" }}>
          <h2 style={{ marginBottom: "1.5rem" }}>Student Proficiency Levels</h2>
          <div style={{ display: "grid", gap: "1rem" }}>
            {Object.entries(report.proficiency_groups).map(([level, students]) => (
              <div key={level} style={{ border: "2px solid #e2e8f0", borderRadius: "12px", padding: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <h3 style={{ fontSize: "1rem", color: getProficiencyColor(level), margin: 0 }}>
                    {getProficiencyLabel(level)}
                  </h3>
                  <span style={{ fontSize: "0.875rem", fontWeight: "600", color: "#718096" }}>
                    {students.length} students
                  </span>
                </div>
                {students.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    {students.map((student) => (
                      <div
                        key={student.id}
                        onClick={() => viewStudentReport(student.id)}
                        style={{
                          padding: "0.5rem 1rem",
                          background: "#f7fafc",
                          borderRadius: "8px",
                          fontSize: "0.875rem",
                          cursor: "pointer",
                          border: "1px solid #e2e8f0",
                          transition: "all 0.2s"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#edf2f7";
                          e.currentTarget.style.borderColor = "#cbd5e0";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#f7fafc";
                          e.currentTarget.style.borderColor = "#e2e8f0";
                        }}
                        data-testid={`student-${student.id}`}
                      >
                        {student.name} ({student.score}%)
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Standards Overview */}
        <div style={{ background: "white", padding: "2rem", borderRadius: "16px", boxShadow: "0 4px 15px rgba(0,0,0,0.08)", marginBottom: "2rem" }}>
          <h2 style={{ marginBottom: "1.5rem" }}>Standards Performance</h2>
          <div style={{ display: "grid", gap: "1rem" }}>
            {Object.entries(report.standards_overview).map(([standard, stats]) => (
              <div
                key={standard}
                onClick={() => setSelectedStandard(selectedStandard === standard ? null : standard)}
                style={{
                  border: "2px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "1rem",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                data-testid={`standard-${standard}`}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: "600", color: "#2d3748", marginBottom: "0.25rem" }}>{standard}</div>
                    <div style={{ fontSize: "0.875rem", color: "#718096" }}>
                      {stats.correct} / {stats.total} correct
                    </div>
                  </div>
                  <div style={{ fontSize: "1.5rem", fontWeight: "700", color: stats.percentage >= 70 ? "#10b981" : stats.percentage >= 50 ? "#f59e0b" : "#ef4444" }}>
                    {stats.percentage}%
                  </div>
                </div>
                <div style={{ marginTop: "0.75rem" }}>
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

                {/* Standard Proficiency Groups */}
                {selectedStandard === standard && (
                  <div style={{ marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid #e2e8f0" }}>
                    <h4 style={{ fontSize: "0.875rem", fontWeight: "600", color: "#718096", marginBottom: "1rem" }}>
                      Student Performance on {standard}
                    </h4>
                    <div style={{ display: "grid", gap: "0.75rem" }}>
                      {Object.entries(report.standards_proficiency_groups[standard] || {}).map(([level, students]) => (
                        students.length > 0 && (
                          <div key={level}>
                            <div style={{ fontSize: "0.75rem", fontWeight: "600", color: getProficiencyColor(level), marginBottom: "0.5rem" }}>
                              {getProficiencyLabel(level)} ({students.length})
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                              {students.map((student) => (
                                <div
                                  key={student.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    viewStudentReport(student.id);
                                  }}
                                  style={{
                                    padding: "0.375rem 0.75rem",
                                    background: "#f7fafc",
                                    borderRadius: "6px",
                                    fontSize: "0.8125rem",
                                    cursor: "pointer"
                                  }}
                                >
                                  {student.name} ({student.percentage}%)
                                </div>
                              ))}
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Individual Student Results */}
        <div style={{ background: "white", padding: "2rem", borderRadius: "16px", boxShadow: "0 4px 15px rgba(0,0,0,0.08)" }}>
          <h2 style={{ marginBottom: "1.5rem" }}>Individual Results</h2>
          <div style={{ display: "grid", gap: "1rem" }}>
            {report.student_results.map((result) => (
              <div
                key={result.id}
                onClick={() => viewStudentReport(result.student_id)}
                style={{
                  padding: "1rem",
                  border: "2px solid #e2e8f0",
                  borderRadius: "12px",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "#ff8c42"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "#e2e8f0"}
                data-testid={`result-${result.student_id}`}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: "600", color: "#2d3748" }}>{result.student_name}</div>
                    <div style={{ fontSize: "0.875rem", color: "#718096" }}>{result.student_email}</div>
                  </div>
                  <div style={{ fontSize: "1.5rem", fontWeight: "700", color: result.score >= 70 ? "#10b981" : result.score >= 50 ? "#f59e0b" : "#ef4444" }}>
                    {result.score}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestReport;
