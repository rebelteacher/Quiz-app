import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Analytics = ({ user }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [selectedStandard, setSelectedStandard] = useState(null);
  const [prediction, setPrediction] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API}/analytics/standards-over-time`);
      console.log("Analytics data:", response.data);
      setAnalyticsData(response.data);
    } catch (e) {
      console.error("Failed to load analytics:", e);
      toast.error("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  };

  const fetchPrediction = async (standard) => {
    try {
      const response = await axios.get(`${API}/analytics/predictions/${encodeURIComponent(standard)}`);
      setPrediction(response.data);
      setSelectedStandard(standard);
    } catch (e) {
      toast.error("Failed to load prediction");
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!analyticsData || analyticsData.standards.length === 0) {
    return (
      <div className="dashboard" data-testid="analytics-page">
        <div className="dashboard-header">
          <div className="header-left">
            <h1>Analytics & Trends</h1>
            <p>Data-driven insights for student success</p>
          </div>
          <div className="header-right">
            <button className="btn btn-secondary" onClick={() => navigate("/teacher")} data-testid="back-btn">
              ← Back
            </button>
          </div>
        </div>

        <div className="empty-state">
          <div className="empty-icon">📊</div>
          <h3>No Data Yet</h3>
          <p>Analytics will appear once students start taking tests</p>
        </div>
      </div>
    );
  }

  const getTrendColor = (trend) => {
    const colors = {
      improving: "#10b981",
      stable: "#3b82f6",
      declining: "#ef4444",
      insufficient_data: "#9ca3af"
    };
    return colors[trend] || "#9ca3af";
  };

  const getTrendIcon = (trend) => {
    const icons = {
      improving: "↗",
      stable: "→",
      declining: "↘",
      insufficient_data: "•"
    };
    return icons[trend] || "•";
  };

  return (
    <div className="dashboard" data-testid="analytics-page">
      <div className="dashboard-header">
        <div className="header-left">
          <h1>Analytics & Trends</h1>
          <p>Comprehensive data analysis and predictions</p>
        </div>
        <div className="header-right">
          <button className="btn btn-secondary" onClick={() => navigate("/teacher")} data-testid="back-btn">
            ← Back
          </button>
        </div>
      </div>

      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Summary Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
          <div style={{ background: "white", padding: "1.5rem", borderRadius: "16px", boxShadow: "0 4px 15px rgba(0,0,0,0.08)" }}>
            <div style={{ fontSize: "0.875rem", color: "#718096", marginBottom: "0.5rem" }}>Total Submissions</div>
            <div style={{ fontSize: "2rem", fontWeight: "700", color: "#2d3748" }}>{analyticsData.summary.total_submissions}</div>
          </div>
          <div style={{ background: "white", padding: "1.5rem", borderRadius: "16px", boxShadow: "0 4px 15px rgba(0,0,0,0.08)" }}>
            <div style={{ fontSize: "0.875rem", color: "#718096", marginBottom: "0.5rem" }}>Standards Tracked</div>
            <div style={{ fontSize: "2rem", fontWeight: "700", color: "#ff8c42" }}>{analyticsData.summary.total_standards_tracked}</div>
          </div>
          <div style={{ background: "white", padding: "1.5rem", borderRadius: "16px", boxShadow: "0 4px 15px rgba(0,0,0,0.08)" }}>
            <div style={{ fontSize: "0.875rem", color: "#718096", marginBottom: "0.5rem" }}>Need Attention</div>
            <div style={{ fontSize: "2rem", fontWeight: "700", color: "#ef4444" }}>
              {analyticsData.summary.standards_needing_attention.length}
            </div>
          </div>
        </div>

        {/* Standards Performance */}
        <div style={{ background: "white", padding: "2rem", borderRadius: "16px", boxShadow: "0 4px 15px rgba(0,0,0,0.08)", marginBottom: "2rem" }}>
          <h2 style={{ marginBottom: "1.5rem" }}>Standards Performance Over Time</h2>
          <div style={{ display: "grid", gap: "1rem" }}>
            {analyticsData.standards.map((standard) => (
              <div
                key={standard.standard}
                onClick={() => fetchPrediction(standard.standard)}
                style={{
                  border: "2px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "1.5rem",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  background: selectedStandard === standard.standard ? "#f7fafc" : "white"
                }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "#ff8c42"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "#e2e8f0"}
                data-testid={`standard-${standard.standard}`}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1rem" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: "600", color: "#2d3748", marginBottom: "0.5rem", fontSize: "1.125rem" }}>
                      {standard.standard}
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#718096" }}>
                      {standard.total_attempts} total attempts • Latest: {standard.latest_performance}%
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "2rem", fontWeight: "700", color: standard.average_performance >= 70 ? "#10b981" : standard.average_performance >= 50 ? "#f59e0b" : "#ef4444" }}>
                      {standard.average_performance}%
                    </div>
                    <div style={{ fontSize: "0.875rem", fontWeight: "600", color: getTrendColor(standard.trend), display: "flex", alignItems: "center", gap: "0.25rem", justifyContent: "flex-end" }}>
                      <span style={{ fontSize: "1.25rem" }}>{getTrendIcon(standard.trend)}</span>
                      {standard.trend.replace("_", " ")}
                    </div>
                  </div>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${standard.average_performance}%`,
                      background: standard.average_performance >= 70 ? "linear-gradient(90deg, #10b981 0%, #34d399 100%)" : standard.average_performance >= 50 ? "linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%)" : "linear-gradient(90deg, #ef4444 0%, #f87171 100%)"
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Prediction Panel */}
        {prediction && (
          <div style={{ background: "white", padding: "2rem", borderRadius: "16px", boxShadow: "0 4px 15px rgba(0,0,0,0.08)" }}>
            <h2 style={{ marginBottom: "1.5rem" }}>📈 Performance Prediction: {prediction.standard}</h2>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
              <div style={{ padding: "1rem", background: "#f7fafc", borderRadius: "12px" }}>
                <div style={{ fontSize: "0.875rem", color: "#718096", marginBottom: "0.5rem" }}>Current Average</div>
                <div style={{ fontSize: "1.75rem", fontWeight: "700", color: "#2d3748" }}>{prediction.current_average}%</div>
              </div>
              <div style={{ padding: "1rem", background: "#f7fafc", borderRadius: "12px" }}>
                <div style={{ fontSize: "0.875rem", color: "#718096", marginBottom: "0.5rem" }}>Predicted Score</div>
                <div style={{ fontSize: "1.75rem", fontWeight: "700", color: prediction.predicted_score >= 70 ? "#10b981" : "#f59e0b" }}>
                  {prediction.predicted_score}%
                </div>
              </div>
              <div style={{ padding: "1rem", background: "#f7fafc", borderRadius: "12px" }}>
                <div style={{ fontSize: "0.875rem", color: "#718096", marginBottom: "0.5rem" }}>Trend</div>
                <div style={{ fontSize: "1.75rem", fontWeight: "700", color: getTrendColor(prediction.trend) }}>
                  {getTrendIcon(prediction.trend)} {prediction.trend}
                </div>
              </div>
              <div style={{ padding: "1rem", background: "#f7fafc", borderRadius: "12px" }}>
                <div style={{ fontSize: "0.875rem", color: "#718096", marginBottom: "0.5rem" }}>Confidence</div>
                <div style={{ fontSize: "1.75rem", fontWeight: "700", color: "#3b82f6" }}>{prediction.confidence}</div>
              </div>
            </div>

            <div style={{ padding: "1.5rem", background: prediction.predicted_score >= 70 ? "#d1fae5" : "#fef3c7", borderRadius: "12px" }}>
              <div style={{ fontWeight: "600", color: prediction.predicted_score >= 70 ? "#065f46" : "#92400e", marginBottom: "0.5rem" }}>
                💡 Recommendation
              </div>
              <div style={{ color: prediction.predicted_score >= 70 ? "#047857" : "#78350f" }}>
                {prediction.recommendation}
              </div>
              <div style={{ fontSize: "0.875rem", color: "#718096", marginTop: "0.5rem" }}>
                Based on {prediction.data_points} data points
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
