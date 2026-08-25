# 🏠 Real Estate Management System

A full-stack **Real Estate Management System** built with React.js, Node.js, Express.js, and MySQL.

The application provides a structured platform for managing properties, users, agents, authentication, and property-related data through a modern web interface and RESTful APIs.

## 🚀 Features

### 👤 Authentication

* User registration and login
* Secure password hashing with bcrypt
* JWT-based authentication
* Protected API routes
* User authentication middleware

### 🏘️ Property Management

* View available properties
* View property details
* Add new properties
* Update properties
* Delete properties
* Agent-specific property management
* Property search/filter support

### 👨‍💼 Agent Management

* Agent information
* Agent property management
* Protected agent operations
* Permission-based property operations

### 👨‍💻 Admin Management

* Admin authentication
* User management APIs
* Property management capabilities
* Protected administrative routes

### 🗄️ Database

* MySQL relational database
* User management
* Property management
* Database schema
* Seed/demo data
* Connection pooling with `mysql2`

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

### Database

* MySQL

### Development Tools

* Git
* GitHub
* VS Code
* npm

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

## ⚙️ Installation

### 1. Clone the repository

```bash
git clone https://github.com/nariyahet/real-estate.git
```

### 2. Open the project

```bash
cd real-estate
```

## 🎨 Frontend Setup

Go to the frontend directory:

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

The Vite development server will provide a local URL in the terminal.

## ⚙️ Backend Setup

Open another terminal and go to the backend directory:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file inside the `backend` directory.

Example:

```env
PORT=5000

DB_HOST=your_database_host
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=real_estate_db
DB_PORT=3306

JWT_SECRET=your_jwt_secret
```

Then start the backend:

```bash
npm start
```

For development with nodemon:

```bash
npm run dev
```

## 🗄️ Database Setup

Create a MySQL database:

```sql
CREATE DATABASE real_estate_db;
```

Then execute:

```text
database/schema.sql
```

After creating the tables, you can use:

```text
database/seed.sql
```

to insert demo/initial data.

## 🔐 Environment Variables

For security, environment variables are **not included in the GitHub repository**.

Create your own:

```text
backend/.env
```

and configure your database credentials and JWT secret.

Never commit your real `.env` file to GitHub.

## 🔌 API

The backend exposes RESTful API endpoints for:

* Authentication
* User management
* Property management
* Agent property operations
* Administrative operations

The backend runs locally on:

```text
http://localhost:5000
```

API routes use the `/api` prefix.

## 🔒 Security

The project includes:

* Password hashing using bcrypt
* JWT authentication
* Protected routes
* Role/permission checks
* Environment variables for sensitive configuration
* CORS configuration

## 📱 Responsive Design

The frontend is designed to provide a responsive experience across desktop and smaller screen sizes.

## 🎯 Project Purpose

This project was developed as a **full-stack web development portfolio project** to demonstrate practical experience with:

* React.js
* Node.js
* Express.js
* MySQL
* REST APIs
* Authentication
* CRUD operations
* Database integration
* Git/GitHub

## 👨‍💻 Developer

**Het Nariya**

Full Stack Web Developer

### Skills Demonstrated

`React.js` · `Node.js` · `Express.js` · `JavaScript` · `MySQL` · `REST API` · `JWT` · `Git` · `GitHub`

## 📄 License

This project is created for educational, portfolio, and demonstration purposes.
