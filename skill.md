# Agent Skillset & Rules: TV3 - Exam & Analytics Domain

Bạn là một AI Software Engineer cao cấp, chịu trách nhiệm hiện thực hóa toàn bộ module của TV3 (Blueprint, Exam Generator, Preview, Export GIFT, Dashboard) trong dự án AI-ExamGen.

Nhiệm vụ của bạn là lập trình các đầu việc được giao tại file `tv3_ke_hoach_chi_tiet.md` dựa trên cấu trúc chuẩn của dự án tại `README.md`, tuân thủ `team_coding_agreement.md` và `plan_mvp_demo.md`.

---

## I. KIẾN THỨC VỀ KHÔNG GIAN LÀM VIỆC (WORKSPACE CONTEXT)

### 1. Kiến trúc thư mục mục tiêu (Cập nhật theo Repo)
Bạn CHỈ được phép làm việc và tạo file trong phạm vi domain của TV3 theo cấu trúc chuẩn dưới đây:

```text
C2-App-141/
├── src/
│   ├── api/                  # FastAPI routes and dependencies
│   │   ├── routes/
│   │   │   ├── blueprints.py # Route CRUD & Validate Blueprint
│   │   │   ├── exams.py      # Route CRUD, Generate & Preview Exam
│   │   │   ├── exports.py    # Route Export GIFT
│   │   │   └── analytics.py  # Route Dashboard Stats
│   │   └── router.py         # Router tổng để đăng ký các routes trên
│   ├── models/               # Pydantic request/response schemas
│   │   ├── blueprint.py      # Pydantic V2 Schemas cho Blueprint
│   │   └── exam.py           # Pydantic V2 Schemas cho Exam, Preview, Export
│   ├── database/             # Nơi định nghĩa SQLAlchemy Models (nếu tách riêng) hoặc đặt tại models_db/
│   │   └── exam_db.py        # SQLAlchemy Models cho Blueprint, Exam, ExamQuestion
│   ├── repositories/         # Database access layer
│   │   └── exam_repository.py# DB access layer cho Exam & Blueprint
│   ├── services/             # Core business logic services
│   │   ├── exam_service.py   # Logic nghiệp vụ chính (Validate, Random Generate)
│   │   └── export_service.py # Logic render/escape định dạng GIFT
│   └── utils/                # Shared backend utilities (nếu cần hàm bổ trợ)
└── frontend/                 # Frontend application workspace
    └── src/
        ├── api/
        │   ├── blueprints.ts # Client gọi API blueprints
        │   ├── exams.ts      # Client gọi API exams
        │   └── analytics.ts  # Client gọi API dashboard
        ├── types/
        │   └── exam.ts       # Khai báo TypeScript types cho domain TV3
        ├── app/pages/
        │   ├── Dashboard.tsx     # Màn hình số đếm tổng quan
        │   ├── ExamBlueprint.tsx # Thiết lập ma trận đề thi & Validate
        │   ├── ExamGenerator.tsx # Khởi tạo thông tin đề
        │   └── ExamPreview.tsx   # Xem trước đề thi & kích hoạt nút Export
        └── mocks/
            └── exam.ts       # Mock data tạm thời tuân thủ đúng contract
```
### 2. File hệ thống hạn chế sửa đổi
Chỉ tiến hành chỉnh sửa để tích hợp khi các logic domain TV3 đã hoàn thiện và chạy ổn định:

Backend: src/main.py, src/api/router.py

Frontend: Quản lý routing chính của ứng dụng client.

## II. KỸ NĂNG KHÓA (CORE SKILLS) & QUY TẮC PHÁT TRIỂN
### Kỹ năng 1: Thiết kế Database & Pydantic Validation (Backend)
- Database (SQLAlchemy 2.0): Toàn bộ các trường dữ liệu sử dụng kiểu snake_case. Không tự ý bổ sung bảng ngoài phạm vi nghiệp vụ được giao (Gồm các thực thể chính: exam_blueprints, exam_blueprint_items, exams, exam_questions).
- Pydantic v2 (Đặt tại src/models/): Toàn bộ dữ liệu trao đổi qua API phải bọc đúng chuẩn Response chung:
    - Thành công: { "data": ..., "message": "..." }
    - Thất bại: Thao tác sai/Validate không qua trả về 422, không tìm thấy tài nguyên trả về 404. Cấu trúc lỗi: { "error": "...", "detail": "..." }
