from sqlalchemy import Column, Integer, String, DateTime, Text, Float
from sqlalchemy.sql import func
from app.database import Base

# ==========================================
# BẢNG 1: LỊCH SỬ GIAO DỊCH 
# ==========================================
class Transfer(Base):
    __tablename__ = "transfers"

    id = Column(Integer, primary_key=True, index=True)
    
    # THÊM MỚI: Phân loại giao dịch (VD: 'transfer' = Chuyển tiền, 'topup' = Nạp tiền ĐT)
    transaction_type = Column(String(50), default="transfer")
    
    recipient_name = Column(String(255))
    account_number = Column(String(50)) # Nếu nạp tiền ĐT, cột này sẽ lưu số điện thoại
    amount = Column(Integer)
    status = Column(String(20))
    transaction_time = Column(DateTime)
    snapshot_url = Column(Text)


# ==========================================
# BẢNG 2: THÔNG TIN TÀI KHOẢN
# ==========================================
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    fullname = Column(String(100), nullable=False)          # Họ và tên
    account_number = Column(String(50), unique=True, index=True, nullable=False) # Số TK (Duy nhất)
    
    # THÊM MỚI: Số điện thoại người dùng (Dùng cho nạp tiền ĐT)
    phone_number = Column(String(20), unique=True, index=True, nullable=True) 
    
    bank_name = Column(String(50), nullable=False)          # Ngân hàng (VD: BIDV)
    password = Column(String(255), nullable=False)          # Mật khẩu
    balance = Column(Float, default=500000.0)               # Số dư (Tặng sẵn 500k để test)
    face_id = Column(String(255), nullable=True)            # Tên file ảnh/ID khuôn mặt
    created_at = Column(DateTime(timezone=True), server_default=func.now())