# 🏠 Real Estate Management System

A full-stack **Real Estate Management System** built to manage users, agents, properties, authentication, and administrative operations through a modern web application.

The project uses **React.js** for the frontend, **Node.js + Express.js** for the backend, and **MySQL** for database management.

---

## 🚀 Features

### 🔐 Authentication & Security

* User login and registration
* JWT-based authentication
* Password hashing with bcrypt
* Protected routes
* Role-based authorization
* Admin-only access control
* Automatic token expiration
* Secure environment variable configuration

### 📊 Admin Dashboard

* Dashboard statistics
* Total users overview
* Total agents overview
* Property statistics
* Administrative management interface

### 👥 User Management

* View registered users
* View user information
* Manage user roles
* Role-based access control

### 🧑‍💼 Agent Management

* View all agents
* Agent information management
* Agent-specific property management

### 🏡 Property Management

* View properties
* Property status management
* Property approval/rejection
* Delete properties
* Property information management

### 🎨 Frontend

* Responsive React interface
* React Router navigation
* Protected pages
* Login interface
* Dashboard interface
* Users management page
* Agents management page
* Properties management page

---

## 🛠️ Tech Stack

### Frontend

* React.js
* Vite
* JavaScript
* HTML5
* CSS3
* React Router
* Axios

### Backend

* Node.js
* Express.js
* JWT
* bcryptjs
* CORS
* dotenv

### Database

* MySQL
* mysql2

### Development Tools

* VS Code
* Git
* GitHub
* ESLint
* npm

---

## 📁 Project Structure

```text
REAL-ESTATE/
│
├── backend/
│   ├── config/
│   │   └── db.js
│   │
│   ├── controllers/
│   │   ├── adminController.js
│   │   ├── authController.js
│   │   └── propertyController.js
│   │
│   ├── middleware/
│   │   └── authMiddleware.js
│   │
│   ├── models/
│   │   ├── propertyModel.js
│   │   └── userModel.js
│   │
│   ├── routes/
│   │   ├── adminRoutes.js
│   │   ├── authRoutes.js
│   │   └── propertyRoutes.js
│   │
│   ├── utils/
│   │   └── generateToken.js
│   │
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   └── server.js
│
├── database/
│   ├── schema.sql
│   └── seed.sql
│
└── frontend/
    ├── public/
    ├── src/
    │   ├── pages/
    │   │   ├── Agents.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── Login.jsx
    │   │   ├── Properties.jsx
    │   │   └── Users.jsx
    │   │
    │   ├── App.jsx
    │   ├── App.css
    │   ├── index.css
    │   └── main.jsx
    │
    ├── package.json
    └── vite.config.js
```

---

## ⚙️ Installation

### 1. Clone the repository

```bash
git clone https://github.com/nariyahet/real-estate-management-system.git
```

### 2. Navigate to the project

```bash
cd real-estate-management-system
```

---

## 🔧 Backend Setup

Navigate to the backend:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file:

```env
PORT=5000

DB_HOST=localhost
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=real_estate
DB_PORT=3306

JWT_SECRET=your_jwt_secret
```

> Never commit your real `.env` file to GitHub.

Start the backend:

```bash
node server.js
```

Backend will run on:

```text
http://localhost:5000
```

Health check:

```text
http://localhost:5000/api/health
```

---

## 🗄️ Database Setup

Create the MySQL database using:

```text
database/schema.sql
```

Then insert demo/initial data using:

```text
database/seed.sql
```

Make sure your MySQL credentials match the `.env` configuration.

---

## 💻 Frontend Setup

Open another terminal and navigate to:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The frontend will normally be available at:

```text
http://localhost:5174
```

---

## 🔑 Demo Accounts

For local development, demo accounts can be created through the provided database seed file.

Example roles:

| Role  | Access                      |
| ----- | --------------------------- |
| Admin | Full administrative access  |
| Agent | Agent-related functionality |
| User  | Standard user access        |

> Use your local database credentials and seeded accounts when testing the application.

---

## 🔒 Security

This project implements several security practices:

* JWT authentication
* bcrypt password hashing
* Role-based authorization
* Protected API routes
* Environment variables for secrets
* `.env` excluded from Git
* Generic authentication error messages
* Production-safe API error responses
* CORS configuration
* Dependency vulnerability auditing

The backend currently passes:

```text
npm audit
found 0 vulnerabilities
```

---

## 🧪 Development Checks

Frontend lint:

```bash
npm run lint
```

Production build:

```bash
npm run build
```

Backend dependency security check:

```bash
npm audit
```

---

## 📡 API Structure

### Authentication

```text
POST /api/auth/login
POST /api/auth/register
```

### Admin

```text
GET    /api/admin/dashboard-stats
GET    /api/admin/users
GET    /api/admin/agents
PUT    /api/admin/users/:id/role
GET    /api/admin/properties
PUT    /api/admin/properties/:id/status
DELETE /api/admin/properties/:id
```

### Health

```text
GET /api/health
```

---

## 🌐 Current Development URLs

Frontend:

```text
http://localhost:5174
```

Backend:

```text
http://localhost:5000
```

API:

```text
http://localhost:5000/api
```

> These are local development URLs. Production URLs will be added after deployment.

---

## 📈 Future Improvements

Planned improvements may include:

* Property image uploads
* Advanced property search and filtering
* Property details page
* Agent dashboard
* User profile management
* Favorites/wishlist
* Property inquiry system
* Email notifications
* Cloud image storage
* Production deployment
* Custom domain
* Analytics
* Advanced admin reports

---

## 👨‍💻 Author

**Het Nariya**

Software Developer | Full Stack Developer

### Technologies

React.js • Node.js • Express.js • MySQL • JavaScript • HTML5 • CSS3 • Git • GitHub

---

## 📄 License

This project is created for learning, portfolio, and development purposes.

---

⭐ If you find this project useful, consider giving it a star on GitHub.