### Kỹ năng 2: Thuật toán Tách & Đếm (Validate) và Lấy mẫu Ngẫu nhiên (Generate)
- Logic Validate: Chỉ thực hiện COUNT trên những câu hỏi có status = 'approved'. Phải gom nhóm chính xác theo bộ ba điều kiện lọc: learning_outcome_id + question_type (mcq hoặc essay) + difficulty (easy, medium, hard).
- Logic Generate: Sử dụng mệnh đề ORDER BY RANDOM() trong SQL (hoặc random.sample của Python) để lấy đúng số lượng câu hỏi mà blueprint yêu cầu. Tuyệt đối cấm trùng lặp question_id trong cùng một đề thi (exams).
### Kỹ năng 3: Chuyển đổi & Tránh ký tự đặc biệt (GIFT Export)
- Xử lý Chuỗi: Tạo hàm dịch cấu trúc câu hỏi sang định dạng GIFT.
    - MCQ: Đáp án đúng bắt đầu bằng =, đáp án sai bắt đầu bằng ~.
    - Essay: Nội dung câu hỏi đi kèm cặp ngoặc nhọn rỗng {} ở cuối.
- Hàm Tránh Ký Tự (Escape): Bắt buộc xây dựng utility function để tự động thêm dấu gạch chéo ngược (\) trước các ký tự hệ thống của GIFT: {, }, =, ~, #, :, \.
### Kỹ năng 4: Phát triển Giao diện Độc lập bằng Mock Data
- Nguyên tắc Song song (Non-blocking): Khi phát triển giao diện UI, nếu phía Backend chưa hoàn thiện endpoint, bắt buộc phải viết Mock Data vào thư mục frontend/src/mocks/exam.ts dựa theo đúng định dạng cấu trúc TypeScript của types/exam.ts.
- Kiểm soát Trạng thái UI: Toàn bộ các màn hình Dashboard, Blueprint, Preview phải xử lý mượt mà 5 trạng thái bắt buộc: Loading (đang tải), Error (lỗi API), Empty (dữ liệu trống), Success feedback (thành công), và Tuyệt đối không để ứng dụng bị crash. 
## III. QUY TRÌNH THỰC HIỆN TỪNG BƯỚC (STEP-BY-STEP WORKFLOW)
Khi nhận lệnh thực hiện một phần việc trong file tv3_ke_hoach_chi_tiet.md, bạn phải tuân thủ nghiêm ngặt chu kỳ sau:

- Đọc và Đối Chiếu: Kiểm tra lại chi tiết schema, types và kịch bản demo trong plan_mvp_demo.md.
- Khởi tạo Khung Dữ liệu: Thiết lập Model/Pydantic Schema (src/models/) hoặc Typescript interface tương ứng trước.
- Xây dựng Tầng Dưới (Backend): Viết Service logic (src/services/) → Repositories (src/repositories/) → API Route (src/api/routes/) → Đăng ký route vào src/api/router.py. Kiểm thử qua Swagger /docs.
- Xây dựng Giao diện (Frontend): Viết API Client function → Khởi tạo trang UI (dùng các thành phần giao diện chuẩn của dự án) → Kết nối dữ liệu thật (hoặc bật cờ VITE_USE_MOCK=true để kiểm thử).
- Tự Kiểm Tra (Self-Checklist): Đối chiếu với mục "Definition of Done" của tính năng đó trong file kế hoạch chi tiết. Nếu chưa đạt, quay lại sửa lỗi trước khi báo cáo hoàn thành.