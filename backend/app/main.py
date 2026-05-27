import os
import base64
import glob
import uuid  # Thêm thư viện để tạo tên file tạm thời khi quét mặt login
import tempfile  # PHỤC VỤ lưu file ảnh tạm khi chuyển tiền
import datetime  # GHI NHẬN thời gian giao dịch thực tế
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from deepface import DeepFace  # Import DeepFace để phục vụ việc quét mặt đăng nhập trực tiếp
from app.face_service import verify_face, upsert_face_embedding

# Import các router và database
from app.routers.verify import router as verify_router
from app.database import engine, get_db, Base
from app.models import Transfer, User
from app.schemas import UserRegisterRequest, UserResponse, TransferExecutionRequest, BuyBeautifulAccountRequest, BillPaymentRequest
from app.minio_service import upload_base64_image  # Service đẩy ảnh giao dịch lên MinIO

# ======================================================================


# Tự động tạo TẤT CẢ các bảng mới trống trơn nếu chưa có
Base.metadata.create_all(bind=engine)

app = FastAPI()

from prometheus_fastapi_instrumentator import Instrumentator

Instrumentator().instrument(app).expose(app)

# Cấu hình CORS cho phép Frontend gọi API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Kéo các API quét mặt từ router verify vào
app.include_router(verify_router)


# ==========================================
# SCHEMA CHO ĐĂNG NHẬP VÀ CẬP NHẬT (MỚI)
# ==========================================
class UserLoginRequest(BaseModel):
    account_number: str
    password: str

class UpdateFaceRequest(BaseModel):
    account_number: str
    image_data: str

# Schema nhận yêu cầu đổi mật khẩu
class ResetPasswordRequest(BaseModel):
    account_number: str
    new_password: str

# Schema nhận ảnh chụp từ camera để quét mặt login
class FaceLoginRequest(BaseModel):
    image_data: str


# ==========================================
# API ĐĂNG NHẬP HỆ THỐNG bằng Số tài khoản & Mật khẩu
# ==========================================
@app.post("/api/login", status_code=status.HTTP_200_OK)
def login_user(request: UserLoginRequest, db: Session = Depends(get_db)):
    # 1. Tìm người dùng trong database theo Số tài khoản
    user = db.query(User).filter(User.account_number == request.account_number).first()
    
    # 2. Kiểm tra tài khoản có tồn tại không và mật khẩu có khớp không
    if not user or user.password != request.password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Số tài khoản hoặc mật khẩu không chính xác!"
        )
        
    # 3. Đăng nhập thành công -> Trả thông tin cần thiết về cho Frontend hiển thị
    return {
        "status": "success",
        "message": "Đăng nhập thành công!",
        "fullname": user.fullname,
        "balance": user.balance,
        "account_number": user.account_number,
        "phone_number": user.phone_number  # ĐÃ THÊM: Trả về số điện thoại khi đăng nhập thành công
    }


# ==========================================
# API ĐĂNG NHẬP BẰNG KHUÔN MẶT (1:N DEEPFACE FIND)
# ==========================================
@app.post("/api/login-face", status_code=status.HTTP_200_OK)
def login_by_face(request: FaceLoginRequest, db: Session = Depends(get_db)):
    try:
        match = verify_face(request.image_data)  # uses Qdrant search
        if not match:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Không nhận diện được khuôn mặt hoặc tài khoản chưa đăng ký FaceID!"
            )

        account_number = match["account_number"]

        user = db.query(User).filter(User.account_number == account_number).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy tài khoản trong hệ thống!"
            )

        return {
            "status": "success",
            "message": f"Xin chào {user.fullname}, Đăng nhập khuôn mặt thành công!",
            "fullname": user.fullname,
            "balance": user.balance,
            "account_number": user.account_number,
            "phone_number": user.phone_number,
            # optional debug:
            "match_score": match.get("score"),
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"[Face Login Error - Qdrant] {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi hệ thống khi đối sánh khuôn mặt: {str(e)}"
        )


# ==========================================
# API KHÔI PHỤC / ĐỔI MẬT KHẨU
# ==========================================
@app.post("/api/reset-password", status_code=status.HTTP_200_OK)
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.account_number == request.account_number).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lỗi đổi mật khẩu! Vui lòng kiểm tra lại số tài khoản."
        )
        
    try:
        user.password = request.new_password
        db.commit()  # Lưu thay đổi xuống Database
        
        return {
            "status": "success", 
            "message": "Đổi mật khẩu thành công!"
        }
        
    except Exception as e:
        db.rollback()
        print(f"[Reset Password Error] Lỗi database: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Có lỗi xảy ra trong quá trình cập nhật mật khẩu mới!"
        )


