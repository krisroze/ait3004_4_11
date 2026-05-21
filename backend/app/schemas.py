from pydantic import BaseModel
from typing import Optional

# =======================================================================
# CÁC KHUÔN MẪU CŨ (GIỮ NGUYÊN ĐỂ KHÔNG BỊ LỖI CÁC ROUTER/APP CŨ)
# =======================================================================
class VerifyRequest(BaseModel):
    recipientName: str
    accountNumber: str
    amount: int
    image_data: str


# =======================================================================
# CÁC KHUÔN MẪU CHO TÍNH NĂNG ĐĂNG KÝ (ĐÃ CHẠY ỔN ĐỊNH)
# =======================================================================

# 1. Khuôn nhận dữ liệu từ Frontend gửi lên khi bấm "Đăng ký"
class UserRegisterRequest(BaseModel):
    fullname: str
    account_number: str
    bank_name: str
    password: str
    image_data: str  # Chuỗi dữ liệu ảnh Base64 chụp từ webcam lúc đăng ký

# 2. Khuôn phản hồi kết quả về cho Frontend khi Đăng ký thành công
class UserResponse(BaseModel):
    id: int
    fullname: str
    account_number: str
    bank_name: str
    balance: float
    face_id: Optional[str] = None

    class Config:
        from_attributes = True  # Giúp Pydantic đọc dữ liệu trực tiếp từ MySQL qua SQLAlchemy


# =======================================================================
# THÊM MỚI: KHUÔN MẪU PHỤC VỤ CHO LOGIC CHUYỂN TIỀN NỘI BỘ VÀ XÁC THỰC FACEID
# =======================================================================

# Khuôn nhận gói dữ liệu giao dịch toàn diện từ Frontend gửi lên khi bấm chuyển tiền
class TransferExecutionRequest(BaseModel):
    sender_account_number: str      # Số tài khoản người gửi (Người đang đăng nhập trên app)
    recipient_account_number: str   # Số tài khoản người nhận cùng ngân hàng VNU Bank
    amount: float                   # Số tiền cần chuyển giao dịch
    image_data: str                 # Ảnh khuôn mặt người gửi chụp từ webcam lúc nhấn chuyển tiền