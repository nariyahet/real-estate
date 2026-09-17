import { useState, useEffect, useCallback } from "react";
import api from "../../../api/axios";

export default function FinanceModule() {
  const [financeTab, setFinanceTab] = useState("pnl"); // 'pnl' | 'accounts' | 'invoices' | 'ledger' | 'expenses'
  const [pnlData, setPnlData] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Create Invoice Modal
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    client_name: "",
    client_email: "",
    amount: "",
    tax_amount: "",
    due_date: "",
    notes: ""
  });

  // Create Expense Modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [newExpense, setNewExpense] = useState({
    title: "",
    category: "Operations",
    amount: "",
    payment_method: "Bank Transfer",
    paid_to: "",
    expense_date: new Date().toISOString().split("T")[0],
    notes: ""
  });

  // Create Double-Entry Journal Modal
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [journalEntry, setJournalEntry] = useState({
    transaction_ref: "",
    description: "",
    debit_account_id: 2, // Bank Escrow
    credit_account_id: 8, // Brokerage Commission Revenue
    amount: ""
  });

  const fetchFinanceData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [pnlRes, accRes, invRes, ledRes, expRes] = await Promise.allSettled([
        api.get("/finance/reports/pnl"),
        api.get("/finance/accounts"),
        api.get("/finance/invoices"),
        api.get("/finance/ledger"),
        api.get("/finance/expenses"),
      ]);

      if (pnlRes.status === "fulfilled" && pnlRes.value.data?.success) {
        setPnlData(pnlRes.value.data.pnl);
      }
      if (accRes.status === "fulfilled" && accRes.value.data?.success) {
        setAccounts(accRes.value.data.accounts || []);
      }
      if (invRes.status === "fulfilled" && invRes.value.data?.success) {
        setInvoices(invRes.value.data.invoices || []);
      }
      if (ledRes.status === "fulfilled" && ledRes.value.data?.success) {
        setLedgerEntries(ledRes.value.data.entries || []);
      }
      if (expRes.status === "fulfilled" && expRes.value.data?.success) {
        setExpenses(expRes.value.data.expenses || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load finance data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFinanceData();
  }, [fetchFinanceData]);

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...newInvoice,
        amount: Number(newInvoice.amount),
        tax_amount: Number(newInvoice.tax_amount || 0)
      };
      const res = await api.post("/finance/invoices", payload);
      if (res.data?.success) {
        setSuccessMsg(`Invoice ${res.data.invoiceNumber} generated!`);
        setShowInvoiceModal(false);
        setNewInvoice({ client_name: "", client_email: "", amount: "", tax_amount: "", due_date: "", notes: "" });
        fetchFinanceData();
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create invoice.");
    }
  };

  const handleCreateJournal = async (e) => {
    e.preventDefault();
    try {
      const amt = Number(journalEntry.amount);
      if (amt <= 0) {
        setError("Amount must be greater than zero.");
        return;
      }
      const ref = journalEntry.transaction_ref || `TXN-${Date.now()}`;
      const payload = {
        transaction_ref: ref,
        description: journalEntry.description || "Manual General Journal Adjustment",
        lines: [
          { account_id: Number(journalEntry.debit_account_id), debit: amt, credit: 0 },
          { account_id: Number(journalEntry.credit_account_id), debit: 0, credit: amt }
        ]
      };
      const res = await api.post("/finance/ledger/entry", payload);
      if (res.data?.success) {
        setSuccessMsg(`Journal Entry posted successfully (Ref: ${ref})!`);
        setShowJournalModal(false);
        setJournalEntry({
          transaction_ref: "",
          description: "",
          debit_account_id: 2,
          credit_account_id: 8,
          amount: ""
        });
        fetchFinanceData();
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to post balanced journal entry.");
    }
  };

  const handleRecordExpense = async (e) => {
    e.preventDefault();
    try {
      const amt = Number(newExpense.amount);
      if (amt <= 0) {
        setError("Expense amount must be greater than zero.");
        return;
      }
      if (!newExpense.title.trim()) {
        setError("Expense title is required.");
        return;
      }
      const res = await api.post("/finance/expenses", {
        ...newExpense,
        amount: amt
      });
      if (res.data?.success) {
        setSuccessMsg(`Expense recorded: "${newExpense.title}" (₹${amt.toLocaleString("en-IN")})`);
        setShowExpenseModal(false);
        setNewExpense({
          title: "",
          category: "Operations",
          amount: "",
          payment_method: "Bank Transfer",
          paid_to: "",
          expense_date: new Date().toISOString().split("T")[0],
          notes: ""
        });
        fetchFinanceData();
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to log expense.");
    }
  };

  const handleInvoiceStatusUpdate = async (invoiceId, status) => {
    try {
      const res = await api.put(`/finance/invoices/${invoiceId}/status`, { status });
      if (res.data?.success) {
        setInvoices((prev) =>
          prev.map((i) => (i.id === invoiceId ? { ...i, status } : i))
        );
        fetchFinanceData();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update invoice status.");
    }
  };

  return (
    <div className="enterprise-module-container">
      <div className="module-header-row">
        <div>
          <h2>💰 Enterprise Finance & Accounting Hub</h2>
          <p className="subtitle">Real-time double-entry general ledger, standard chart of accounts, milestone invoices & deterministic P&L statements.</p>
        </div>
        <div className="module-header-actions">
          <button type="button" className="btn-secondary" onClick={() => setShowExpenseModal(true)}>
            + Record Operating Expense
          </button>
          <button type="button" className="btn-secondary" onClick={() => setShowJournalModal(true)}>
            + Post Journal Entry
          </button>
          <button type="button" className="btn-primary" onClick={() => setShowInvoiceModal(true)}>
            + Issue Milestone Invoice
          </button>
        </div>
      </div>

      {error && <div className="ent-alert ent-alert-danger">{error}</div>}
      {successMsg && <div className="ent-alert ent-alert-success">{successMsg}</div>}

      <div className="ent-subtabs">
        <button
          type="button"
          className={`ent-subtab ${financeTab === "pnl" ? "active" : ""}`}
          onClick={() => setFinanceTab("pnl")}
        >
          📈 Profit & Loss Statement
        </button>
        <button
          type="button"
          className={`ent-subtab ${financeTab === "accounts" ? "active" : ""}`}
          onClick={() => setFinanceTab("accounts")}
        >
          📑 Chart of Accounts ({accounts.length})
        </button>
        <button
          type="button"
          className={`ent-subtab ${financeTab === "invoices" ? "active" : ""}`}
          onClick={() => setFinanceTab("invoices")}
        >
          📄 Invoices ({invoices.length})
        </button>
        <button
          type="button"
          className={`ent-subtab ${financeTab === "ledger" ? "active" : ""}`}
          onClick={() => setFinanceTab("ledger")}
        >
          ⚖️ General Ledger ({ledgerEntries.length})
        </button>
        <button
          type="button"
          className={`ent-subtab ${financeTab === "expenses" ? "active" : ""}`}
          onClick={() => setFinanceTab("expenses")}
        >
          💸 Operating Expenses ({expenses.length})
        </button>
      </div>

      {loading ? (
        <div className="ent-loading-state">Loading Enterprise Financial Records...</div>
      ) : (
        <>
          {/* TAB 1: P&L */}
          {financeTab === "pnl" && pnlData && (
            <div className="tab-content-area">
              <div className="ent-kpi-grid">
                <div className="ent-kpi-card">
                  <span className="ent-kpi-title">Total Revenue (Gross)</span>
                  <span className="ent-kpi-val" style={{ color: "#10b981" }}>
                    ₹{Number(pnlData.totalRevenue || 0).toLocaleString("en-IN")}
                  </span>
                  <span className="ent-kpi-sub">Commissions & management fees</span>
                </div>
                <div className="ent-kpi-card">
                  <span className="ent-kpi-title">Total Operating Expenses</span>
                  <span className="ent-kpi-val" style={{ color: "#ef4444" }}>
                    ₹{Number(pnlData.totalExpenses || 0).toLocaleString("en-IN")}
                  </span>
                  <span className="ent-kpi-sub">Marketing, office & operations</span>
                </div>
                <div className="ent-kpi-card">
                  <span className="ent-kpi-title">Net Operating Profit</span>
                  <span className="ent-kpi-val" style={{ color: pnlData.netProfit >= 0 ? "#10b981" : "#ef4444" }}>
                    ₹{Number(pnlData.netProfit || 0).toLocaleString("en-IN")}
                  </span>
                  <span className="ent-kpi-sub">Operating margin: {pnlData.profitMargin || "0.0%"}</span>
                </div>
                <div className="ent-kpi-card">
                  <span className="ent-kpi-title">Escrow Trust Balance</span>
                  <span className="ent-kpi-val">
                    ₹{Number(pnlData.escrowBalance || 0).toLocaleString("en-IN")}
                  </span>
                  <span className="ent-kpi-sub">Fiduciary funds in escrow</span>
                </div>
              </div>

              <div className="ent-card" style={{ marginTop: "1.5rem" }}>
                <h3>📊 Deterministic Statement Breakdown</h3>
                <div className="pnl-breakdown-list">
                  <div className="pnl-item">
                    <span>Brokerage & Deal Success Fees</span>
                    <strong>₹{Number(pnlData.totalRevenue || 0).toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="pnl-item">
                    <span>Agent Sales Commission Disbursals</span>
                    <strong style={{ color: "#ef4444" }}>- ₹{Number(pnlData.agentDisbursals || 0).toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="pnl-item">
                    <span>Digital Advertising & Marketing Campaigns</span>
                    <strong style={{ color: "#ef4444" }}>- ₹{Number(pnlData.marketingExpense || 0).toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="pnl-item">
                    <span>Office & Multi-Branch Administrative Overhead</span>
                    <strong style={{ color: "#ef4444" }}>- ₹{Number(pnlData.adminExpense || 0).toLocaleString("en-IN")}</strong>
                  </div>
                  <div className="pnl-item pnl-item-total">
                    <strong>Net Realized Earnings</strong>
                    <strong style={{ color: "#10b981" }}>₹{Number(pnlData.netProfit || 0).toLocaleString("en-IN")}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CHART OF ACCOUNTS */}
          {financeTab === "accounts" && (
            <div className="tab-content-area">
              <div className="ent-table-container">
                <table className="ent-table">
                  <thead>
                    <tr>
                      <th>Account Code</th>
                      <th>Account Title</th>
                      <th>Classification</th>
                      <th>Current Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((acc) => (
                      <tr key={acc.id}>
                        <td><code>{acc.account_code}</code></td>
                        <td><strong>{acc.account_name}</strong></td>
                        <td>
                          <span className={`badge-pill badge-${(acc.account_type || '').toLowerCase()}`}>
                            {acc.account_type}
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: acc.balance >= 0 ? "#111827" : "#ef4444" }}>
                            ₹{Number(acc.balance || 0).toLocaleString("en-IN")}
                          </strong>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: INVOICES */}
          {financeTab === "invoices" && (
            <div className="tab-content-area">
              <div className="ent-table-container">
                <table className="ent-table">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Client Name</th>
                      <th>Subtotal</th>
                      <th>Tax / GST</th>
                      <th>Total Payable</th>
                      <th>Due Date</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td><code>{inv.invoice_number}</code></td>
                        <td>
                          <strong>{inv.client_name}</strong>
                          <div className="sub-text">{inv.client_email}</div>
                        </td>
                        <td>₹{Number(inv.amount).toLocaleString("en-IN")}</td>
                        <td>₹{Number(inv.tax_amount || 0).toLocaleString("en-IN")}</td>
                        <td><strong style={{ color: "#2563eb" }}>₹{Number(inv.total_amount).toLocaleString("en-IN")}</strong></td>
                        <td>{new Date(inv.due_date).toLocaleDateString("en-IN")}</td>
                        <td>
                          <span className={`badge-status status-${(inv.status || 'Draft').toLowerCase()}`}>
                            {inv.status}
                          </span>
                        </td>
                        <td>
                          {inv.status !== "Paid" && (
                            <button
                              type="button"
                              className="btn-sm btn-primary-sm"
                              onClick={() => handleInvoiceStatusUpdate(inv.id, "Paid")}
                            >
                              Mark Paid ✔
                            </button>
                          )}
                          {inv.status === "Paid" && <span className="text-muted">Cleared</span>}
                        </td>
                      </tr>
                    ))}
                    {invoices.length === 0 && (
                      <tr>
                        <td colSpan="8" className="empty-row">No milestone invoices issued yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: GENERAL LEDGER */}
          {financeTab === "ledger" && (
            <div className="tab-content-area">
              <div className="ent-table-container">
                <table className="ent-table">
                  <thead>
                    <tr>
                      <th>Txn Ref</th>
                      <th>Account Name</th>
                      <th>Description</th>
                      <th>Debit (₹)</th>
                      <th>Credit (₹)</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerEntries.map((entry) => (
                      <tr key={entry.id}>
                        <td><code>{entry.transaction_ref}</code></td>
                        <td><strong>{entry.account_name}</strong></td>
                        <td>{entry.description}</td>
                        <td style={{ color: Number(entry.debit) > 0 ? "#10b981" : "#9ca3af" }}>
                          {Number(entry.debit) > 0 ? `₹${Number(entry.debit).toLocaleString("en-IN")}` : "-"}
                        </td>
                        <td style={{ color: Number(entry.credit) > 0 ? "#ef4444" : "#9ca3af" }}>
                          {Number(entry.credit) > 0 ? `₹${Number(entry.credit).toLocaleString("en-IN")}` : "-"}
                        </td>
                        <td>{new Date(entry.entry_date).toLocaleString("en-IN")}</td>
                      </tr>
                    ))}
                    {ledgerEntries.length === 0 && (
                      <tr>
                        <td colSpan="6" className="empty-row">No general ledger journal entries found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: OPERATING EXPENSES */}
          {financeTab === "expenses" && (
            <div className="tab-content-area">
              <div className="ent-table-container">
                <table className="ent-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Expense Title</th>
                      <th>Category</th>
                      <th>Payee / Vendor</th>
                      <th>Payment Method</th>
                      <th>Amount</th>
                      <th>Expense Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((exp) => (
                      <tr key={exp.id}>
                        <td>#{exp.id}</td>
                        <td>
                          <strong>{exp.title}</strong>
                          {exp.notes && <div className="sub-text">{exp.notes}</div>}
                        </td>
                        <td>
                          <span className="badge-pill">{exp.category}</span>
                        </td>
                        <td>{exp.paid_to || "Direct / Vendor"}</td>
                        <td>{exp.payment_method || "Bank Transfer"}</td>
                        <td>
                          <strong style={{ color: "#ef4444" }}>
                            - ₹{Number(exp.amount || 0).toLocaleString("en-IN")}
                          </strong>
                        </td>
                        <td>{new Date(exp.expense_date).toLocaleDateString("en-IN")}</td>
                      </tr>
                    ))}
                    {expenses.length === 0 && (
                      <tr>
                        <td colSpan="7" className="empty-row">
                          No operating expenses recorded yet. Click "+ Record Operating Expense" to log costs.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal: Post Double-Entry Journal */}
      {showJournalModal && (
        <div className="ent-modal-backdrop" onClick={() => setShowJournalModal(false)}>
          <div className="ent-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚖️ Post Double-Entry Journal Entry</h3>
              <button type="button" className="drawer-close" onClick={() => setShowJournalModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateJournal} className="modal-body-form">
              <div className="form-grid-2">
                <div>
                  <label>Debit Account *</label>
                  <select
                    value={journalEntry.debit_account_id}
                    onChange={(e) => setJournalEntry({ ...journalEntry, debit_account_id: e.target.value })}
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>[{a.account_code}] {a.account_name} ({a.account_type})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Credit Account *</label>
                  <select
                    value={journalEntry.credit_account_id}
                    onChange={(e) => setJournalEntry({ ...journalEntry, credit_account_id: e.target.value })}
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>[{a.account_code}] {a.account_name} ({a.account_type})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label>Balanced Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    value={journalEntry.amount}
                    onChange={(e) => setJournalEntry({ ...journalEntry, amount: e.target.value })}
                    placeholder="e.g. 50000"
                  />
                </div>
                <div>
                  <label>Transaction Reference</label>
                  <input
                    type="text"
                    value={journalEntry.transaction_ref}
                    onChange={(e) => setJournalEntry({ ...journalEntry, transaction_ref: e.target.value })}
                    placeholder="e.g. TXN-ESCROW-001"
                  />
                </div>
              </div>
              <div>
                <label>Description / Audit Memo *</label>
                <input
                  type="text"
                  required
                  value={journalEntry.description}
                  onChange={(e) => setJournalEntry({ ...journalEntry, description: e.target.value })}
                  placeholder="Escrow deposit received for Deal #1"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowJournalModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Post Balanced Entry (Debit = Credit)</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Issue Milestone Invoice */}
      {showInvoiceModal && (
        <div className="ent-modal-backdrop" onClick={() => setShowInvoiceModal(false)}>
          <div className="ent-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📄 Issue Client Milestone Invoice</h3>
              <button type="button" className="drawer-close" onClick={() => setShowInvoiceModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateInvoice} className="modal-body-form">
              <div className="form-grid-2">
                <div>
                  <label>Client Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newInvoice.client_name}
                    onChange={(e) => setNewInvoice({ ...newInvoice, client_name: e.target.value })}
                    placeholder="e.g. Ramesh Patel"
                  />
                </div>
                <div>
                  <label>Client Email *</label>
                  <input
                    type="email"
                    required
                    value={newInvoice.client_email}
                    onChange={(e) => setNewInvoice({ ...newInvoice, client_email: e.target.value })}
                    placeholder="client@example.com"
                  />
                </div>
                <div>
                  <label>Invoice Subtotal (₹) *</label>
                  <input
                    type="number"
                    required
                    value={newInvoice.amount}
                    onChange={(e) => setNewInvoice({ ...newInvoice, amount: e.target.value })}
                    placeholder="150000"
                  />
                </div>
                <div>
                  <label>GST / Tax Amount (₹)</label>
                  <input
                    type="number"
                    value={newInvoice.tax_amount}
                    onChange={(e) => setNewInvoice({ ...newInvoice, tax_amount: e.target.value })}
                    placeholder="27000 (18% GST)"
                  />
                </div>
                <div>
                  <label>Payment Due Date *</label>
                  <input
                    type="date"
                    required
                    value={newInvoice.due_date}
                    onChange={(e) => setNewInvoice({ ...newInvoice, due_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowInvoiceModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Generate Official Invoice</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Record Operating Expense */}
      {showExpenseModal && (
        <div className="ent-modal-backdrop" onClick={() => setShowExpenseModal(false)}>
          <div className="ent-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💸 Record Operating Expense</h3>
              <button type="button" className="drawer-close" onClick={() => setShowExpenseModal(false)}>✕</button>
            </div>
            <form onSubmit={handleRecordExpense} className="modal-body-form">
              <div className="form-grid-2">
                <div>
                  <label>Expense Title *</label>
                  <input
                    type="text"
                    required
                    value={newExpense.title}
                    onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })}
                    placeholder="e.g. Architectural Photography - Tower A"
                  />
                </div>
                <div>
                  <label>Expense Category *</label>
                  <select
                    value={newExpense.category}
                    onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                  >
                    <option value="Marketing">Marketing & Advertising</option>
                    <option value="Operations">Office & Operations</option>
                    <option value="Legal">Legal & Compliance</option>
                    <option value="Software">Software & Infrastructure</option>
                    <option value="Travel">Travel & Site Visits</option>
                    <option value="Utilities">Utilities & Facility</option>
                    <option value="Other">Other Expenses</option>
                  </select>
                </div>
                <div>
                  <label>Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    placeholder="e.g. 25000"
                  />
                </div>
                <div>
                  <label>Expense Date *</label>
                  <input
                    type="date"
                    required
                    value={newExpense.expense_date}
                    onChange={(e) => setNewExpense({ ...newExpense, expense_date: e.target.value })}
                  />
                </div>
                <div>
                  <label>Paid To / Vendor</label>
                  <input
                    type="text"
                    value={newExpense.paid_to}
                    onChange={(e) => setNewExpense({ ...newExpense, paid_to: e.target.value })}
                    placeholder="e.g. Pixels Studio Pvt Ltd"
                  />
                </div>
                <div>
                  <label>Payment Method</label>
                  <select
                    value={newExpense.payment_method}
                    onChange={(e) => setNewExpense({ ...newExpense, payment_method: e.target.value })}
                  >
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="UPI">UPI / Digital</option>
                    <option value="Corporate Card">Corporate Credit Card</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>
              </div>
              <div>
                <label>Notes / Memo</label>
                <input
                  type="text"
                  value={newExpense.notes}
                  onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })}
                  placeholder="Optional internal reference or invoice memo"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowExpenseModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Expense Record</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
