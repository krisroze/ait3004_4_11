from pydantic import BaseModel

# Định nghĩa schema (cấu trúc dữ liệu đầu vào) cho yêu cầu xác thực khuôn mặt
class VerifyFaceRequest(BaseModel):
    recipientName: str
    accountNumber: str
    amount: int
    image_data: str