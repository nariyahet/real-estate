const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const { testDatabaseConnection } = require("./config/db");

const app = express();

const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "http://localhost:5177",
  "https://real-estate-eight-ochre.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("Blocked CORS origin:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());

const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const propertyRoutes = require("./routes/propertyRoutes");
const documentRoutes = require("./routes/documentRoutes");
const operationsRoutes = require("./routes/operationsRoutes");
const savedRoutes = require("./routes/savedRoutes");
const crmRoutes = require("./routes/crmRoutes");
const brokerRoutes = require("./routes/brokerRoutes");
const dealsRoutes = require("./routes/dealsRoutes");
const financeRoutes = require("./routes/financeRoutes");
const marketingRoutes = require("./routes/marketingRoutes");
const communicationsRoutes = require("./routes/communicationsRoutes");
const aiMapsRoutes = require("./routes/aiMapsRoutes");
const enterpriseRoutes = require("./routes/enterpriseRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/properties", operationsRoutes);
app.use("/api/properties", propertyRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/crm", crmRoutes);
app.use("/api/broker", brokerRoutes);
app.use("/api/deals", dealsRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/marketing", marketingRoutes);
app.use("/api/communications", communicationsRoutes);
app.use("/api", aiMapsRoutes);
app.use("/api", enterpriseRoutes);
app.use("/api", savedRoutes);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Real Estate API is running",
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Backend server is healthy",
    port: PORT,
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found.",
  });
});

app.use((err, req, res, next) => {
  console.error("Server Error:", err);

  res.status(500).json({
    success: false,
    message: "Internal server error.",
  });
});

const server = app.listen(PORT, async () => {
  console.log("");
  console.log("REAL ESTATE BACKEND SERVER");
  console.log("");
  console.log(`Server running on port ${PORT}`);
  console.log(`API: http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
  console.log("");

  await testDatabaseConnection();
});

server.on("error", (error) => {
  console.error("SERVER START ERROR:", error);

  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use.`);
  }
});

process.on("uncaughtException", (error) => {
  console.error("UNCAUGHT EXCEPTION:", error);
});

process.on("unhandledRejection", (error) => {
  console.error("UNHANDLED REJECTION:", error);
});
