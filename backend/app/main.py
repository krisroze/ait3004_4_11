import os
import base64
import glob
import uuid  # Thêm thư viện để tạo tên file tạm thời khi quét mặt login
import tempfile  # THÊM MỚI: Phục vụ lưu file ảnh tạm khi chuyển tiền
import datetime  # THÊM MỚI: Ghi nhận thời gian giao dịch thực tế
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from deepface import DeepFace  # Import DeepFace để phục vụ việc quét mặt đăng nhập trực tiếp

# Import các router và database
from app.routers.verify import router as verify_router
from app.database import engine, get_db, Base
from app.models import Transfer, User
from app.schemas import UserRegisterRequest, UserResponse, TransferExecutionRequest  # CẬP NHẬT: Thêm TransferExecutionRequest
from app.minio_service import upload_base64_image  # THÊM MỚI: Service đẩy ảnh giao dịch lên MinIO

# Tự động tạo TẤT CẢ các bảng (cả Transfer cũ và User mới) nếu chưa có
Base.metadata.create_all(bind=engine)

app = FastAPI()

# Cấu hình CORS cho phép Frontend gọi API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Kéo các API quét mặt cũ vào
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

# --- THÊM MỚI: Schema nhận yêu cầu đổi mật khẩu ---
class ResetPasswordRequest(BaseModel):
    account_number: str
    new_password: str

# --- THÊM MỚI: Schema nhận ảnh chụp từ camera để quét mặt login ---
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
        "account_number": user.account_number
    }


# ==========================================
# API ĐĂNG NHẬP BẰNG KHUÔN MẶT (MỚI)
# ==========================================
@app.post("/api/login-face", status_code=status.HTTP_200_OK)
def login_by_face(request: FaceLoginRequest, db: Session = Depends(get_db)):
    REFERENCE_FOLDER = "reference_faces"
    TEMP_FOLDER = "temp_login_faces"
    
    # Kiểm tra xem hệ thống đã có dữ liệu mẫu khuôn mặt nào chưa
    if not os.path.exists(REFERENCE_FOLDER) or not os.listdir(REFERENCE_FOLDER):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Hệ thống chưa có dữ liệu FaceID mẫu. Vui lòng đăng nhập bằng mật khẩu trước!"
        )

    try:
        # 1. Giải mã dữ liệu ảnh Base64 gửi lên từ camera của Frontend
        image_data = request.image_data
        if "," in image_data:
            image_data = image_data.split(",")[1]
        image_bytes = base64.b64decode(image_data)

        # 2. Lưu ảnh chụp hiện tại vào một thư mục tạm thời để DeepFace quét đối chiếu
        os.makedirs(TEMP_FOLDER, exist_ok=True)
        temp_filename = f"login_{uuid.uuid4().hex}.jpg"
        temp_path = os.path.join(TEMP_FOLDER, temp_filename)

        with open(temp_path, "wb") as f:
            f.write(image_bytes)

        # 3. Dùng DeepFace.find để quét và tìm kiếm khuôn mặt khớp nhất trong kho ảnh mẫu
        dfs = DeepFace.find(
            img_path=temp_path,
            db_path=REFERENCE_FOLDER,
            enforce_detection=False,
            model_name="VGG-Face"  
        )

        # Xóa ngay ảnh tạm sau khi AI quét xong để tránh rác ổ đĩa
        if os.path.exists(temp_path):
            os.remove(temp_path)

        # 4. KIỂM TRA ĐÃ FIX LỖI: .empty không còn ()
        if len(dfs) > 0 and not dfs[0].empty:
            # Lấy đường dẫn của bức ảnh khớp nhất ở dòng đầu tiên
            matched_image_path = dfs[0].iloc[0]['identity']
            # Lấy tên file (Ví dụ: "23072006.jpg")
            filename = os.path.basename(matched_image_path)
            # Tách đuôi file để lấy Số tài khoản gốc (Ví dụ: "23072006")
            account_number = os.path.splitext(filename)[0]

            # 5. Tìm thông tin người dùng trong cơ sở dữ liệu dựa trên Số tài khoản vừa tìm được
            user = db.query(User).filter(User.account_number == account_number).first()
            if user:
                return {
                    "status": "success",
                    "message": f"Xin chào {user.fullname}, Đăng nhập khuôn mặt thành công!",
                    "fullname": user.fullname,
                    "balance": user.balance,
                    "account_number": user.account_number
                }

        # Nếu quét xong không tìm ra ai trùng khớp trên database
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Không nhận diện được khuôn mặt hoặc tài khoản chưa đăng ký FaceID!"
        )

    except Exception as e:
        print(f"[Face Login Error] Lỗi quét mặt: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi hệ thống khi đối sánh khuôn mặt: {str(e)}"
        )


