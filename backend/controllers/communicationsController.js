const { pool } = require('../config/db');

// ────────────────────────────────────────────────────────────────────
// PHASE 8: COMMUNICATION & COLLABORATION CONTROLLER
// Features: Internal Chat, Client Threads, Notifications Center, Appointments & Video Tours
// ────────────────────────────────────────────────────────────────────

// 1. Chat Threads & Messages
const getThreads = async (req, res) => {
  try {
    const { type } = req.query;
    let where = type ? `WHERE thread_type = '${type}'` : '';
    const [threads] = await pool.execute(`
      SELECT t.*, u.name as creator_name, p.title as property_title,
        (SELECT message_text FROM comm_messages WHERE thread_id = t.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM comm_messages WHERE thread_id = t.id ORDER BY created_at DESC LIMIT 1) as last_message_time
      FROM comm_threads t
      JOIN users u ON t.created_by = u.id
      LEFT JOIN properties p ON t.property_id = p.id
      ${where}
      ORDER BY last_message_time DESC, t.created_at DESC
    `);
    return res.status(200).json({ success: true, threads });
  } catch (error) {
    console.error('Get Threads Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load conversation threads.' });
  }
};

const createThread = async (req, res) => {
  try {
    const { title, thread_type, property_id, initial_message } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Thread title is required.' });

    const [result] = await pool.execute(
      `INSERT INTO comm_threads (title, thread_type, property_id, created_by)
       VALUES (?, ?, ?, ?)`,
      [title, thread_type || 'Internal', property_id ? Number(property_id) : null, req.user.id]
    );

    const threadId = result.insertId;

    if (initial_message) {
      await pool.execute(
        `INSERT INTO comm_messages (thread_id, sender_id, message_text)
         VALUES (?, ?, ?)`,
        [threadId, req.user.id, initial_message]
      );
    }

    return res.status(201).json({ success: true, message: 'Conversation started.', threadId });
  } catch (error) {
    console.error('Create Thread Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create thread.' });
  }
};

const getThreadMessages = async (req, res) => {
  try {
    const { threadId } = req.params;
    const [messages] = await pool.execute(`
      SELECT m.*, u.name as sender_name, u.role as sender_role
      FROM comm_messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.thread_id = ?
      ORDER BY m.created_at ASC
    `, [Number(threadId)]);

    return res.status(200).json({ success: true, messages });
  } catch (error) {
    console.error('Get Messages Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load messages.' });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { threadId } = req.params;
    const message_text = req.body.message_text || req.body.body || req.body.message;

    if (!message_text || !String(message_text).trim()) {
      return res.status(400).json({ success: false, message: 'Message text cannot be empty.' });
    }

    const [result] = await pool.execute(
      `INSERT INTO comm_messages (thread_id, sender_id, message_text)
       VALUES (?, ?, ?)`,
      [Number(threadId), req.user.id, String(message_text).trim()]
    );

    return res.status(201).json({ success: true, message: 'Message sent.', messageId: result.insertId });
  } catch (error) {
    console.error('Send Message Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send message.' });
  }
};

// 2. Centralized User Notifications
const getNotifications = async (req, res) => {
  try {
    const [notifications] = await pool.execute(`
      SELECT * FROM notifications 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 30
    `, [req.user.id]);

    const [[{ unreadCount }]] = await pool.execute(`
      SELECT COUNT(*) as unreadCount FROM notifications WHERE user_id = ? AND is_read = FALSE
    `, [req.user.id]);

    return res.status(200).json({ success: true, notifications, unreadCount });
  } catch (error) {
    console.error('Get Notifications Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load notifications.' });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const { id } = req.params;
    if (id === 'all') {
      await pool.execute(`UPDATE notifications SET is_read = TRUE WHERE user_id = ?`, [req.user.id]);
    } else {
      await pool.execute(`UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?`, [Number(id), req.user.id]);
    }
    return res.status(200).json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    console.error('Mark Read Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update notification.' });
  }
};

// 3. Appointments & Virtual Tours
const getAppointments = async (req, res) => {
  try {
    const [appointments] = await pool.execute(`
      SELECT app.*, p.title as property_title, p.city as property_city, u.name as agent_name
      FROM appointments app
      JOIN properties p ON app.property_id = p.id
      LEFT JOIN agents a ON app.agent_id = a.id
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY app.scheduled_time ASC
    `);
    return res.status(200).json({ success: true, appointments });
  } catch (error) {
    console.error('Get Appointments Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load appointments.' });
  }
};

const bookAppointment = async (req, res) => {
  try {
    const { property_id, client_name, client_email, client_phone, scheduled_time, appointment_type, notes } = req.body;
    if (!property_id || !client_name || !scheduled_time) {
      return res.status(400).json({ success: false, message: 'Property, client name and scheduled time are required.' });
    }

    const [prop] = await pool.execute(`SELECT agent_id FROM properties WHERE id = ?`, [Number(property_id)]);
    const agentId = prop[0]?.agent_id || null;
    const meetingLink = appointment_type === 'Virtual_Meeting' ? `https://meet.jit.si/estate-elite-tour-${Date.now()}` : null;

    const [result] = await pool.execute(
      `INSERT INTO appointments (
        property_id, client_name, client_email, client_phone, agent_id,
        scheduled_time, appointment_type, meeting_link, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Scheduled')`,
      [
        Number(property_id), client_name, client_email || null, client_phone || null,
        agentId, scheduled_time, appointment_type || 'In_Person_Tour', meetingLink, notes || null
      ]
    );

    return res.status(201).json({
      success: true,
      message: 'Appointment booked successfully.',
      appointmentId: result.insertId,
      meetingLink
    });
  } catch (error) {
    console.error('Book Appointment Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to book appointment.' });
  }
};

module.exports = {
  getThreads,
  createThread,
  getThreadMessages,
  sendMessage,
  getNotifications,
  markNotificationRead,
  getAppointments,
  bookAppointment
};
