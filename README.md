# 🚀 CodeSphere

> **Your Classroom, Compiler, and Community in One Place**

CodeSphere is a full-stack collaborative coding platform that enables users to write, compile, and collaborate on code in real time. Designed for students, educators, and developers, it provides a seamless environment for live coding sessions with integrated chat, screen sharing, authentication, and multi-language code execution.

---

## ✨ Features

### 👨‍💻 Real-Time Collaborative Coding
- Write and edit code together in real time.
- Supports multiple programming languages:
  - C
  - C++
  - Java
  - Python
  - JavaScript
  - and more.

### ⚡ Online Code Compilation
- Compile and execute code directly within the platform.
- Instant output and error feedback.

### 💬 Live Chat
- Built-in chat system for communication between participants.
- Enables efficient collaboration during coding sessions.

### 🏠 Room Management
- Create collaborative coding rooms.
- Join rooms using unique Room IDs.
- Language-specific coding environments.

### 🔐 Authentication
- Email & Password Login
- Google OAuth Sign-In
- OTP Email Verification
- Forgot Password & Password Reset
- Secure JWT Authentication

### 👤 User Profile
- Manage account information.
- Personalized coding experience.

### 💾 Local Code Saving
- Save code locally on your device.
- Continue working without losing progress.

---

# 🛠 Tech Stack

## Frontend
- React.js
- Tailwind CSS
- ShadCN UI
- Monaco Editor
- Axios
- Socket.IO Client

## Backend
- Node.js
- Express.js
- MongoDB
- Socket.IO
- JWT Authentication

## Authentication
- Google OAuth
- Email OTP Verification
- JWT

---

# 📂 Project Structure

```
CodeSphere/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── ...
│
├── backend/
│   ├── controllers/
│   ├── routes/
│   ├── models/
│   ├── middleware/
│   └── ...
│
├── README.md
└── render.yaml
```

---

# 🚀 Getting Started

## Clone the Repository

```bash
git clone https://github.com/bhavay-wadhwa/codesphere.git
cd codesphere
```

---

## Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file inside the `backend` folder.

Example:

```env
PORT=4000

MONGODB_URL=your_mongodb_connection_string

JWT_SECRET=your_secret_key

GOOGLE_CLIENT_ID=your_google_client_id

GOOGLE_CLIENT_SECRET=your_google_client_secret

EMAIL=your_email

EMAIL_PASSWORD=your_app_password

FRONTEND_URL=http://localhost:5173
```

Start the backend server:

```bash
npm run dev
```

or

```bash
node --watch index.js
```

---

## Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env` file inside the `frontend` folder.

Example:

```env
VITE_API_URL=http://localhost:4000
```

Run the frontend:

```bash
npm run dev
```

Open your browser:

```
http://localhost:5173
```

---

# 🎯 Usage

## 1. Register/Login

- Sign up using Email & Password
- Verify your email using OTP
- Or continue with Google Sign-In

---

## 2. Create a Coding Room

- Select a programming language
- Create a room
- Receive a unique Room ID

---

## 3. Invite Participants

Share the Room ID with teammates.

They can instantly join the collaborative coding session.

---

## 4. Collaborate

Inside a room you can:

- Write code together
- Compile code
- Chat with teammates
- Share your screen
- Save code locally

---


# 🔮 Future Improvements

- Video Calling
- Voice Chat
- File Explorer
- Code Execution History
- AI Code Assistant
- Version Control
- Collaborative Whiteboard
- Dark/Light Theme
- Docker Deployment

---

# 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a new branch

```bash
git checkout -b feature-name
```

3. Commit your changes

```bash
git commit -m "Add new feature"
```

4. Push your branch

```bash
git push origin feature-name
```

5. Open a Pull Request

---

# 📄 License

This project is licensed under the MIT License.

---

# 👨‍💻 Author

**Bhavay Wadhwa**

GitHub: https://github.com/bhavay-wadhwa
