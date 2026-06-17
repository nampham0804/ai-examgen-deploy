# Hướng dẫn Khởi chạy và Kiểm tra tính năng Blueprint CRUD (Phase 1)

Tài liệu này hướng dẫn cách khởi chạy dự án và kiểm tra tính năng Blueprint CRUD mà chúng ta vừa hoàn thiện.

---

## 1. Hướng dẫn khởi chạy Backend (FastAPI)

Backend chứa các logic API và Database schema cho Blueprint.

### Bước 1: Cài đặt thư viện
Mở Terminal tại thư mục gốc của dự án (`C2-App-141`) và chạy:
```bash
pip install -r requirements.txt
```

### Bước 2: Khởi chạy Server
Khởi chạy server FastAPI bằng Uvicorn:
```bash
python -m uvicorn src.main:app --reload --port 8000
```
*Server sẽ chạy tại: `http://localhost:8000`*

---

## 2. Hướng dẫn khởi chạy Frontend (React + Vite)

Frontend chứa giao diện thiết lập ma trận đề thi.

### Bước 1: Đi tới thư mục Frontend
Mở một Terminal khác và di chuyển vào thư mục `frontend`:
```bash
cd frontend
```

### Bước 2: Cài đặt dependencies (nếu chưa cài)
```bash
npm install
```

### Bước 3: Cấu hình biến môi trường
Mở hoặc tạo file `.env` trong thư mục `frontend/` và thêm cờ MOCK (để sử dụng dữ liệu giả khi Backend chưa kết nối Database thật):
```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_USE_MOCK=true
```

### Bước 4: Khởi chạy Frontend
```bash
npm run dev
```
*Giao diện sẽ chạy tại địa chỉ được log trên terminal (thường là `http://localhost:5173`).*

---

## 3. Cách kiểm tra (Testing)

### 3.1. Kiểm tra Backend bằng Swagger UI
1. Mở trình duyệt và truy cập: [http://localhost:8000/docs](http://localhost:8000/docs)
2. Kéo xuống phần **blueprints**.
3. **Test POST `/api/v1/blueprints` (Create)**:
   - Nhấn **Try it out**.
   - Nhập Request Body mẫu:
     ```json
     {
       "course_id": 1,
       "title": "Đề giữa kỳ - Demo",
       "items": [
         {
           "learning_outcome_id": 1,
           "question_type": "mcq",
           "easy_count": 5,
           "medium_count": 3,
           "hard_count": 2
         }
       ]
     }
     ```
   - Nhấn **Execute** và kiểm tra Server trả về response 200 OK kèm dữ liệu Blueprint.
   - *Lưu ý*: Do DB Dependency đang dùng placeholder (yield None), nếu gọi DB trực tiếp có thể báo lỗi. Nhưng cấu trúc Route, Validate Pydantic đã chạy chuẩn xác.

### 3.2. Kiểm tra Frontend Giao diện
1. Mở trình duyệt vào trang Frontend (Vd: `http://localhost:5173`).
2. Điều hướng tới menu hoặc trang **Exam Blueprint** (`/blueprints`).
3. Bạn sẽ thấy bảng Ma trận đề thi với các cột Easy, Medium, Hard.
4. Chỉnh sửa số lượng câu hỏi trên các ô input.
5. Kiểm tra tính năng **Validate Blueprint** (Nút Validate):
   - Thay đổi các tỷ lệ khác nhau để xem màu sắc cảnh báo đổi sang Xanh (Cân bằng) hoặc Cam (Cần điều chỉnh).
6. Kiểm tra tính năng **Save Blueprint**:
   - Nhấn nút **Save**.
   - Nút sẽ đổi trạng thái thành *Loading...* (Giả lập delay API 800ms).
   - Sau đó xuất hiện khung thông báo màu xanh báo hiệu thành công (do đang dùng Mock data `VITE_USE_MOCK=true`).

---

## 4. Các bước tiếp theo
- Sau khi kết nối Database PostgreSQL thật và có `SessionLocal` trong `deps.py`, bạn có thể đổi `VITE_USE_MOCK=false` ở Frontend để gọi dữ liệu thật từ Database Backend.
- Bắt đầu triển khai Phase 2: Logic Validation nâng cao kết nối với bảng Questions.
