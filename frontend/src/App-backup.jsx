import { useState } from "react";
import axios from "axios";
import "./App.css";

const API_URL = "http://localhost:5000/api";

function App() {
  const [activePage, setActivePage] = useState("dashboard");

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAgents: 0,
    totalProperties: 0,
    availableProperties: 0,
    soldProperties: 0,
    rentedProperties: 0,
    inactiveProperties: 0,
  });

  const [users, setUsers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [properties, setProperties] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getHeaders = () => {
    const token =
      localStorage.getItem("adminToken") || localStorage.getItem("token");

    return {
      Authorization: `Bearer ${token}`,
    };
  };

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(`${API_URL}/admin/dashboard-stats`, {
        headers: getHeaders(),
      });

      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (err) {
      console.error("Dashboard Stats Error:", err);

      setError(
        err.response?.data?.message ||
          "Dashboard statistics load થઈ શક્યા નથી.",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(`${API_URL}/admin/users`, {
        headers: getHeaders(),
      });

      if (response.data.success) {
        setUsers(response.data.users || []);
      }
    } catch (err) {
      console.error("Users API Error:", err);

      setError(err.response?.data?.message || "Users load થઈ શક્યા નથી.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(`${API_URL}/admin/agents`, {
        headers: getHeaders(),
      });

      if (response.data.success) {
        setAgents(response.data.agents || []);
      }
    } catch (err) {
      console.error("Agents API Error:", err);

      setError(err.response?.data?.message || "Agents load થઈ શક્યા નથી.");
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(`${API_URL}/admin/properties`, {
        headers: getHeaders(),
      });

      if (response.data.success) {
        setProperties(response.data.properties || []);
      }
    } catch (err) {
      console.error("Properties API Error:", err);

      setError(err.response?.data?.message || "Properties load થઈ શકી નથી.");
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = async (page) => {
    setActivePage(page);

    if (page === "dashboard") {
      await fetchDashboardStats();
    }

    if (page === "users") {
      await fetchUsers();
    }

    if (page === "agents") {
      await fetchAgents();
    }

    if (page === "properties") {
      await fetchProperties();
    }
  };

  const updateUserRole = async (userId, role) => {
    try {
      setError("");

      await axios.put(
        `${API_URL}/admin/users/${userId}/role`,
        { role },
        {
          headers: getHeaders(),
        },
      );

      await fetchUsers();
      await fetchDashboardStats();
    } catch (err) {
      console.error("Update User Role Error:", err);

      setError(err.response?.data?.message || "User role update થઈ શક્યો નથી.");
    }
  };

  const updatePropertyStatus = async (propertyId, status) => {
    try {
      setError("");

      await axios.put(
        `${API_URL}/admin/properties/${propertyId}/status`,
        { status },
        {
          headers: getHeaders(),
        },
      );

      await fetchProperties();
      await fetchDashboardStats();
    } catch (err) {
      console.error("Update Property Status Error:", err);

      setError(
        err.response?.data?.message || "Property status update થઈ શક્યો નથી.",
      );
    }
  };

  const deleteProperty = async (propertyId) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this property?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");

      await axios.delete(`${API_URL}/admin/properties/${propertyId}`, {
        headers: getHeaders(),
      });

      await fetchProperties();
      await fetchDashboardStats();
    } catch (err) {
      console.error("Delete Property Error:", err);

      setError(err.response?.data?.message || "Property delete થઈ શકી નથી.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("token");
    window.location.href = "/";
  };

  const formatPrice = (price, listingType) => {
    const value = Number(price || 0);

    if (listingType === "Rent") {
      return `₹${value.toLocaleString("en-IN")}/month`;
    }

    return `₹${value.toLocaleString("en-IN")}`;
  };

  const renderDashboard = () => (
    <div className="dashboard-content">
      {" "}
      <div className="welcome-card">
        {" "}
        <div>
          {" "}
          <span>ADMIN PANEL</span> <h2>Welcome back, Admin 👋</h2>{" "}
          <p>Manage your real estate platform from one place. </p>{" "}
        </div>
        <div className="welcome-icon">🏢</div>
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-icon">👥</div>
          </div>

          <div className="stat-value">{stats.totalUsers}</div>

          <div className="stat-title">Total Users</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-icon">🤝</div>
          </div>

          <div className="stat-value">{stats.totalAgents}</div>

          <div className="stat-title">Total Agents</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-icon">🏠</div>
          </div>

          <div className="stat-value">{stats.totalProperties}</div>

          <div className="stat-title">Total Properties</div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <div className="stat-icon">✅</div>
          </div>

          <div className="stat-value">{stats.availableProperties}</div>

          <div className="stat-title">Available Properties</div>
        </div>
      </div>
      <div className="overview-section">
        <div className="section-header">
          <div>
            <span>PROPERTY OVERVIEW</span>
            <h2>Property Status</h2>
          </div>

          <button className="refresh-btn" onClick={fetchDashboardStats}>
            ↻ Refresh
          </button>
        </div>

        <div className="property-status-grid">
          <div className="status-card available">
            <span>Available</span>
            <strong>{stats.availableProperties}</strong>
          </div>

          <div className="status-card sold">
            <span>Sold</span>
            <strong>{stats.soldProperties}</strong>
          </div>

          <div className="status-card rented">
            <span>Rented</span>
            <strong>{stats.rentedProperties}</strong>
          </div>

          <div className="status-card inactive">
            <span>Inactive</span>
            <strong>{stats.inactiveProperties}</strong>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="dashboard-content">
      {" "}
      <div className="section-header">
        {" "}
        <div>
          {" "}
          <span>ADMIN MANAGEMENT</span> <h2>All Users</h2>{" "}
        </div>
        <button className="refresh-btn" onClick={fetchUsers}>
          ↻ Refresh
        </button>
      </div>
      <div className="data-card">
        {loading ? (
          <div className="loading-box">
            <div className="loader"></div>
            <span>Loading users...</span>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.id}</td>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.phone || "-"}</td>

                    <td>
                      <span className={`role-badge ${user.role}`}>
                        {user.role}
                      </span>
                    </td>

                    <td>
                      <select
                        value={user.role}
                        onChange={(e) =>
                          updateUserRole(user.id, e.target.value)
                        }
                      >
                        <option value="user">User</option>

                        <option value="agent">Agent</option>

                        <option value="admin">Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderAgents = () => (
    <div className="dashboard-content">
      {" "}
      <div className="section-header">
        {" "}
        <div>
          {" "}
          <span>AGENT MANAGEMENT</span> <h2>All Agents</h2>{" "}
        </div>
        <button className="refresh-btn" onClick={fetchAgents}>
          ↻ Refresh
        </button>
      </div>
      <div className="data-card">
        {loading ? (
          <div className="loading-box">
            <div className="loader"></div>
            <span>Loading agents...</span>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Agency</th>
                  <th>Experience</th>
                  <th>Location</th>
                </tr>
              </thead>

              <tbody>
                {agents.map((agent) => (
                  <tr key={agent.agent_id}>
                    <td>{agent.agent_id}</td>
                    <td>{agent.name}</td>
                    <td>{agent.email}</td>
                    <td>{agent.agency_name || "-"}</td>
                    <td>{agent.experience || 0} years</td>
                    <td>{agent.location || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderProperties = () => (
    <div className="dashboard-content">
      {" "}
      <div className="section-header">
        {" "}
        <div>
          {" "}
          <span>PROPERTY MANAGEMENT</span> <h2>All Properties</h2>{" "}
        </div>
        <button className="refresh-btn" onClick={fetchProperties}>
          ↻ Refresh
        </button>
      </div>
      <div className="data-card">
        {loading ? (
          <div className="loading-box">
            <div className="loader"></div>
            <span>Loading properties...</span>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Property</th>
                  <th>Type</th>
                  <th>Price</th>
                  <th>Agent</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {properties.map((property) => (
                  <tr key={property.id}>
                    <td>{property.id}</td>

                    <td>
                      <strong>{property.title}</strong>
                    </td>

                    <td>{property.listing_type}</td>

                    <td>
                      {formatPrice(property.price, property.listing_type)}
                    </td>

                    <td>{property.agent_name || "Not Assigned"}</td>

                    <td>
                      <select
                        value={property.status}
                        onChange={(e) =>
                          updatePropertyStatus(property.id, e.target.value)
                        }
                      >
                        <option value="Available">Available</option>

                        <option value="Sold">Sold</option>

                        <option value="Rented">Rented</option>

                        <option value="Inactive">Inactive</option>
                      </select>
                    </td>

                    <td>
                      <button
                        className="delete-btn"
                        onClick={() => deleteProperty(property.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    if (activePage === "users") {
      return renderUsers();
    }

    if (activePage === "agents") {
      return renderAgents();
    }

    if (activePage === "properties") {
      return renderProperties();
    }

    return renderDashboard();
  };

  return (
    <div className="admin-layout">
      {" "}
      <aside className="sidebar">
        {" "}
        <div className="brand">
          {" "}
          <div className="brand-icon">🏠 </div>
          <div>
            <h2>RealEstate</h2>
            <span>Admin Panel</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activePage === "dashboard" ? "active" : ""}`}
            onClick={() => handlePageChange("dashboard")}
          >
            <span>📊</span>
            Dashboard
          </button>

          <button
            className={`nav-item ${activePage === "users" ? "active" : ""}`}
            onClick={() => handlePageChange("users")}
          >
            <span>👥</span>
            Users
          </button>

          <button
            className={`nav-item ${activePage === "agents" ? "active" : ""}`}
            onClick={() => handlePageChange("agents")}
          >
            <span>🤝</span>
            Agents
          </button>

          <button
            className={`nav-item ${
              activePage === "properties" ? "active" : ""
            }`}
            onClick={() => handlePageChange("properties")}
          >
            <span>🏠</span>
            Properties
          </button>
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item logout-btn" onClick={handleLogout}>
            <span>🚪</span>
            Logout
          </button>
        </div>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="page-label">REAL ESTATE ADMIN</p>

            <h1>
              {activePage === "dashboard" && "Dashboard"}

              {activePage === "users" && "Users"}

              {activePage === "agents" && "Agents"}

              {activePage === "properties" && "Properties"}
            </h1>
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

            <button onClick={() => setError("")}>×</button>
          </div>
        )}

        {renderContent()}
      </main>
    </div>
  );
}

export default App;
