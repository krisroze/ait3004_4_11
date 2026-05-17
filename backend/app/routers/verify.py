from fastapi import APIRouter
from datetime import datetime

from app.schemas import VerifyRequest
from app.face_service import verify_face
from app.database import SessionLocal
from app.models import Transfer
from app.minio_service import upload_base64_image

router = APIRouter()


@router.post("/api/verify-face")
def verify_face_api(request: VerifyRequest):
    # Xác thực khuôn mặt
    is_match = verify_face(request.image_data)

    # Upload ảnh lên MinIO
    snapshot_url = upload_base64_image(request.image_data)
    print("Snapshot URL:", snapshot_url)
    # Kết nối database
    db = SessionLocal()

    # Tạo bản ghi giao dịch
    transfer = Transfer(
        recipient_name=request.recipientName,
        account_number=request.accountNumber,
        amount=request.amount,
        status="success" if is_match else "error",
        transaction_time=datetime.now(),
        snapshot_url=snapshot_url
    )

    # Lưu vào database
    db.add(transfer)
    db.commit()
    db.close()

    # Trả kết quả
    if is_match:
        return {
            "status": "success",
            "message": "Xác thực khuôn mặt thành công!",
            "transaction_time": datetime.now().strftime("%H:%M:%S %d/%m/%Y")
        }
    else:
        return {
            "status": "error",
            "message": "Khuôn mặt không khớp, vui lòng thử lại!"
        }


@router.get("/api/transfers")
def get_transfers():
    db = SessionLocal()

    transfers = db.query(Transfer).order_by(
        Transfer.id.desc()
    ).all()

    result = []

    for t in transfers:
        result.append({
            "id": t.id,
            "recipient_name": t.recipient_name,
            "account_number": t.account_number,
            "amount": t.amount,
            "status": t.status,
            "transaction_time": t.transaction_time.strftime("%H:%M:%S %d/%m/%Y")
            if t.transaction_time else None,
            "snapshot_url": t.snapshot_url
        })

    db.close()
    return result