# 8051 Quiz Pro (Cloud & Local Mode)

This version of **8051 Quiz Pro** is ready for both local use and cloud hosting (Vercel + PostgreSQL).

## ☁️ Cloud Deployment (Vercel)

1. **GitHub**: Push your code to your GitHub repository.
2. **Vercel**: Import your repository into Vercel.
3. **Database**: Create a **Vercel Postgres** database in the "Storage" tab and connect it to your project.
4. **Build Settings**:
   - **Build Command**: `cd frontend && npm install && npm run build`
   - **Output Directory**: `frontend/dist`
   - **Root Directory**: `.` (root)

## 🚀 Local Start

1. **Run the Server**: Double-click **`run_quiz.bat`**.
2. **Open Dashboard**: Go to [http://localhost:8000](http://localhost:8000).
3. **Internet Sharing**: Double-click **`share_quiz.bat`** to get a public link.

## 🛠️ Project Structure

- `api/index.js`: Cloud-optimized backend (Serverless).
- `server.js`: Local-optimized backend.
- `frontend/`: React source code.
- `quiz.db`: Local SQLite database.
- `vercel.json`: Cloud routing configuration.

## 📦 Requirements
- **Node.js** (for local)
- **Vercel Account** (for cloud)
