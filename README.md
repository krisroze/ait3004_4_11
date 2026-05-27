## AIT3004 - Hệ thống nhận diện khuôn mặt cho app ngân hàng

---
## Setup

Copy file môi trường

```bash 
cp .env.example .env
cp frontend/.env.example frontend/.env
```

Docker compose
```bash
docker compose up -d
```

## Cấu trúc

| Thành phần | Dịch vụ | Tech |
|---|---|---|
| Frontend | `frontend_app` | Vite/React |
| Backend API | `backend_api` | FastAPI + Uvicorn |
| Background worker | `backend_worker` | Celery |
| Message broker | `redis` | Redis |
| SQL Database | `mysql_db` | MySQL |
| DB Admin | `phpmyadmin` | phpMyAdmin |
| Object storage | `minio` | MinIO |
| Vector database | `qdrant_db` | Qdrant |
| Load balancer / reverse proxy | `nginx` | Nginx |
| Monitoring | `prometheus`, `grafana`, `cadvisor` | Prometheus + Grafana + cAdvisor |
| CI | `.github/workflows/ci.yml` | GitHub Actions |

## Yêu cầu
 - **Frontend (user)**: 'frontend_app' (Vite/React) qua nginx
 - **Frontend (admin)**: **phpMyAdmin** cho quản trị cơ sở dữ liệu
 - **Backend**: 'backend_api' mở endpoint REST API
 - **Lưu trữ**: **MySQL**, **MinIO** và **Qdrant**
 - **Message/event queue**: **Redis** và **Celery worker**
 - **Load balancer**: **nginx**
 - **CI** qua **GitHub Actions**
 - **Monitoring** qua **Grafana** bằng **Prometheus** + **cAdvisor**

## Entry point
 (port mặc định)
 - **Frontend (user)**: [`http://localhost:8081`]
 - **Frontend (admin)**: [`http://localhost:8082`] (phpMyAdmin)
 - **Monitoring**: [`http://localhost:3000`]    
    'admin' / 'admin'

## Workflow

### Khởi động hệ thống
- Các dịch vụ được khởi động qua ``docker compose up -d``, kết nối qua docker

### Đăng ký tài khoản
- Người dùng truy cập frontend, chọn "Mở tài khoản"
- Người dùng nhập thông tin cá nhân, quét khuôn mặt
- Frontend gửi yêu cầu `api/register` đến backend với thông tin và ảnh của khách hàng
- Backend lưu ảnh gốc lên MinIO, tạo embedding vector qua DeepFace va lưu lên Qdrant, ghi thông tin user vào bảng users trên MySQL
- Giao diện báo đăng ký thành công  

### Đăng nhập bằng mật khẩu
- Người dùng nhập STK + MK
- Frontend gọi `api/login` đến backend
- Backend kiểm tra thông tin -> trả kết quả thành công / thất bại

### Đăng nhập bằng nhận diện khuôn mặt
- Người dùng nhấn nút để đăng nhập bằng nhận diện khuôn mặt và chụp ảnh khuôn mặt
- Frontend POST ảnh chụp tới `/api/login-face`
- Backend nhận ảnh và sinh embedding qua DeepFace
- Backend gọi Qdrant để khớp với vector embedding trong database
- Nếu điểm giống đạt ngưỡng, hệ thống cho phép đăng nhập, nếu không thì báo lỗi.

### Xác thực chuyển tiền bằng nhận diện khuôn mặt
- Người dùng điền thông tin chuyển tiền, xác nhận bằng khuôn mặt.
- Frontend gửi ảnh quét tới endpoint `/api/execute-transfer`.
- Backend xác thực embedding ảnh mới với dữ liệu của user (so sánh vector mới vs vector lưu trong Qdrant, kiểm tra cùng account_number).
- Nếu hợp lệ: backend xử lý chuyển khoản (giảm số dư người gửi, tăng người nhận), ghi log DB MySQL, cập nhật lịch sử.
- Lưu ảnh giao dịch vào MinIO qua Celery background worker.
- Trả kết quả về frontend.