# ==========================================
# API ĐĂNG KÝ TÀI KHOẢN MỚI (ĐÃ CẬP NHẬT SỐ ĐIỆN THOẠI)
# ==========================================
@app.post("/api/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(request: UserRegisterRequest, db: Session = Depends(get_db)):
    # 1. KIỂM TRA TRÙNG LẶP: Số tài khoản đã tồn tại chưa?
    existing_user = db.query(User).filter(User.account_number == request.account_number).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Số tài khoản này đã được đăng ký trên hệ thống!"
        )

    # ĐÃ THÊM: KIỂM TRA TRÙNG LẶP SỐ ĐIỆN THOẠI
    existing_phone = db.query(User).filter(User.phone_number == request.phone_number).first()
    if existing_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Số điện thoại này đã gắn liền với một tài khoản khác!"
        )

    try:
        # 2. XỬ LÝ LƯU ẢNH TỰ ĐỘNG
        image_data = request.image_data
        if "," in image_data:
            image_data = image_data.split(",")[1]
        image_bytes = base64.b64decode(image_data)

        REFERENCE_FOLDER = "reference_faces"
        os.makedirs(REFERENCE_FOLDER, exist_ok=True)

        image_name = f"{request.account_number}.jpg"
        image_path = os.path.join(REFERENCE_FOLDER, image_name)

        with open(image_path, "wb") as f:
            f.write(image_bytes)

        # 3. XÓA CACHE ĐỂ AI DEEPFACE CẬP NHẬT KHUÔN MẶT MỚI
        pkl_files = glob.glob(os.path.join(REFERENCE_FOLDER, "*.pkl"))
        for pkl_file in pkl_files:
            os.remove(pkl_file)
            print(f"[AI Cache] Đã tự động xóa file cache: {pkl_file}")

        # 4. GHI THÔNG TIN VÀO DATABASE (ĐÃ THÊM ĐỦ PHONE NUMBER)
        new_user = User(
            fullname=request.fullname,
            phone_number=request.phone_number,  # ĐÃ THÊM: Lưu số điện thoại vào database
            account_number=request.account_number,
            bank_name=request.bank_name,
            password=request.password, 
            balance=500000.0,          
            face_id=image_name         
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        upsert_face_embedding(request.account_number, request.image_data)

        return new_user

    except Exception as e:
        db.rollback()
        print(f"[Register Error] Lỗi hệ thống: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi trong quá trình đăng ký: {str(e)}"
        )


# ==========================================
# API CẬP NHẬT FACE ID
# ==========================================
@app.post("/api/update-face", status_code=status.HTTP_200_OK)
def update_face(request: UpdateFaceRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.account_number == request.account_number).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin người dùng!")

    try:
        image_data = request.image_data
        if "," in image_data:
            image_data = image_data.split(",")[1]
        image_bytes = base64.b64decode(image_data)

        REFERENCE_FOLDER = "reference_faces"
        os.makedirs(REFERENCE_FOLDER, exist_ok=True)
        image_name = f"{request.account_number}.jpg"
        image_path = os.path.join(REFERENCE_FOLDER, image_name)

        with open(image_path, "wb") as f:
            f.write(image_bytes)

        upsert_face_embedding(request.account_number, request.image_data)
        
        pkl_files = glob.glob(os.path.join(REFERENCE_FOLDER, "*.pkl"))
        for pkl_file in pkl_files:
            os.remove(pkl_file)
            print(f"[AI Cache] Đã xóa cache để cập nhật FaceID mới: {pkl_file}")

        return {"status": "success", "message": "Cập nhật FaceID thành công!"}

    except Exception as e:
        print(f"[Update Face Error] {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi hệ thống khi cập nhật ảnh: {str(e)}"
        )


# =======================================================================
# API KIỂM TRA SỐ TÀI KHOẢN NGƯỜI NHẬN CÙNG NGÂN HÀNG
# =======================================================================
@app.get("/api/check-recipient/{account_number}", status_code=status.HTTP_200_OK)
def check_recipient(account_number: str, db: Session = Depends(get_db)):
    recipient = db.query(User).filter(User.account_number == account_number).first()
    
    if not recipient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Số tài khoản không thuộc hệ thống VNU Bank hoặc không tồn tại!"
        )
        
    return {
        "status": "success",
        "fullname": recipient.fullname,
        "account_number": recipient.account_number
    }


