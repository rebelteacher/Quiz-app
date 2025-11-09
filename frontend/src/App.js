import { useEffect, useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import { Toaster, toast } from "sonner";

// Configure axios to send credentials with all requests
axios.defaults.withCredentials = true;

// Import pages
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import CreateTest from "./pages/CreateTest";
import TestPreview from "./pages/TestPreview";
import ClassManagement from "./pages/ClassManagement";
import TestReport from "./pages/TestReport";
import StudentReport from "./pages/StudentReport";
import TakeTest from "./pages/TakeTest";
import TestResults from "./pages/TestResults";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    // Check for session_id in URL fragment
    const fragment = window.location.hash;
    if (fragment.includes("session_id=")) {
      const sessionId = fragment.split("session_id=")[1].split("&")[0];
      await processSessionId(sessionId);
      // Clean URL
      window.location.hash = "";
      return;
    }

    // Check existing session
    try {
      const response = await axios.get(`${API}/auth/me`);
      setUser(response.data);
    } catch (e) {
      // Not authenticated
    } finally {
      setLoading(false);
    }
  };

  const processSessionId = async (sessionId) => {
    try {
      const response = await axios.post(
        `${API}/auth/session`,
        {},
        { headers: { "X-Session-ID": sessionId } }
      );
      setUser(response.data);
      toast.success(`Welcome, ${response.data.name}!`);
    } catch (e) {
      toast.error("Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, {
        withCredentials: true
      });
      setUser(null);
      toast.success("Logged out successfully");
      // Redirect to landing page
      window.location.href = "/";
    } catch (e) {
      console.error("Logout error:", e);
      // Still log them out on frontend even if backend fails
      setUser(null);
      window.location.href = "/";
    }
  };

  const updateUserRole = (role) => {
    setUser({ ...user, role });
  };

  if (loading) {
    return (
      <div className="loading-screen" data-testid="loading-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="App">
      <Toaster position="top-center" richColors />
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              user ? (
                <Navigate
                  to={user.role === "teacher" ? "/teacher" : "/dashboard"}
                />
              ) : (
                <LandingPage />
              )
            }
          />
          <Route
            path="/dashboard"
            element={
              user ? (
                <Dashboard user={user} logout={logout} updateUserRole={updateUserRole} />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/teacher"
            element={
              user && user.role === "teacher" ? (
                <TeacherDashboard user={user} logout={logout} />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/teacher/create"
            element={
              user && user.role === "teacher" ? (
                <CreateTest user={user} />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/teacher/preview/:testId"
            element={
              user && user.role === "teacher" ? (
                <TestPreview user={user} />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/teacher/classes"
            element={
              user && user.role === "teacher" ? (
                <ClassManagement user={user} />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/teacher/reports/:testId"
            element={
              user && user.role === "teacher" ? (
                <TestReport user={user} />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/teacher/reports/student/:studentId"
            element={
              user && user.role === "teacher" ? (
                <StudentReport user={user} />
              ) : (
                <Navigate to="/" />
              )
            }
          />
          <Route
            path="/test/:testId"
            element={
              user ? <TakeTest user={user} /> : <Navigate to="/" />
            }
          />
          <Route
            path="/results/:testId"
            element={
              user ? <TestResults user={user} /> : <Navigate to="/" />
            }
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
