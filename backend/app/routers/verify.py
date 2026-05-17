from fastapi import APIRouter
from datetime import datetime

from app.schemas import VerifyFaceRequest
from app.face_service import verify_face

router = APIRouter()

@router.post("/api/verify-face")
async def verify_face_api(data: VerifyFaceRequest):
    is_match = verify_face(data.image_data)

    if is_match:
        return {
            "status": "success",
            "message": "Xác thực khuôn mặt thành công!",
            "transaction_time": datetime.now().strftime("%H:%M:%S %d/%m/%Y")
        }

    return {
        "status": "error",
        "message": "Khuôn mặt không khớp, vui lòng thử lại!"
    }