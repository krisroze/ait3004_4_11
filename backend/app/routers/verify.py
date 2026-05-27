from fastapi import APIRouter, HTTPException
from datetime import datetime

# ĐÃ THÊM: Import TopupRequest từ schemas.py
from app.schemas import VerifyRequest, LoginFaceRequest, ResetPasswordRequest, TopupRequest
from app.face_service import verify_face, verify_face_by_account
from app.database import SessionLocal
# ĐÃ THÊM: Import bảng User để cập nhật mật khẩu, trừ tiền...
from app.models import Transfer, User 
from app.minio_service import upload_base64_image

router = APIRouter()

# =========================================================
# API: ĐĂNG NHẬP BẰNG FACEID
# =========================================================
@router.post("/api/verify-face-account")
def verify_face_account_api(request: LoginFaceRequest):
    # Xác thực 1:1 xem ảnh chụp có khớp với ảnh gốc của tài khoản không
    is_match = verify_face_by_account(request.image_data, request.account_number)
    
    if is_match:
        db = SessionLocal()
        user = db.query(User).filter(User.account_number == request.account_number).first()
        db.close()

        if user:
            return {
                "fullname": user.fullname,
                "balance": user.balance, 
                "account_number": user.account_number,
                "phone_number": user.phone_number  # ĐÃ THÊM: Trả về số điện thoại để dùng cho nạp tiền
            }
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản trong hệ thống!")
    else:
        raise HTTPException(status_code=400, detail="Khuôn mặt không khớp!")


# =========================================================
# API: KHÔI PHỤC MẬT KHẨU BẰNG FACEID (ĐÃ HOÀN THIỆN 100%)
# =========================================================
@router.post("/api/reset-password")
def reset_password_api(request: ResetPasswordRequest):
    # 1. Xác thực khuôn mặt trước khi cho phép đổi mật khẩu
    is_match = verify_face_by_account(request.image_data, request.account_number)
    
    if is_match:
        # 2. Nếu khuôn mặt đúng -> Kết nối DB để lưu mật khẩu mới
        db = SessionLocal()
        user = db.query(User).filter(User.account_number == request.account_number).first()
        
        if user:
            # Cập nhật mật khẩu mới vào cơ sở dữ liệu
            user.password = request.new_password
            db.commit()
            db.close()
            return {"status": "success", "message": "Đổi mật khẩu thành công!"}
        else:
            db.close()
            raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản trong hệ thống!")
    else:
        # Nếu khuôn mặt sai -> Báo lỗi
        raise HTTPException(status_code=400, detail="Khuôn mặt không khớp hoặc sai số tài khoản!")


# =========================================================
# THÊM MỚI: API NẠP TIỀN ĐIỆN THOẠI
# =========================================================
@router.post("/api/topup")
def topup_api(request: TopupRequest):
    # 1. Xác thực khuôn mặt người dùng trước khi nạp
    is_match = verify_face_by_account(request.image_data, request.account_number)
    
    if not is_match:
        raise HTTPException(status_code=400, detail="Khuôn mặt không khớp, giao dịch thất bại!")

    db = SessionLocal()
    user = db.query(User).filter(User.account_number == request.account_number).first()
    
    if not user:
        db.close()
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản!")

    # 2. Kiểm tra số dư xem có đủ để nạp tiền không
    if user.balance < request.amount:
        db.close()
        raise HTTPException(status_code=400, detail="Số dư không đủ để thực hiện giao dịch!")

    # 3. Trừ tiền, Upload ảnh minh chứng và Lưu lịch sử
    try:
        user.balance -= request.amount  # Trừ tiền
        snapshot_url = upload_base64_image(request.image_data)
        
        # Ghi nhận giao dịch nạp tiền
        transfer = Transfer(
            transaction_type="topup", # Đánh dấu loại giao dịch là nạp tiền
            recipient_name=f"Nạp ĐT: {request.phone_number}",
            account_number=request.account_number,
            amount=request.amount,
            status="success",
            transaction_time=datetime.now(),
            snapshot_url=snapshot_url
        )
        
        db.add(transfer)
        db.commit()
        
        return {
            "status": "success", 
            "message": "Nạp tiền điện thoại thành công!",
            "new_balance": user.balance
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Lỗi hệ thống khi nạp tiền!")
    finally:
        db.close()


# =========================================================
# API CŨ: XÁC THỰC KHUÔN MẶT ĐỂ CHUYỂN TIỀN
# =========================================================
@router.post("/api/verify-face")
def verify_face_api(request: VerifyRequest):
    # Xác thực khuôn mặt (1:N)
    is_match = verify_face(request.image_data)

    # Upload ảnh lên MinIO
    snapshot_url = upload_base64_image(request.image_data)
    print("Snapshot URL:", snapshot_url)
    
    # Kết nối database
    db = SessionLocal()

    # Tạo bản ghi giao dịch
    transfer = Transfer(
        transaction_type="transfer", # ĐÃ THÊM: Đánh dấu đây là giao dịch chuyển tiền
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


# =========================================================
# API: LẤY LỊCH SỬ GIAO DỊCH
# =========================================================
@router.get("/api/history")
def get_history():
    db = SessionLocal()

    # Lấy dữ liệu sắp xếp mới nhất lên đầu
    transfers = db.query(Transfer).order_by(
        Transfer.id.desc()
    ).all()

    result = []

    for t in transfers:
        result.append({
            "id": t.id,
            "transaction_type": t.transaction_type, # ĐÃ THÊM: Trả về loại giao dịch
            "recipient_name": t.recipient_name,
            "account_number": t.account_number,
            "amount": t.amount,
            "status": t.status,
            "time": t.transaction_time.strftime("%H:%M:%S %d/%m/%Y") if t.transaction_time else None,
            "snapshot_url": t.snapshot_url
        })

    db.close()
    return result