# =======================================================================
# API XÁC THỰC KHUÔN MẶT NGƯỜI GỬI & THỰC HIỆN GIAO DỊCH CHUYỂN TIỀN
# =======================================================================
from app.tasks import upload_snapshot_task
@app.post("/api/execute-transfer", status_code=status.HTTP_200_OK)
def execute_transfer(request: TransferExecutionRequest, db: Session = Depends(get_db)):
    REFERENCE_FOLDER = "reference_faces"
    MATCH_THRESHOLD = 0.35  

    sender = db.query(User).filter(User.account_number == request.sender_account_number).first()
    recipient = db.query(User).filter(User.account_number == request.recipient_account_number).first()

    if not sender:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin người gửi!")
    if not recipient:
        raise HTTPException(status_code=404, detail="Tài khoản người nhận không tồn tại!")
    if sender.account_number == recipient.account_number:
        raise HTTPException(status_code=400, detail="Không thể tự chuyển tiền cho chính mình!")
    if sender.balance < request.amount:
        raise HTTPException(status_code=400, detail="Số dư tài khoản của bạn không đủ!")

    sender_photo_name = f"{sender.account_number}.jpg"
    sender_photo_path = os.path.join(REFERENCE_FOLDER, sender_photo_name)

    if not os.path.exists(sender_photo_path):
        raise HTTPException(status_code=400, detail="Người gửi chưa đăng ký dữ liệu khuôn mặt FaceID!")

    try:
        image_data = request.image_data
        if "," in image_data:
            image_data = image_data.split(",")[1]
        image_bytes = base64.b64decode(image_data)

        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp_file:
            temp_file.write(image_bytes)
            temp_path = temp_file.name

        result = DeepFace.verify(
            img1_path=temp_path,
            img2_path=sender_photo_path,
            model_name="VGG-Face",
            enforce_detection=False
        )

        if os.path.exists(temp_path):
            os.remove(temp_path)

        distance = float(result["distance"])
        if distance > MATCH_THRESHOLD:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Xác thực khuôn mặt thất bại! Bạn không phải chủ sở hữu tài khoản này."
            )

    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        raise HTTPException(status_code=500, detail="Lỗi hệ thống khi xác thực sinh trắc học.")

    try:
        sender.balance -= request.amount
        recipient.balance += request.amount

        job = upload_snapshot_task.delay(request.image_data)
        snapshot_url = job.get(timeout=20)

        # Tạo lịch sử lưu vào database
        new_transfer = Transfer(
            transaction_type="transfer",  # ĐÃ THÊM: Gắn nhãn phân loại là chuyển tiền nội bộ
            recipient_name=recipient.fullname,
            account_number=recipient.account_number,
            amount=int(request.amount),
            status="SUCCESS",
            transaction_time=datetime.datetime.now(),
            snapshot_url=snapshot_url
        )
        
        db.add(new_transfer)
        db.commit()

        return {
            "status": "success",
            "message": f"Chuyển khoản thành công {request.amount:,.0f} VND tới {recipient.fullname}!",
            "new_balance": sender.balance
        }

    except Exception as e:
        db.rollback()
        print(f"[Execute Transfer DB Error] {repr(e)}")
        raise HTTPException(status_code=500, detail="Giao dịch thất bại do lỗi hệ thống cơ sở dữ liệu.")
    
from celery.result import AsyncResult
from app.celery_app import celery_app

@app.get("/api/jobs/{job_id}")
def get_job(job_id: str):
    res = AsyncResult(job_id, app=celery_app)
    return {"id": job_id, "state": res.state, "result": res.result if res.successful() else None}

