# Quality Validation Metrics - Hệ thống tính toán và định nghĩa

Tài liệu này định nghĩa cách thức tính toán các chỉ số trong panel **Quality Validation** trên màn hình tạo đề thi tự động (Exam Generator), dựa trên cấu hình của Blueprint. 

Do panel này hiển thị và đánh giá chất lượng của Ma trận đề thi (Blueprint) *trước khi bốc đề* (và làm cơ sở để bốc đề), các dữ liệu đầu vào được lấy trực tiếp từ cấu hình chi tiết của Blueprint.

---

## 1. Tổng số câu (Total Questions)
- **Định nghĩa:** Tổng số lượng câu hỏi được quy định tổng thể cho ma trận đề thi.
- **Công thức tính:** Lấy trực tiếp từ thuộc tính `total_questions` của Blueprint.
- **Đầu ra:** Một con số nguyên (Ví dụ: `40`).

## 2. Số LO phủ (Learning Outcomes Coverage)
- **Định nghĩa:** Mức độ bao phủ các chuẩn đầu ra (Learning Outcomes - LOs) của môn học trong ma trận đề thi.
- **Công thức tính:** Lấy số lượng LOs được sử dụng thực tế chia cho tổng số lượng LOs quy định của môn học đó (`Số LO phủ / Tổng số LO của môn`).
  - `Số LO phủ:` Đếm số lượng các `learning_outcome_id` duy nhất (Unique) xuất hiện trong tất cả các `items` của Blueprint.
  - `Tổng số LO của môn:` Lấy từ hệ thống danh mục Chuẩn đầu ra tương ứng với `course_id`.
- **Đầu ra:** Định dạng `X/Y LO` (Ví dụ: `4/5 LO`).

## 3. Loại câu hỏi (Question Types)
- **Định nghĩa:** Danh sách các định dạng câu hỏi sẽ xuất hiện trong đề thi dựa trên ma trận.
- **Công thức tính:** Lọc các giá trị `question_type` duy nhất từ danh sách `items` của Blueprint. Ánh xạ các mã định dạng sang tên hiển thị (Ví dụ: `mcq` -> `MCQ`, `essay` -> `Essay`).
- **Đầu ra:** Chuỗi danh sách (Ví dụ: `MCQ + Essay`).

## 4. Blueprint Alignment (Độ khớp ma trận đề)
- **Định nghĩa:** Đo lường mức độ trùng khớp giữa số lượng câu hỏi thực tế được phân bổ chi tiết trong các tiêu chí (Items: Độ khó, Loại câu hỏi, Chuẩn đầu ra) so với tổng số lượng câu hỏi quy định gốc (`total_questions`). Chỉ số này đánh giá xem người dùng cấu hình chi tiết có khớp với mục tiêu tổng thể không.
- **Công thức tính:**
  - `Tổng số quy định (Total) = Blueprint.total_questions`
  - `Tổng số bốc thực tế dự kiến (Actual) = Tổng (easy_count + medium_count + hard_count) của tất cả Items`
  - `Độ chênh lệch (Diff) = | Total - Actual |`
  - `Alignment (%) = Max(0, 100 - (Diff / Total) * 100)`
- **Đầu ra:** Phần trăm (Ví dụ: `100%`). Đạt 100% khi cấu hình chi tiết khớp hoàn hảo với tổng số câu quy định.

## 5. Balance Score (Điểm số cân bằng)
- **Định nghĩa:** Đo lường mức độ phân bổ hài hòa của các câu hỏi giữa các Chuẩn đầu ra (LOs) và đảm bảo đề thi đã bao phủ đủ tất cả các Chuẩn đầu ra bắt buộc của môn học.
- **Thuật toán áp dụng:**
  **Bước 1:** Kiểm tra điều kiện bao phủ LOs:
  - Nếu `Số LO phủ < Tổng số LO của môn`: Kết luận ngay là **Mất cân bằng** (Đề thi không kiểm tra đủ toàn diện các mục tiêu học tập).
  
  **Bước 2:** Nếu đã phủ đủ 100% LOs, sử dụng **Hệ số biến thiên (Coefficient of Variation - CV)** dựa trên độ lệch chuẩn của số lượng câu hỏi trên mỗi LO để đánh giá độ hài hòa:
  1. Gộp tổng số lượng câu hỏi cho từng `learning_outcome_id`.
  2. Tính giá trị trung bình (`Mean`) số câu hỏi mỗi LO.
  3. Tính độ lệch chuẩn (`Standard Deviation - SD`).
  4. Tính `CV = SD / Mean`.
- **Phân loại nhãn trạng thái:**
  - **Mất cân bằng:** Khi cấu hình thiếu LO của môn học (Số LO phủ < Tổng số LO), HOẶC `CV > 0.5` (Đề thi dồn trọng số quá lớn vào một hoặc vài LO).
  - **CV ≤ 0.2**: `Rất cân bằng` (Số lượng câu hỏi chia đều cho các LO, và đã bao phủ 100% LO).
  - **0.2 < CV ≤ 0.5**: `Cân bằng` (Có độ lệch nhẹ nhưng vẫn trong mức cho phép, và đã bao phủ 100% LO).
  *(Trong trường hợp Blueprint không có LO nào, trạng thái mặc định là "N/A").*
