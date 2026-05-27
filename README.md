## AIT3004 - Hệ thống nhận diện khuôn mặt cho app ngân hàng

---
## Setup

Copy file môi trường

```bash 
cp .env.example .env
.cp frontend/.env.example frontend/.env
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
 - 