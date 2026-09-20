import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import DashboardArchitecturalBg from "../components/3D/DashboardArchitecturalBg";
import Card3DTilt from "../components/3D/Card3DTilt";
import "../App.css";

// Animated counter for stat values
function AnimatedNumber({ value, loading }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (loading) return;
    const target = Number(value || 0);
    const start = displayValue;
    if (start === target) return;

    let startTime;
    const duration = 650;

    const step = (now) => {
      if (!startTime) startTime = now;
      const progress = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(start + (target - start) * ease));
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setDisplayValue(target);
      }
    };

    requestAnimationFrame(step);
  }, [value, loading]);

  if (loading) return <span>...</span>;
  return <span>{displayValue}</span>;
}

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

  const [agentProperties, setAgentProperties] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const getUser = () => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  };

  const user = getUser();
  const isAdmin = user?.role === "admin";

  const fetchDashboardStats = useCallback(async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/", { replace: true });
      return;
    }

    try {
      setLoading(true);
      setError("");

      if (isAdmin) {
        const response = await api.get("/admin/dashboard-stats");

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
      } else {
        const response = await api.get("/properties");

        if (!response.data?.success) {
          setError(response.data?.message || "Unable to load properties.");
          return;
        }

        const properties = response.data.properties || [];

        setAgentProperties(properties.length);
      }
    } catch (err) {
      console.error("Dashboard Error:", err);

      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        navigate("/", { replace: true });
        return;
      }

      setError(err.response?.data?.message || "Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [navigate, isAdmin]);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/", { replace: true });
  };

  // Pipeline distribution percentages
  const totalProps = stats.totalProperties || 1;
  const availPct = Math.round((stats.availableProperties / totalProps) * 100);
  const soldPct = Math.round((stats.soldProperties / totalProps) * 100);
  const rentedPct = Math.round((stats.rentedProperties / totalProps) * 100);

  return (
    <div className="admin-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">🏢</div>

          <div>
            <h2>RealEstate</h2>
            <span>{isAdmin ? "Admin Studio" : "Agent Studio"}</span>
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

          {isAdmin && (
            <>
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
            </>
          )}

          <button
            type="button"
            className="nav-item"
            onClick={() => navigate("/properties")}
          >
            <span>🏠</span>
            Properties
          </button>

          <button
            type="button"
            className="nav-item enterprise-nav-item"
            onClick={() => navigate("/enterprise")}
          >
            <span>🚀</span>
            Enterprise Suite
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

      {/* Main Content Area */}
      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="page-label">
              {isAdmin ? "REAL ESTATE SaaS ADMIN" : "REAL ESTATE AGENT WORKSPACE"}
            </p>

            <h1>Executive Dashboard</h1>
          </div>

          <div className="admin-profile">
            <div className="profile-avatar">
              {(user?.name || "U").charAt(0).toUpperCase()}
            </div>

            <div>
              <strong>{user?.name || "User"}</strong>
              <span>{isAdmin ? "Administrator" : "Licensed Agent"}</span>
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
          {/* Welcome Card with 3D Architectural Pavilion Canvas */}
          <div className="welcome-card">
            <div className="welcome-card-content">
              <span>{isAdmin ? "ENTERPRISE PLATFORM OVERVIEW" : "AGENT PORTFOLIO"}</span>

              <h2>Welcome back, {user?.name || "User"} 👋</h2>

              <p>
                {isAdmin
                  ? "Manage high-value architectural listings, agent distributions, and real estate operations from one unified studio."
                  : "Browse architectural portfolios, monitor client inquiries, and manage your property listings with cinematic 3D."}
              </p>
            </div>

            {/* Subtle 3D Architectural Wireframe Pavilion */}
            <DashboardArchitecturalBg height={180} />
          </div>

          {isAdmin ? (
            <>
              {/* Stat Cards with 3D Mouse Tilt */}
              <div className="stats-grid">
                <Card3DTilt>
                  <div className="stat-card">
                    <div className="stat-card-top">
                      <div className="stat-icon">👥</div>
                    </div>

                    <div>
                      <div className="stat-value">
                        <AnimatedNumber value={stats.totalUsers} loading={loading} />
                      </div>

                      <div className="stat-title">Total Users</div>
                    </div>
                  </div>
                </Card3DTilt>

                <Card3DTilt>
                  <div className="stat-card">
                    <div className="stat-card-top">
                      <div className="stat-icon" style={{ background: "#F0FDF4", color: "#16A34A" }}>🤝</div>
                    </div>

                    <div>
                      <div className="stat-value">
                        <AnimatedNumber value={stats.totalAgents} loading={loading} />
                      </div>

                      <div className="stat-title">Total Agents</div>
                    </div>
                  </div>
                </Card3DTilt>

                <Card3DTilt>
                  <div className="stat-card">
                    <div className="stat-card-top">
                      <div className="stat-icon" style={{ background: "#EFF6FF", color: "#2563EB" }}>🏠</div>
                    </div>

                    <div>
                      <div className="stat-value">
                        <AnimatedNumber value={stats.totalProperties} loading={loading} />
                      </div>

                      <div className="stat-title">Total Properties</div>
                    </div>
                  </div>
                </Card3DTilt>

                <Card3DTilt>
                  <div className="stat-card">
                    <div className="stat-card-top">
                      <div className="stat-icon" style={{ background: "#ECFDF5", color: "#059669" }}>✅</div>
                    </div>

                    <div>
                      <div className="stat-value">
                        <AnimatedNumber value={stats.availableProperties} loading={loading} />
                      </div>

                      <div className="stat-title">Available Listings</div>
                    </div>
                  </div>
                </Card3DTilt>
              </div>

              {/* Property Pipeline & Status Overview */}
              <div className="overview-section">
                <div className="section-header">
                  <div>
                    <span>PORTFOLIO DISTRIBUTION</span>
                    <h2>Property Inventory Pipeline</h2>
                  </div>

                  <button
                    type="button"
                    className="refresh-btn"
                    onClick={fetchDashboardStats}
                    disabled={loading}
                  >
                    {loading ? "Refreshing..." : "↻ Refresh Data"}
                  </button>
                </div>

                {/* Visual Ratio Progress Bar */}
                <div
                  style={{
                    height: "10px",
                    background: "#E2E8F0",
                    borderRadius: "999px",
                    overflow: "hidden",
                    display: "flex",
                    marginBottom: "24px",
                  }}
                >
                  <div
                    title={`Available: ${availPct}%`}
                    style={{ width: `${availPct}%`, background: "#10B981", transition: "width 0.6s ease" }}
                  />
                  <div
                    title={`Sold: ${soldPct}%`}
                    style={{ width: `${soldPct}%`, background: "#D4A72C", transition: "width 0.6s ease" }}
                  />
                  <div
                    title={`Rented: ${rentedPct}%`}
                    style={{ width: `${rentedPct}%`, background: "#2563EB", transition: "width 0.6s ease" }}
                  />
                </div>

                <div className="property-status-grid">
                  <div className="status-card available">
                    <span>Available</span>
                    <strong>
                      <AnimatedNumber value={stats.availableProperties} loading={loading} />
                    </strong>
                  </div>

                  <div className="status-card sold">
                    <span>Sold</span>
                    <strong>
                      <AnimatedNumber value={stats.soldProperties} loading={loading} />
                    </strong>
                  </div>

                  <div className="status-card rented">
                    <span>Rented</span>
                    <strong>
                      <AnimatedNumber value={stats.rentedProperties} loading={loading} />
                    </strong>
                  </div>

                  <div className="status-card inactive">
                    <span>Inactive</span>
                    <strong>
                      <AnimatedNumber value={stats.inactiveProperties} loading={loading} />
                    </strong>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="overview-section">
              <div className="section-header">
                <div>
                  <span>PROPERTY MANAGEMENT</span>
                  <h2>Your Agent Workspace</h2>
                </div>

                <button
                  type="button"
                  className="refresh-btn"
                  onClick={fetchDashboardStats}
                  disabled={loading}
                >
                  {loading ? "Refreshing..." : "↻ Refresh Data"}
                </button>
              </div>

              <div className="property-status-grid">
                <div className="status-card available">
                  <span>Assigned Properties</span>
                  <strong>
                    <AnimatedNumber value={agentProperties} loading={loading} />
                  </strong>
                </div>

                <div
                  className="status-card"
                  onClick={() => navigate("/properties")}
                  style={{ cursor: "pointer", borderLeft: "4px solid #2563EB" }}
                >
                  <span>Explore Listings</span>
                  <strong>Browse 3D Studio →</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