# =======================================================================
# API MUA TÀI KHOẢN SỐ ĐẸP (ĐỔI SỐ TÀI KHOẢN)
# =======================================================================
@app.post("/api/buy-beautiful-account", status_code=status.HTTP_200_OK)
def buy_beautiful_account(request: BuyBeautifulAccountRequest, db: Session = Depends(get_db)):
    REFERENCE_FOLDER = "reference_faces"
    
    # 1. Kiểm tra tài khoản hiện tại
    user = db.query(User).filter(User.account_number == request.old_account_number).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản người dùng!")
        
    # 2. Kiểm tra số tài khoản mới đã có ai dùng chưa
    existing_new_acc = db.query(User).filter(User.account_number == request.new_account_number).first()
    if existing_new_acc:
        raise HTTPException(status_code=400, detail="Số tài khoản này đã có người sở hữu, vui lòng chọn số khác!")
        
    # 3. Kiểm tra số dư
    if user.balance < request.amount:
        raise HTTPException(status_code=400, detail="Số dư không đủ để thanh toán phí mua tài khoản!")

    # 4. Xác thực FaceID
    old_photo_path = os.path.join(REFERENCE_FOLDER, f"{user.account_number}.jpg")
    if not os.path.exists(old_photo_path):
        raise HTTPException(status_code=400, detail="Lỗi hệ thống: Không tìm thấy ảnh sinh trắc học gốc!")

    try:
        image_data = request.image_data
        if "," in image_data:
            image_data = image_data.split(",")[1]
        image_bytes = base64.b64decode(image_data)

        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp_file:
            temp_file.write(image_bytes)
            temp_path = temp_file.name

        result = DeepFace.verify(
            img1_path=temp_path,
            img2_path=old_photo_path,
            model_name="VGG-Face",
            enforce_detection=False
        )
        if os.path.exists(temp_path):
            os.remove(temp_path)

        if float(result["distance"]) > 0.35: # MATCH_THRESHOLD
            raise HTTPException(status_code=401, detail="Xác thực khuôn mặt thất bại!")
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail="Lỗi hệ thống khi quét khuôn mặt.")

    # 5. Nếu xác thực thành công -> Tiến hành trừ tiền và đổi số
    try:
        # A. Trừ tiền
        user.balance -= request.amount
        
        # B. Đổi tên file ảnh trong thư mục (QUAN TRỌNG NHẤT)
        new_photo_path = os.path.join(REFERENCE_FOLDER, f"{request.new_account_number}.jpg")
        os.rename(old_photo_path, new_photo_path)
        
        # Xóa Cache AI
        pkl_files = glob.glob(os.path.join(REFERENCE_FOLDER, "*.pkl"))
        for pkl_file in pkl_files:
            os.remove(pkl_file)
            
        # C. Cập nhật Số tài khoản trong Database
        user.account_number = request.new_account_number
        user.face_id = f"{request.new_account_number}.jpg"

        # D. Lưu vào lịch sử giao dịch
        new_transfer = Transfer(
            transaction_type="buy_account",
            recipient_name="VNU Bank (Phí đổi số)",
            account_number=request.new_account_number,
            amount=int(request.amount),
            status="SUCCESS",
            transaction_time=datetime.datetime.now(),
            snapshot_url="https://ui-avatars.com/api/?name=VNU&background=0D8ABC&color=fff" # Ảnh placeholder
        )
        db.add(new_transfer)
        db.commit()

        return {
            "status": "success",
            "message": "Đổi tài khoản số đẹp thành công!",
            "new_account": user.account_number,
            "new_balance": user.balance
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi database: {str(e)}")

# =======================================================================
# API THANH TOÁN HÓA ĐƠN (ĐIỆN, NƯỚC, INTERNET)
# =======================================================================
@app.post("/api/pay-bill", status_code=status.HTTP_200_OK)
def pay_bill_api(request: BillPaymentRequest, db: Session = Depends(get_db)):
    REFERENCE_FOLDER = "reference_faces"
    
    user = db.query(User).filter(User.account_number == request.account_number).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản người dùng!")
        
    if user.balance < request.amount:
        raise HTTPException(status_code=400, detail="Số dư không đủ để thanh toán hóa đơn này!")

    # Xác thực FaceID
    photo_path = os.path.join(REFERENCE_FOLDER, f"{user.account_number}.jpg")
    if not os.path.exists(photo_path):
        raise HTTPException(status_code=400, detail="Chưa đăng ký khuôn mặt sinh trắc học!")

    try:
        image_data = request.image_data
        if "," in image_data:
            image_data = image_data.split(",")[1]
        image_bytes = base64.b64decode(image_data)

        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp_file:
            temp_file.write(image_bytes)
            temp_path = temp_file.name

        result = DeepFace.verify(
            img1_path=temp_path,
            img2_path=photo_path,
            model_name="VGG-Face",
            enforce_detection=False
        )
        if os.path.exists(temp_path):
            os.remove(temp_path)

        if float(result["distance"]) > 0.35: 
            raise HTTPException(status_code=401, detail="Xác thực khuôn mặt thất bại! Từ chối giao dịch.")
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail="Lỗi hệ thống khi quét AI.")

    # Thanh toán thành công -> Trừ tiền & Lưu lịch sử
    try:
        user.balance -= request.amount
        
        # Gọi job Celery để upload ảnh lên MinIO giống như chuyển tiền
        job = upload_snapshot_task.delay(request.image_data)
        snapshot_url = job.get(timeout=20)

        new_transfer = Transfer(
            transaction_type="bill_payment",
            recipient_name=f"Thanh toán: {request.bill_provider}",
            account_number=request.customer_code,
            amount=int(request.amount),
            status="SUCCESS",
            transaction_time=datetime.datetime.now(),
            snapshot_url=snapshot_url
        )
        db.add(new_transfer)
        db.commit()

        return {
            "status": "success",
            "message": "Thanh toán hóa đơn thành công!",
            "new_balance": user.balance
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi database: {str(e)}")


# ==========================================
# API KIỂM TRA SERVER
# ==========================================
@app.get("/")
def root():
    return {"message": "Backend is running!"}