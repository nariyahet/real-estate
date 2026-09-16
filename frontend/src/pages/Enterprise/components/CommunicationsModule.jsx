import { useState, useEffect, useCallback } from "react";
import api from "../../../api/axios";

export default function CommunicationsModule() {
  const [commTab, setCommTab] = useState("threads"); // 'threads' | 'appointments' | 'notifications'
  const [threads, setThreads] = useState([]);
  const [selectedThread, setSelectedThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Schedule Appointment Modal
  const [showApptModal, setShowApptModal] = useState(false);
  const [newAppt, setNewAppt] = useState({
    property_id: 1,
    client_name: "",
    client_email: "",
    client_phone: "",
    scheduled_time: "",
    appointment_type: "Virtual_Meeting",
    notes: ""
  });

  // Create Thread Modal
  const [showThreadModal, setShowThreadModal] = useState(false);
  const [newThread, setNewThread] = useState({
    title: "",
    thread_type: "Internal",
    property_id: "",
    initial_message: ""
  });

  const fetchCommData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [thRes, apRes, noRes] = await Promise.allSettled([
        api.get("/communications/threads"),
        api.get("/communications/appointments"),
        api.get("/communications/notifications")
      ]);

      if (thRes.status === "fulfilled" && thRes.value.data?.success) {
        const thList = thRes.value.data.threads || [];
        setThreads(thList);
        if (thList.length > 0 && !selectedThread) {
          setSelectedThread(thList[0]);
        }
      }
      if (apRes.status === "fulfilled" && apRes.value.data?.success) {
        setAppointments(apRes.value.data.appointments || []);
      }
      if (noRes.status === "fulfilled" && noRes.value.data?.success) {
        setNotifications(noRes.value.data.notifications || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load communications data.");
    } finally {
      setLoading(false);
    }
  }, [selectedThread]);

  const fetchThreadMessages = useCallback(async (threadId) => {
    try {
      const res = await api.get(`/communications/threads/${threadId}/messages`);
      if (res.data?.success) {
        setMessages(res.data.messages || []);
      }
    } catch (err) {
      console.error("Failed to load thread messages:", err);
    }
  }, []);

  useEffect(() => {
    fetchCommData();
  }, [fetchCommData]);

  useEffect(() => {
    if (selectedThread?.id) {
      fetchThreadMessages(selectedThread.id);
    }
  }, [selectedThread, fetchThreadMessages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!selectedThread || !newMessage.trim()) return;
    try {
      const res = await api.post(`/communications/threads/${selectedThread.id}/messages`, {
        message_text: newMessage,
        body: newMessage
      });
      if (res.data?.success) {
        setMessages((prev) => [
          ...prev,
          {
            id: res.data.messageId,
            message_text: newMessage,
            body: newMessage,
            created_at: new Date().toISOString(),
            sender_name: "You",
            sender_role: "Agent"
          }
        ]);
        setNewMessage("");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send message.");
    }
  };

  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newAppt,
        property_id: Number(newAppt.property_id || 1)
      };
      const res = await api.post("/communications/appointments", payload);
      if (res.data?.success) {
        setSuccessMsg(`Appointment confirmed! Jitsi video room: ${res.data.meetingLink || "Ready"}`);
        setShowApptModal(false);
        setNewAppt({
          property_id: 1,
          client_name: "",
          client_email: "",
          client_phone: "",
          scheduled_time: "",
          appointment_type: "Virtual_Meeting",
          notes: ""
        });
        fetchCommData();
        setTimeout(() => setSuccessMsg(""), 4000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to schedule appointment.");
    }
  };

  const handleCreateThread = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newThread,
        property_id: newThread.property_id ? Number(newThread.property_id) : null
      };
      const res = await api.post("/communications/threads", payload);
      if (res.data?.success) {
        setSuccessMsg("Conversation thread created.");
        setShowThreadModal(false);
        setNewThread({ title: "", thread_type: "Internal", property_id: "", initial_message: "" });
        fetchCommData();
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create thread.");
    }
  };

  return (
    <div className="enterprise-module-container">
      <div className="module-header-row">
        <div>
          <h2>💬 Communication & Virtual Collaboration Hub</h2>
          <p className="subtitle">Real-time internal & client messaging threads, notification alerts & automated virtual tour appointments.</p>
        </div>
        <div className="module-header-actions">
          <button type="button" className="btn-secondary" onClick={() => setShowThreadModal(true)}>
            + New Thread
          </button>
          <button type="button" className="btn-primary" onClick={() => setShowApptModal(true)}>
            + Schedule Virtual Tour
          </button>
        </div>
      </div>

      {error && <div className="ent-alert ent-alert-danger">{error}</div>}
      {successMsg && <div className="ent-alert ent-alert-success">{successMsg}</div>}

      <div className="ent-subtabs">
        <button
          type="button"
          className={`ent-subtab ${commTab === "threads" ? "active" : ""}`}
          onClick={() => setCommTab("threads")}
        >
          💬 Messaging Threads ({threads.length})
        </button>
        <button
          type="button"
          className={`ent-subtab ${commTab === "appointments" ? "active" : ""}`}
          onClick={() => setCommTab("appointments")}
        >
          📅 Appointments & Virtual Tours ({appointments.length})
        </button>
        <button
          type="button"
          className={`ent-subtab ${commTab === "notifications" ? "active" : ""}`}
          onClick={() => setCommTab("notifications")}
        >
          🔔 Centralized Notifications ({notifications.length})
        </button>
      </div>

      {loading ? (
        <div className="ent-loading-state">Loading Communications...</div>
      ) : (
        <>
          {/* TAB 1: THREADS */}
          {commTab === "threads" && (
            <div className="chat-layout-container">
              {/* Sidebar threads */}
              <div className="chat-thread-list">
                <div className="chat-list-header">Active Conversations</div>
                {threads.map((t) => (
                  <div
                    key={t.id}
                    className={`chat-thread-item ${selectedThread?.id === t.id ? "active" : ""}`}
                    onClick={() => setSelectedThread(t)}
                  >
                    <strong>{t.title}</strong>
                    <div className="sub-text">{t.thread_type} • Property #{t.property_id || "General"}</div>
                  </div>
                ))}
                {threads.length === 0 && <div className="empty-sub" style={{ padding: "1rem" }}>No active threads.</div>}
              </div>

              {/* Chat View */}
              <div className="chat-conversation-view">
                {selectedThread ? (
                  <>
                    <div className="chat-topbar">
                      <div>
                        <strong>{selectedThread.title}</strong>
                        <span className="badge-pill" style={{ marginLeft: "8px" }}>{selectedThread.thread_type}</span>
                      </div>
                    </div>

                    <div className="chat-messages-area">
                      {messages.map((m) => (
                        <div key={m.id} className="chat-message-bubble">
                          <div className="msg-header">
                            <strong>{m.sender_name || "User"}</strong>
                            <span className="msg-time">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                          <p>{m.message_text || m.body}</p>
                        </div>
                      ))}
                      {messages.length === 0 && (
                        <div className="empty-state-box">No messages in this thread yet. Send a message to start!</div>
                      )}
                    </div>

                    <form onSubmit={handleSendMessage} className="chat-input-bar">
                      <input
                        type="text"
                        placeholder="Type your message or internal deal note..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                      />
                      <button type="submit" className="btn-primary">Send</button>
                    </form>
                  </>
                ) : (
                  <div className="empty-state-box">Select a thread to view conversation.</div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: APPOINTMENTS */}
          {commTab === "appointments" && (
            <div className="tab-content-area">
              <div className="ent-table-container">
                <table className="ent-table">
                  <thead>
                    <tr>
                      <th>Appointment ID</th>
                      <th>Client Name</th>
                      <th>Scheduled Time</th>
                      <th>Type</th>
                      <th>Virtual Meeting Link</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((apt) => (
                      <tr key={apt.id}>
                        <td>#{apt.id}</td>
                        <td>
                          <strong>{apt.client_name}</strong>
                          <div className="sub-text">{apt.client_phone} • {apt.client_email}</div>
                        </td>
                        <td><strong>{new Date(apt.scheduled_time).toLocaleString("en-IN")}</strong></td>
                        <td><span className="badge-pill">{apt.appointment_type}</span></td>
                        <td>
                          {apt.meeting_link ? (
                            <a href={apt.meeting_link} target="_blank" rel="noopener noreferrer" className="btn-sm btn-primary-sm">
                              📹 Join Virtual Tour
                            </a>
                          ) : (
                            <span className="text-muted">In-Person Site Visit</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge-status status-${(apt.status || 'Confirmed').toLowerCase()}`}>
                            {apt.status || "Confirmed"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {appointments.length === 0 && (
                      <tr>
                        <td colSpan="6" className="empty-row">No upcoming property tour appointments scheduled.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: NOTIFICATIONS */}
          {commTab === "notifications" && (
            <div className="tab-content-area">
              <div className="notification-list-box">
                {notifications.map((notif) => (
                  <div key={notif.id} className={`notification-item ${notif.is_read ? 'read' : 'unread'}`}>
                    <div className="notif-icon">🔔</div>
                    <div className="notif-content">
                      <strong>{notif.title}</strong>
                      <p>{notif.message}</p>
                      <span className="notif-time">{new Date(notif.created_at).toLocaleString("en-IN")}</span>
                    </div>
                  </div>
                ))}
                {notifications.length === 0 && (
                  <div className="empty-state-box">No alerts or notifications in your inbox.</div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal: Schedule Virtual Tour */}
      {showApptModal && (
        <div className="ent-modal-backdrop" onClick={() => setShowApptModal(false)}>
          <div className="ent-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📹 Schedule Property Walkthrough / Virtual Tour</h3>
              <button type="button" className="drawer-close" onClick={() => setShowApptModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateAppointment} className="modal-body-form">
              <div className="form-grid-2">
                <div>
                  <label>Client Name *</label>
                  <input
                    type="text"
                    required
                    value={newAppt.client_name}
                    onChange={(e) => setNewAppt({ ...newAppt, client_name: e.target.value })}
                    placeholder="e.g. Anand Mahindra"
                  />
                </div>
                <div>
                  <label>Client Email *</label>
                  <input
                    type="email"
                    required
                    value={newAppt.client_email}
                    onChange={(e) => setNewAppt({ ...newAppt, client_email: e.target.value })}
                    placeholder="client@example.com"
                  />
                </div>
                <div>
                  <label>Client Phone *</label>
                  <input
                    type="text"
                    required
                    value={newAppt.client_phone}
                    onChange={(e) => setNewAppt({ ...newAppt, client_phone: e.target.value })}
                    placeholder="+91 98250 12345"
                  />
                </div>
                <div>
                  <label>Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={newAppt.scheduled_time}
                    onChange={(e) => setNewAppt({ ...newAppt, scheduled_time: e.target.value })}
                  />
                </div>
                <div>
                  <label>Appointment Type</label>
                  <select
                    value={newAppt.appointment_type}
                    onChange={(e) => setNewAppt({ ...newAppt, appointment_type: e.target.value })}
                  >
                    <option value="Virtual_Meeting">Virtual Video Walkthrough (Jitsi)</option>
                    <option value="In_Person_Showing">In-Person Site Visit</option>
                  </select>
                </div>
              </div>
              <div>
                <label>Tour Notes</label>
                <input
                  type="text"
                  value={newAppt.notes}
                  onChange={(e) => setNewAppt({ ...newAppt, notes: e.target.value })}
                  placeholder="Focus on terrace garden and modular kitchen."
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowApptModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Generate Video Link & Schedule</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Thread */}
      {showThreadModal && (
        <div className="ent-modal-backdrop" onClick={() => setShowThreadModal(false)}>
          <div className="ent-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💬 Create Conversation Thread</h3>
              <button type="button" className="drawer-close" onClick={() => setShowThreadModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateThread} className="modal-body-form">
              <div>
                <label>Thread Title *</label>
                <input
                  type="text"
                  required
                  value={newThread.title}
                  onChange={(e) => setNewThread({ ...newThread, title: e.target.value })}
                  placeholder="e.g. Legal Title Search Discussion"
                />
              </div>
              <div className="form-grid-2">
                <div>
                  <label>Classification</label>
                  <select
                    value={newThread.thread_type}
                    onChange={(e) => setNewThread({ ...newThread, thread_type: e.target.value })}
                  >
                    <option value="Internal">Internal Team Collaboration</option>
                    <option value="Client">Client Discussion</option>
                  </select>
                </div>
                <div>
                  <label>Initial Message *</label>
                  <input
                    type="text"
                    required
                    value={newThread.initial_message}
                    onChange={(e) => setNewThread({ ...newThread, initial_message: e.target.value })}
                    placeholder="Provide context or prompt for the team..."
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowThreadModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create Thread</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
