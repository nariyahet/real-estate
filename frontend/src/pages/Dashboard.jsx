import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../App.css";

const API_URL = "http://localhost:5000/api";

function Dashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAgents: 0,
    totalProperties: 0,
    availableProperties: 0,
    soldProperties: 0,
    rentedProperties: 0,
    inactiveProperties: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getHeaders = useCallback(() => {
    const token = localStorage.getItem("token");

    return {
      Authorization: `Bearer ${token}`,
    };
  }, []);

  const fetchDashboardStats = useCallback(async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/", { replace: true });
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await axios.get(`${API_URL}/admin/dashboard-stats`, {
        headers: getHeaders(),
      });

      if (!response.data?.success) {
        setError(
          response.data?.message || "Unable to load dashboard statistics.",
        );
        return;
      }

      const dashboardStats = response.data.stats || {};

      setStats({
        totalUsers: Number(dashboardStats.totalUsers || 0),
        totalAgents: Number(dashboardStats.totalAgents || 0),
        totalProperties: Number(dashboardStats.totalProperties || 0),
        availableProperties: Number(dashboardStats.availableProperties || 0),
        soldProperties: Number(dashboardStats.soldProperties || 0),
        rentedProperties: Number(dashboardStats.rentedProperties || 0),
        inactiveProperties: Number(dashboardStats.inactiveProperties || 0),
      });
    } catch (err) {
      console.error("Dashboard Stats Error:", err);

      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("adminToken");

        navigate("/", { replace: true });
        return;
      }

      setError(
        err.response?.data?.message || "Unable to load dashboard statistics.",
      );
    } finally {
      setLoading(false);
    }
  }, [getHeaders, navigate]);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("adminToken");

    navigate("/", { replace: true });
  };

  return (
    <div className="admin-layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">🏠</div>

          <div>
            <h2>RealEstate</h2>
            <span>Admin Panel</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            type="button"
            className="nav-item active"
            onClick={() => navigate("/dashboard")}
          >
            <span>📊</span>
            Dashboard
          </button>

          <button
            type="button"
            className="nav-item"
            onClick={() => navigate("/users")}
          >
            <span>👥</span>
            Users
          </button>

          <button
            type="button"
            className="nav-item"
            onClick={() => navigate("/agents")}
          >
            <span>🤝</span>
            Agents
          </button>

          <button
            type="button"
            className="nav-item"
            onClick={() => navigate("/properties")}
          >
            <span>🏠</span>
            Properties
          </button>
        </nav>

        <div className="sidebar-bottom">
          <button
            type="button"
            className="nav-item logout-btn"
            onClick={handleLogout}
          >
            <span>🚪</span>
            Logout
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="page-label">REAL ESTATE ADMIN</p>
            <h1>Dashboard</h1>
          </div>

          <div className="admin-profile">
            <div className="profile-avatar">A</div>

            <div>
              <strong>Admin User</strong>
              <span>Administrator</span>
            </div>
          </div>
        </header>

        {error && (
          <div className="error-box">
            <span>{error}</span>

            <button type="button" onClick={() => setError("")}>
              ×
            </button>
          </div>
        )}

        <div className="dashboard-content">
          <div className="welcome-card">
            <div>
              <span>ADMIN PANEL</span>
              <h2>Welcome back, Admin 👋</h2>
              <p>Manage your real estate platform from one place.</p>
            </div>

            <div className="welcome-icon">🏢</div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card-top">
                <div className="stat-icon">👥</div>
              </div>

              <div>
                <div className="stat-value">
                  {loading ? "..." : stats.totalUsers}
                </div>

                <div className="stat-title">Total Users</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-top">
                <div className="stat-icon">🤝</div>
              </div>

              <div>
                <div className="stat-value">
                  {loading ? "..." : stats.totalAgents}
                </div>

                <div className="stat-title">Total Agents</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-top">
                <div className="stat-icon">🏠</div>
              </div>

              <div>
                <div className="stat-value">
                  {loading ? "..." : stats.totalProperties}
                </div>

                <div className="stat-title">Total Properties</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-top">
                <div className="stat-icon">✅</div>
              </div>

              <div>
                <div className="stat-value">
                  {loading ? "..." : stats.availableProperties}
                </div>

                <div className="stat-title">Available Properties</div>
              </div>
            </div>
          </div>

          <div className="overview-section">
            <div className="section-header">
              <div>
                <span>PROPERTY OVERVIEW</span>
                <h2>Property Status</h2>
              </div>

              <button
                type="button"
                className="refresh-btn"
                onClick={fetchDashboardStats}
                disabled={loading}
              >
                {loading ? "Refreshing..." : "↻ Refresh"}
              </button>
            </div>

            <div className="property-status-grid">
              <div className="status-card available">
                <span>Available</span>
                <strong>{loading ? "..." : stats.availableProperties}</strong>
              </div>

              <div className="status-card sold">
                <span>Sold</span>
                <strong>{loading ? "..." : stats.soldProperties}</strong>
              </div>

              <div className="status-card rented">
                <span>Rented</span>
                <strong>{loading ? "..." : stats.rentedProperties}</strong>
              </div>

              <div className="status-card inactive">
                <span>Inactive</span>
                <strong>{loading ? "..." : stats.inactiveProperties}</strong>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