# ==========================================
# API KHÔI PHỤC / ĐỔI MẬT KHẨU (MỚI)
# ==========================================
@app.post("/api/reset-password", status_code=status.HTTP_200_OK)
def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    # 1. Kiểm tra xem tài khoản cần đổi mật khẩu có tồn tại trong DB không
    user = db.query(User).filter(User.account_number == request.account_number).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lỗi đổi mật khẩu! Vui lòng kiểm tra lại số tài khoản."
        )
        
    try:
        # 2. Cập nhật mật khẩu mới vào cột password của bảng User
        user.password = request.new_password
        db.commit()  # Lưu thay đổi xuống Database vật lý
        
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
# API ĐĂNG KÝ TÀI KHOẢN MỚI
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

        # 4. GHI THÔNG TIN VÀO DATABASE
        new_user = User(
            fullname=request.fullname,
            account_number=request.account_number,
            bank_name=request.bank_name,
            password=request.password, 
            balance=500000.0,          
            face_id=image_name         
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        return new_user

    except Exception as e:
        db.rollback()
        print(f"[Register Error] Lỗi hệ thống: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Lỗi trong quá trình đăng ký: {str(e)}"
        )


# ==========================================
# API CẬP NHẬT FACE ID (MỚI)
# ==========================================
@app.post("/api/update-face", status_code=status.HTTP_200_OK)
def update_face(request: UpdateFaceRequest, db: Session = Depends(get_db)):
    # 1. Kiểm tra user có tồn tại không
    user = db.query(User).filter(User.account_number == request.account_number).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy thông tin người dùng!")

    try:
        # 2. Xử lý ảnh mới
        image_data = request.image_data
        if "," in image_data:
            image_data = image_data.split(",")[1]
        image_bytes = base64.b64decode(image_data)

        # 3. Ghi đè file ảnh cũ (cùng tên với số tài khoản)
        REFERENCE_FOLDER = "reference_faces"
        os.makedirs(REFERENCE_FOLDER, exist_ok=True)
        image_name = f"{request.account_number}.jpg"
        image_path = os.path.join(REFERENCE_FOLDER, image_name)

        with open(image_path, "wb") as f:
            f.write(image_bytes)

        # 4. Xóa Cache của AI để nó nhận diện ảnh mới ở lần chuyển tiền sau
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
# THÊM MỚI: API KIỂM TRA SỐ TÀI KHOẢN NGƯỜI NHẬN CÙNG NGÂN HÀNG
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
# THÊM MỚI: API XÁC THỰC KHUÔN MẶT NGƯỜI GỬI & THỰC HIỆN GIAO DỊCH
# =======================================================================
@app.post("/api/execute-transfer", status_code=status.HTTP_200_OK)
def execute_transfer(request: TransferExecutionRequest, db: Session = Depends(get_db)):
    REFERENCE_FOLDER = "reference_faces"
    MATCH_THRESHOLD = 0.35  # Ngưỡng an toàn bảo mật cao của ứng dụng thanh toán

    # 1. Kiểm tra tài khoản gửi, nhận và điều kiện số dư số tiền
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

    # 2. So khớp trực tiếp khuôn mặt người gửi (1vs1 Verification)
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

        # Dùng DeepFace.verify để so khớp trực tiếp ảnh gốc của chính tài khoản người gửi
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
            print(f"[Transfer Denied] Mặt không khớp chủ tài khoản! Khoảng cách: {distance}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Xác thực khuôn mặt thất bại! Bạn không phải chủ sở hữu tài khoản này."
            )

    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        print(f"[Face Verify Error] Lỗi kiểm tra mặt: {e}")
        raise HTTPException(status_code=500, detail="Lỗi hệ thống khi xác thực sinh trắc học.")

    # 3. Trừ/Cộng số dư tài khoản và ghi nhận lịch sử vào bảng transfers
    try:
        sender.balance -= request.amount
        recipient.balance += request.amount

        # Đẩy ảnh snapshot giao dịch lên MinIO lưu trữ chứng từ
        snapshot_url = upload_base64_image(request.image_data)

        # Tạo lịch sử lưu vào database
        new_transfer = Transfer(
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
        print(f"[Transfer Transaction Error] Lỗi dữ liệu giao dịch: {e}")
        raise HTTPException(status_code=500, detail="Giao dịch thất bại do lỗi hệ thống cơ sở dữ liệu.")


# ==========================================
# API KIỂM TRA SERVER
# ==========================================
@app.get("/")
def root():
    return {"message": "Backend is running!"}