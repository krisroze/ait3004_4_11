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
# CÁC KHUÔN MẪU CHO TÍNH NĂNG ĐĂNG KÝ (ĐÃ CẬP NHẬT THÊM SỐ ĐIỆN THOẠI)
# =======================================================================

# 1. Khuôn nhận dữ liệu từ Frontend gửi lên khi bấm "Đăng ký"
class UserRegisterRequest(BaseModel):
    fullname: str
    phone_number: str  # ĐÃ THÊM: Bắt buộc có số điện thoại lúc đăng ký
    account_number: str
    bank_name: str
    password: str
    image_data: str  # Chuỗi dữ liệu ảnh Base64 chụp từ webcam lúc đăng ký

# 2. Khuôn phản hồi kết quả về cho Frontend khi Đăng ký thành công
class UserResponse(BaseModel):
    id: int
    fullname: str
    phone_number: Optional[str] = None # ĐÃ THÊM: Trả về số điện thoại
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


# =======================================================================
# THÊM MỚI: KHUÔN MẪU CHO TÍNH NĂNG ĐĂNG NHẬP VÀ QUÊN MẬT KHẨU
# =======================================================================

# Khuôn nhận dữ liệu khi người dùng quét mặt để Đăng nhập
class LoginFaceRequest(BaseModel):
    account_number: str
    image_data: str

# Khuôn nhận dữ liệu khi người dùng quét mặt để Khôi phục mật khẩu
class ResetPasswordRequest(BaseModel):
    account_number: str
    new_password: str
    image_data: str


# =======================================================================
# THÊM MỚI: KHUÔN MẪU CHO TÍNH NĂNG NẠP TIỀN ĐIỆN THOẠI
# =======================================================================

# Khuôn nhận dữ liệu từ Frontend khi thực hiện nạp tiền điện thoại
class TopupRequest(BaseModel):
    account_number: str  # Tài khoản nguồn (người đang đăng nhập sẽ bị trừ tiền)
    phone_number: str    # Số điện thoại cần nạp
    amount: int          # Mệnh giá nạp (VD: 10000, 20000)
    image_data: str      # Ảnh khuôn mặt để xác thực giao dịch

# =======================================================================
# THÊM MỚI: KHUÔN MẪU CHO TÍNH NĂNG MUA TÀI KHOẢN SỐ ĐẸP
# =======================================================================
class BuyBeautifulAccountRequest(BaseModel):
    old_account_number: str
    new_account_number: str
    amount: int
    image_data: str

# =======================================================================
# THÊM MỚI: KHUÔN MẪU CHO TÍNH NĂNG THANH TOÁN HÓA ĐƠN
# =======================================================================
class BillPaymentRequest(BaseModel):
    account_number: str
    bill_provider: str   # Tên nhà cung cấp (VD: Điện lực EVN)
    customer_code: str   # Mã khách hàng
    amount: int
    image_data: str