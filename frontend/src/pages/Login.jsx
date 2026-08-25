import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import "./Login.css";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      if (user.role === "admin") {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/properties", { replace: true });
      }
    } catch (err) {
      console.error("Login Error:", err);

      if (err.response) {
        setError(
          err.response.data?.message ||
            "Login failed. Please check your email and password.",
        );
      } else if (err.request) {
        setError("Backend server સાથે connection થઈ શક્યું નથી.");
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>RealEstate</h1>
        <p>Login to your account</p>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">Email</label>

            <input
              id="email"
              type="email"
              placeholder="Enter your email"
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
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;
