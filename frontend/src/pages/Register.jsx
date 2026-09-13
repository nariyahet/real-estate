import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import "./Login.css";

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || !cleanEmail || !password) {
      setError("Name, email and password are required.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/auth/register", {
        name: cleanName,
        email: cleanEmail,
        password,
        phone: phone ? phone.trim() : null,
      });

      if (!response.data?.success || !response.data?.token) {
        setError(response.data?.message || "Registration failed. Please try again.");
        return;
      }

      const { token, user } = response.data;

      if (!user) {
        setError("User information was not returned by the server.");
        return;
      }

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));

      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("Registration Error:", err);

      if (err.response) {
        setError(
          err.response.data?.message ||
            "Registration failed. Please check your details and try again.",
        );
      } else if (err.request) {
        setError("Could not connect to backend server. Please check your connection.");
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>RealEstate</h1>
        <p>Create your account</p>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label htmlFor="reg-name">Full Name *</label>
            <input
              id="reg-name"
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-email">Email *</label>
            <input
              id="reg-email"
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-password">Password *</label>
            <input
              id="reg-password"
              type="password"
              placeholder="Create a password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-phone">Phone Number (Optional)</label>
            <input
              id="reg-phone"
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Register"}
          </button>

          <div className="auth-switch">
            <p>
              Already have an account? <Link to="/">Sign in</Link>
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

export default Register;
