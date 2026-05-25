from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Giữ nguyên đường dẫn kết nối MySQL của bạn
DATABASE_URL = "mysql+pymysql://bank_user:bank_password@mysql_db:3306/bank_system"

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


# ========================================================
# HÀM BỔ SUNG: Tạo và tự động đóng/mở kết nối đến MySQL
# ========================================================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()  # Đảm bảo giao dịch xong sẽ đóng kết nối để tránh quá tải database