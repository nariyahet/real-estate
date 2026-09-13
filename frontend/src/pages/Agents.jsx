import { useCallback, useEffect, useState } from "react";
import api from "../api/axios";
import "./Agents.css";

function Agents() {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/admin/agents");

      if (response.data.success) {
        setAgents(response.data.agents || []);
      } else {
        setAgents([]);
        setError(
          response.data?.message || "Failed to load agents.",
        );
      }
    } catch (err) {
      console.error("Agents Error:", err);

      setError(
        err.response?.data?.message || "Failed to load agents.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  if (loading) {
    return (
      <div className="page-container">
        <h1>Agents</h1>
        <p>Loading agents...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Agents</h1>
          <p>Manage all registered agents</p>
        </div>

        <button type="button" onClick={fetchAgents}>
          Refresh
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {!error && agents.length === 0 && (
        <div className="empty-state">
          <h3>No Agents Found</h3>
          <p>Currently there are no registered agents.</p>
        </div>
      )}

      {agents.length > 0 && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Created</th>
              </tr>
            </thead>

            <tbody>
              {agents.map((agent) => (
                <tr key={agent.agent_id}>
                  <td>{agent.agent_id}</td>
                  <td>{agent.name || "-"}</td>
                  <td>{agent.email || "-"}</td>
                  <td>{agent.phone || "-"}</td>
                  <td>
                    <span className="role-badge agent">
                      {agent.role || "agent"}
                    </span>
                  </td>
                  <td>
                    {agent.created_at
                      ? new Date(
                          agent.created_at,
                        ).toLocaleDateString()
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Agents;