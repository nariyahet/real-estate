import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import CinematicTransition from "../components/3D/CinematicTransition";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState(() => localStorage.getItem("remember_email") || "");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(() => Boolean(localStorage.getItem("remember_email")));
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCinematic, setShowCinematic] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);

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

      // Remember me preference
      if (rememberMe) {
        localStorage.setItem("remember_email", cleanEmail);
      } else {
        localStorage.removeItem("remember_email");
      }

      // Store auth session
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      // Trigger Cinematic 3D Architectural Transition
      setShowCinematic(true);
    } catch (err) {
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
    <div className="estate-login-wrapper">
      {showCinematic && (
        <CinematicTransition
          onComplete={() => navigate("/dashboard", { replace: true })}
        />
      )}

      {/* Cinematic Luxury Real Estate Background & Overlays */}
      <div className="estate-bg-image" aria-hidden="true" />
      <div className="estate-bg-overlay" aria-hidden="true" />
      <div className="estate-ambient-orb orb-1" aria-hidden="true" />
      <div className="estate-ambient-orb orb-2" aria-hidden="true" />

      <div className="estate-split-layout">
        {/* Left Side: Brand Narrative & Portfolio Showcase */}
        <section className="estate-hero-section">
          <div className="estate-brand-badge-row">
            <div className="estate-brand-logo-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 21h18"/>
                <path d="M5 21V7l8-4v18"/>
                <path d="M19 21V11l-6-4"/>
                <path d="M9 9h1"/>
                <path d="M9 13h1"/>
                <path d="M9 17h1"/>
              </svg>
            </div>
            <div className="estate-brand-text-block">
              <span className="estate-brand-name">RealEstate</span>
              <span className="estate-brand-tag">Architectural SaaS Platform</span>
            </div>
          </div>

          <div className="estate-hero-content">
            <div className="estate-hero-pill">
              <span className="estate-pill-dot" />
              <span>Next-Gen Real Estate Intelligence</span>
            </div>

            <h1 className="estate-hero-title">
              The Architectural Platform for <span className="estate-gradient-text">Elite Portfolios</span>
            </h1>

            <p className="estate-hero-description">
              Seamlessly orchestrate luxury property acquisitions, tenant relations, and multi-asset analytics within an enterprise-grade command center.
            </p>

            {/* Platform Live Metrics */}
            <div className="estate-metrics-grid">
              <div className="estate-metric-card">
                <span className="estate-metric-value">$2.4B+</span>
                <span className="estate-metric-label">Assets Managed</span>
              </div>
              <div className="estate-metric-card">
                <span className="estate-metric-value">4,800+</span>
                <span className="estate-metric-label">Luxury Properties</span>
              </div>
              <div className="estate-metric-card">
                <span className="estate-metric-value">99.8%</span>
                <span className="estate-metric-label">System Uptime</span>
              </div>
            </div>

            {/* Enterprise Trust Pill */}
            <div className="estate-trust-footer">
              <div className="estate-trust-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <path d="m9 12 2 2 4-4"/>
                </svg>
              </div>
              <div className="estate-trust-info">
                <strong>Bank-Grade Encryption</strong>
                <span>SOC-2 Type II Certified • Multi-tenant Isolation</span>
              </div>
            </div>
          </div>
        </section>

        {/* Right Side: Glassmorphism Login Card */}
        <section className="estate-form-section">
          <div className="estate-glass-card">
            {/* Top Card Header */}
            <div className="estate-card-top">
              <div className="estate-card-brand-mini">
                <div className="estate-mini-badge">🏢</div>
                <div>
                  <h2 className="estate-card-title">Welcome Back</h2>
                  <p className="estate-card-subtitle">Enter your credentials to access your workspace</p>
                </div>
              </div>

              {/* Sign In / Sign Up Mode Switcher Tabs */}
              <div className="estate-tabs" role="tablist" aria-label="Authentication mode">
                <button
                  type="button"
                  role="tab"
                  aria-selected="true"
                  className="estate-tab active"
                  id="tab-signin"
                >
                  Sign In
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected="false"
                  className="estate-tab"
                  id="tab-signup"
                  onClick={() => navigate("/register")}
                >
                  Sign Up
                </button>
              </div>
            </div>

            {/* Error Notification */}
            {error && (
              <div className="estate-error-alert" role="alert">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="estate-alert-icon">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="estate-login-form" noValidate>
              {/* Email Field */}
              <div className="estate-field-group">
                <label htmlFor="login-email" className="estate-field-label">
                  Work Email
                </label>
                <div className="estate-input-wrapper">
                  <span className="estate-input-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="16" x="2" y="4" rx="2"/>
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                    </svg>
                  </span>
                  <input
                    id="login-email"
                    type="email"
                    className="estate-input"
                    placeholder="e.g. admin@realestate.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="estate-field-group">
                <div className="estate-field-label-row">
                  <label htmlFor="login-password" className="estate-field-label">
                    Password
                  </label>
                </div>
                <div className="estate-input-wrapper">
                  <span className="estate-input-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    className="estate-input estate-input-pw"
                    placeholder="Enter your workspace password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="estate-pw-toggle"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((prev) => !prev)}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
                        <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
                        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
                        <line x1="2" y1="2" x2="22" y2="22"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password Row */}
              <div className="estate-form-options">
                <label className="estate-checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="estate-checkbox"
                    id="remember-me-checkbox"
                  />
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  className="estate-forgot-btn"
                  onClick={() => setShowForgotModal(true)}
                  id="forgot-password-link"
                >
                  Forgot password?
                </button>
              </div>

              {/* Primary Purple CTA Button */}
              <button
                type="submit"
                className="estate-submit-btn"
                disabled={loading}
                id="login-submit-button"
              >
                {loading ? (
                  <span className="estate-btn-spinner-wrap">
                    <span className="estate-spinner" aria-hidden="true" />
                    <span>Authenticating...</span>
                  </span>
                ) : (
                  <span className="estate-btn-content">
                    <span>Sign In to Workspace</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14"/>
                      <path d="m12 5 7 7-7 7"/>
                    </svg>
                  </span>
                )}
              </button>

              {/* Navigation Links */}
              <div className="estate-card-footer">
                <p className="estate-footer-signup">
                  Don't have an account?{" "}
                  <Link to="/register" className="estate-link-accent" id="register-nav-link">
                    Create an account
                  </Link>
                </p>

                <div className="estate-footer-divider">
                  <span />
                  <span>or</span>
                  <span />
                </div>

                <p className="estate-footer-guest">
                  <Link to="/properties" className="estate-link-guest" id="guest-browse-link">
                    Browse properties as guest →
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </section>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="estate-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="forgot-modal-title">
          <div className="estate-modal-card">
            <div className="estate-modal-header">
              <div className="estate-modal-icon-wrap">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <div>
                <h3 id="forgot-modal-title" className="estate-modal-title">Password Assistance</h3>
                <p className="estate-modal-subtitle">Enterprise Workspace Recovery</p>
              </div>
              <button
                type="button"
                className="estate-modal-close"
                onClick={() => setShowForgotModal(false)}
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <div className="estate-modal-body">
              <p>
                To reset your workspace credentials or restore access, please contact your organization's RealEstate workspace administrator.
              </p>
              <div className="estate-modal-tip">
                <strong>Standard Demo Account:</strong>
                <code>Email: admin@realestate.com</code>
                <code>Password: Demo@123</code>
              </div>
            </div>

            <div className="estate-modal-footer">
              <button
                type="button"
                className="estate-modal-btn"
                onClick={() => setShowForgotModal(false)}
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;
