# 🏠 Real Estate Management System

A modern full-stack **Real Estate Management System** built with **React.js, Node.js, Express.js, and MySQL**.

The application provides a structured platform for managing properties, users, agents, authentication, and property-related data through a modern responsive interface and RESTful APIs.

---

## 🚀 Live Demo

🌐 **Live Website:**
https://real-estate-eight-ochre.vercel.app

🔗 **GitHub Repository:**
https://github.com/nariyahet/real-estate

### 🔐 Demo Login

Use the demo account below to explore the application:

```text
Email: demo@realestate.com
Password: Demo@123
```

> **Note:** Demo credentials are provided for portfolio and client demonstration purposes.

---

## ✨ Features

### 👤 Authentication

* User registration and login
* Secure password hashing with bcrypt
* JWT-based authentication
* Protected API routes
* Authentication middleware
* Persistent login session
* User profile management

### 🏘️ Property Management

* View available properties
* View detailed property information
* Add new properties
* Update properties
* Delete properties
* Agent-specific property management
* Property search and filtering
* Property image support
* Property CRUD operations

### 👨‍💼 Agent Management

* Agent information
* Agent-specific property management
* Protected agent operations
* Permission-based property operations
* Agent property ownership validation

### 👨‍💻 Admin Management

* Admin authentication
* Protected administrative routes
* User management APIs
* Property management capabilities
* Role-based authorization
* Administrative property operations

### 🗄️ Database

* MySQL relational database
* User management
* Property management
* Database schema
* Seed/demo data
* Connection pooling using `mysql2`

### 📱 Responsive Design

* Responsive layout
* Desktop support
* Tablet support
* Mobile-friendly interface
* Modern user interface

---

## 🛠️ Tech Stack

### Frontend

* React.js
* Vite
* JavaScript
* HTML5
* CSS3
* Axios
* React Router

### Backend

* Node.js
* Express.js
* REST API
* JWT
* bcryptjs
* CORS
* dotenv
* MySQL2
* Multer

### Database

* MySQL

### Deployment

* Vercel — Frontend
* Render — Backend
* Aiven — MySQL Database

### Development Tools

* Git
* GitHub
* VS Code
* npm
* Postman

---

## 📁 Project Structure

```text
REAL-ESTATE/
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── pages/
│   │   ├── assets/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   │
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── server.js
│   ├── addProperties.js
│   └── addPropertyImages.js
│
├── database/
│   ├── schema.sql
│   └── seed.sql
│
├── .gitignore
└── README.md
```

---

## ⚙️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/nariyahet/real-estate.git
```

### 2. Open the Project

```bash
cd real-estate
```

---

## 🎨 Frontend Setup

Navigate to the frontend directory:

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

Vite will provide a local development URL in the terminal.

---

## ⚙️ Backend Setup

Open another terminal and navigate to the backend directory:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file inside the `backend` directory.

### Environment Configuration

```env
PORT=5000

DB_HOST=your_database_host
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=real_estate_db
DB_PORT=3306

JWT_SECRET=your_jwt_secret
```

Start the backend:

```bash
npm start
```

For development with nodemon:

```bash
npm run dev
```

---

## 🗄️ Database Setup

Create a MySQL database:

```sql
CREATE DATABASE real_estate_db;
```

Execute the database schema:

```text
database/schema.sql
```

Then insert demo/initial data:

```text
database/seed.sql
```

The application uses MySQL connection pooling through `mysql2`.

---

## 🔌 API

The backend provides RESTful API endpoints for:

* Authentication
* User management
* Property management
* Agent property operations
* Administrative operations

### Local Backend

```text
http://localhost:5000
```

### Health Check

```text
http://localhost:5000/api/health
```

### Production Backend

```text
https://real-estate-backend-kved.onrender.com
```

### Production Health Check

```text
https://real-estate-backend-kved.onrender.com/api/health
```

All API routes use the `/api` prefix.

---

## 🔐 Environment Variables & Security

Sensitive environment variables are **not included in this repository**.

Create:

```text
backend/.env
```

and configure:

```env
DB_HOST=your_database_host
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=real_estate_db
DB_PORT=3306
JWT_SECRET=your_jwt_secret
```

### Security Practices

* Never commit `.env` files
* Never expose database credentials
* Never expose JWT secrets
* Use environment variables for sensitive configuration
* Use bcrypt for password hashing
* Use JWT for authentication
* Protect private API routes

---

## 🌐 Deployment

The project is deployed using a separated frontend/backend architecture.

### Frontend

**Vercel**

```text
https://real-estate-eight-ochre.vercel.app
```

### Backend

**Render**

```text
https://real-estate-backend-kved.onrender.com
```

### Database

**Aiven MySQL**

The production backend connects to the hosted MySQL database through secure environment variables.

---

## 🔒 Security

The application implements several security practices:

* Password hashing with bcrypt
* JWT-based authentication
* Protected API routes
* Role-based authorization
* User ownership validation
* Environment variables for secrets
* CORS configuration
* Server-side validation
* Database parameterized queries

---

## 📱 Responsive Design

The frontend is designed to provide a responsive experience across:

* Desktop
* Laptop
* Tablet
* Mobile devices

---

## 🎯 Project Purpose

This project was developed as a **full-stack web development portfolio project** to demonstrate practical experience in building and deploying a complete web application.

### Skills Demonstrated

* React.js
* Node.js
* Express.js
* JavaScript
* MySQL
* REST APIs
* JWT Authentication
* bcrypt
* CRUD Operations
* Database Integration
* Role-Based Authorization
* Responsive Web Design
* Git
* GitHub
* Vercel
* Render
* API Integration

---

## 👨‍💻 Developer

### Het Nariya

**Full Stack Web Developer**

Building modern, responsive, and scalable web applications using JavaScript technologies.

### Technical Skills

`React.js` · `Node.js` · `Express.js` · `JavaScript` · `MySQL` · `REST API` · `JWT` · `HTML5` · `CSS3` · `Git` · `GitHub`

---

## 📄 License

This project was created for **educational, portfolio, and demonstration purposes**.
