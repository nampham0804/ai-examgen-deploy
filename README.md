# AI Exam Generator (C2-App-141)

Hệ thống AI hỗ trợ giáo viên tự động tạo đề thi (Exam Generation) từ Ngân hàng câu hỏi (Question Bank) dựa trên Ma trận đề thi (Blueprint). Dự án tích hợp LLM Agent (LangGraph) để sinh và xác thực câu hỏi, kết hợp với giao diện React hiện đại.

## 📂 Repository Structure

```text
C2-App-141/
|-- README.md                 # Project overview and setup guide
|-- JOURNAL.md                # Team learning journal and decisions
|-- WORKLOG.md                # Daily task tracking by member
|-- requirements.txt          # Python backend dependencies
|-- Dockerfile                # Backend container image
|-- docker-compose.yml        # Local Docker orchestration
|-- Makefile                  # Common backend commands
|-- .env.example              # Environment variable template
|-- .gitignore                # Git ignore rules
|
|-- src/                      # Backend source code: FastAPI + LangGraph
|   |-- main.py               # FastAPI app entrypoint
|   |-- config.py             # App settings loaded from environment
|   |-- api/                  # API routes and dependencies
|   |-- agents/               # LangGraph agent graph, state, nodes, tools, prompts
|   |-- services/             # LLM, RAG, embedding, monitoring services
|   |-- models/               # Pydantic request/response schemas
|   |-- repositories/         # Database access layer
|   `-- utils/                # Shared backend utilities
|
|-- frontend/                 # Frontend application workspace
|   |-- package.json          # Frontend package and scripts
|   |-- src/                  # Frontend source code
|   |-- public/               # Static frontend assets
|   `-- README.md             # Frontend-specific notes
|
|-- docs/                     # Technical and product documentation
|   |-- architecture.md       # System architecture overview
|   |-- api_spec.md           # API contract and examples
|   |-- deployment.md         # Deployment instructions
|   `-- guide/                # Original AI20K technical guide reference
|
|-- reports/                  # Team deliverable reports
|   |-- weekly/               # Weekly reports and reusable template
|   |-- evaluation_report.md  # Evaluation metrics and manual test cases
|   `-- final/                # Final report and demo script
|
|-- data/                     # Local data folders; contents ignored by Git
|   |-- raw/                  # Original input data
|   |-- processed/            # Cleaned or transformed data
|   `-- vector_store/         # Local vector DB files
|
|-- tests/                    # Backend test suite
|-- eval/                     # Evaluation assets and outputs
|-- presentation/             # Pitch deck and video demo materials
`-- scripts/                  # Setup and AI logging scripts
```

## 🚀 Setup Instructions

Dự án bao gồm 2 phần chính: Backend (FastAPI) và Frontend (React/Vite).

### 1. Database Setup (Tùy chọn)

Dự án sử dụng PostgreSQL. Nếu bạn đã cài đặt Docker, cách nhanh nhất để khởi chạy Database là:

```bash
docker-compose up -d db
```
Hệ thống sẽ tự động tạo một database PostgreSQL tại `localhost:5432`.

### 2. Backend (FastAPI + LangGraph)

Yêu cầu: Python 3.10+

```bash
# Di chuyển vào thư mục dự án
cd C2-App-141

# Tạo và kích hoạt môi trường ảo
python -m venv .venv
source .venv/bin/activate  # Trên Windows dùng: .venv\Scripts\activate

# Cài đặt thư viện
pip install -r requirements.txt

# Khởi chạy Backend
uvicorn src.main:app --reload --port 8000
```
Swagger UI (API Docs) sẽ có mặt tại: `http://localhost:8000/docs`

### 3. Frontend (React + Vite + TailwindCSS)

Yêu cầu: Node.js 18+

```bash
# Mở một terminal mới, chuyển vào thư mục frontend
cd C2-App-141/frontend

# Cài đặt dependencies
npm install

# Khởi chạy Frontend
npm run dev
```
Truy cập giao diện Web tại: `http://localhost:5173`

---

## ⚙️ Environment Variables (.env)

Tạo một file `.env` ở thư mục gốc (bạn có thể copy từ `.env.example`) và cấu hình các biến sau:

```env
# ---- LLM Configuration ----
LLM_PROVIDER=minimax
MINIMAX_API_KEY=sk-your-key-here
MINIMAX_BASE_URL=https://api.tokenrouter.com/v1
MINIMAX_MODEL=MiniMax-M3

# Hoặc dùng OpenAI/Anthropic:
# OPENAI_API_KEY=sk-...
# DEFAULT_MODEL=gpt-4o

# ---- Database ----
# Chuỗi kết nối đến PostgreSQL (Nếu dùng Docker compose như trên thì giữ nguyên)
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# ---- App Config ----
APP_PORT=8000
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## 💡 Sample Queries (API)

Dưới đây là một số ví dụ để tương tác trực tiếp với API Backend qua `curl`.

### 1. Lấy danh sách Môn học (Courses)
```bash
curl -X GET "http://localhost:8000/api/v1/courses" \
  -H "Accept: application/json"
```

### 2. Tạo một Ma trận đề thi mới (Blueprint)
```bash
curl -X POST "http://localhost:8000/api/v1/blueprints" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Đề thi Giữa kỳ CS101",
    "course_id": 1,
    "items": [
      {
        "learning_outcome_id": 1,
        "question_type": "mcq",
        "easy_count": 2,
        "medium_count": 2,
        "hard_count": 1
      }
    ]
  }'
```

### 3. Sinh đề thi tự động từ Blueprint (Generate Exam)
```bash
# Thay số 1 bằng blueprint_id thực tế
curl -X POST "http://localhost:8000/api/v1/exams/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "blueprint_id": 1,
    "title": "Đề thi chính thức",
    "duration_minutes": 60
  }'
```
