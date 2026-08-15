import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import "./Users.css";

const API_URL = "http://localhost:5000/api";

function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const getHeaders = useCallback(() => {
    const token =
      localStorage.getItem("adminToken") || localStorage.getItem("token");

    return {
      Authorization: `Bearer ${token}`,
    };
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(`${API_URL}/admin/users`, {
        headers: getHeaders(),
      });

      if (response.data.success) {
        setUsers(response.data.users || []);
      } else {
        setUsers([]);
        setError(response.data.message || "Failed to load users.");
      }
    } catch (err) {
      console.error("Users Error:", err);

      setError(err.response?.data?.message || "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    const loadUsers = async () => {
      await fetchUsers();
    };

    loadUsers();
  }, [fetchUsers]);

  const updateUserRole = async (userId, role) => {
    try {
      setUpdatingId(userId);
      setError("");

      const response = await axios.put(
        `${API_URL}/admin/users/${userId}/role`,
        { role },
        {
          headers: getHeaders(),
        },
      );

      if (response.data.success) {
        setUsers((currentUsers) =>
          currentUsers.map((user) =>
            user.id === userId ? { ...user, role } : user,
          ),
        );
      } else {
        setError(response.data.message || "Failed to update user role.");
      }
    } catch (err) {
      console.error("Update User Role Error:", err);

      setError(err.response?.data?.message || "Failed to update user role.");
    } finally {
      setUpdatingId(null);
    }
  };

  const getRoleClass = (role) => {
    switch (role) {
      case "admin":
        return "admin";

      case "agent":
        return "agent";

      case "user":
        return "user";

      default:
        return "user";
    }
  };

  if (loading) {
    return (
      <div className="users-page">
        <div className="users-header">
          <div>
            <span className="users-label">ADMIN MANAGEMENT</span>
            <h1>Users</h1>
            <p>Manage all registered users.</p>
          </div>
        </div>

        <div className="users-loading">
          <div className="users-loader"></div>
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="users-page">
      <div className="users-header">
        <div>
          <span className="users-label">ADMIN MANAGEMENT</span>
          <h1>Users</h1>
          <p>Manage all registered users from one place.</p>
        </div>

        <button
          type="button"
          className="users-refresh-btn"
          onClick={fetchUsers}
          disabled={loading}
        >
          ↻ Refresh
        </button>
      </div>

      {error && (
        <div className="users-error">
          <span>{error}</span>

          <button type="button" onClick={() => setError("")}>
            ×
          </button>
        </div>
      )}

      {!error && users.length === 0 && (
        <div className="users-empty">
          <div className="users-empty-icon">👥</div>
          <h3>No Users Found</h3>
          <p>Currently there are no registered users.</p>
        </div>
      )}

      {users.length > 0 && (
        <div className="users-table-card">
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>User</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <span className="user-id">#{user.id}</span>
                    </td>

                    <td>
                      <div className="user-info">
                        <div className="user-avatar">
                          {(user.name || "U").charAt(0).toUpperCase()}
                        </div>

                        <strong>{user.name || "Unknown User"}</strong>
                      </div>
                    </td>

                    <td>
                      <span className="user-email">{user.email || "-"}</span>
                    </td>

                    <td>{user.phone || "-"}</td>

                    <td>
                      <span className={`role-badge ${getRoleClass(user.role)}`}>
                        {user.role || "user"}
                      </span>
                    </td>

                    <td>
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString("en-IN")
                        : "-"}
                    </td>

                    <td>
                      <select
                        className="role-select"
                        value={user.role || "user"}
                        disabled={updatingId === user.id}
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
        </div>
      )}
    </div>
  );
}

export default Users;
