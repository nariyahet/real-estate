import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import CinematicTransition from "../components/3D/CinematicTransition";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCinematic, setShowCinematic] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();

    setError("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError("Email and password are required.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/auth/login", {
        email: cleanEmail,
        password,
      });

      if (!response.data?.success || !response.data?.token) {
        setError(
          response.data?.message ||
            "Login failed. Please check your email and password.",
        );
        return;
      }

      const { token, user } = response.data;

      if (!user) {
        setError("User information was not returned by the server.");
        return;
      }

      // Preserve existing token/session handling
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      // Trigger Cinematic 3D Architectural Transition
      setShowCinematic(true);
    } catch (err) {
      console.error("Login Error:", err);

      if (err.response) {
        setError(
          err.response.data?.message ||
            "Login failed. Please check your email and password.",
        );
      } else if (err.request) {
        setError("Could not connect to backend server. Please check your connection.");
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {showCinematic && (
        <CinematicTransition
          onComplete={() => navigate("/dashboard", { replace: true })}
        />
      )}

      {/* Ambient background architectural glow */}
      <div className="login-ambient-bg" />

      <div className="login-card">
        <div className="login-brand-header">
          <div className="login-logo-badge">🏢</div>
          <div>
            <h1>RealEstate</h1>
            <span className="login-brand-subtitle">Architectural SaaS Platform</span>
          </div>
        </div>

        <p className="login-intro-text">Sign in to your real estate workspace</p>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">Work Email</label>
            <input
              id="email"
              type="email"
              placeholder="e.g. admin@realestate.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter your account password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? "Authenticating..." : "Sign In to Workspace →"}
          </button>

          <div className="auth-switch">
            <p>
              Don't have an account? <Link to="/register">Create an account</Link>
            </p>
            <p className="browse-link-wrap">
              <Link to="/properties">Browse properties as guest →</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;
