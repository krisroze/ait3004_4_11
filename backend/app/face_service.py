from deepface import DeepFace
import base64
import tempfile
import os
from pathlib import Path

REFERENCE_FOLDER = "reference_faces"

# 🎯 ĐỊNH NGHĨA NGƯỠNG AN TOÀN (FINETUNE THRESHOLD)
# Với mô hình VGG-Face, mặc định thư viện là 0.40.
# Vì đây là ứng dụng Thanh toán (Face Payment App), ta siết chặt xuống 0.35 để an toàn hơn.
MATCH_THRESHOLD = 0.35

def verify_face(image_data: str):
    try:
        # xử lý base64
        if "," in image_data:
            image_data = image_data.split(",")[1]

        image_bytes = base64.b64decode(image_data)

        # lưu ảnh input
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp_file:
            temp_file.write(image_bytes)
            temp_path = temp_file.name

        # search trong database reference (So khớp 1:N)
        result = DeepFace.find(
            img_path=temp_path,
            db_path=REFERENCE_FOLDER,
            model_name="VGG-Face",
            enforce_detection=False
        )
        
        os.remove(temp_path)

        # result[0] là dataframe chứa danh sách những người giống nhất
        if len(result[0]) == 0:
            return None

        # Lấy người có tỉ lệ giống nhất (đứng đầu danh sách)
        best_match = result[0].iloc[0]
        distance = float(best_match["distance"])

        # 🛠️ CHỐT CHẶN BẢO MẬT: Kiểm tra xem có phải người lạ không
        # Nếu khoảng cách lớn hơn ngưỡng quy định -> Coi như người lạ, từ chối nhận diện!
        if distance > MATCH_THRESHOLD:
            print(f"[AI Alert] Phat hien nguoi la! Khoang cach gan nhat la {distance} (Vuot nguong an toan {MATCH_THRESHOLD})")
            return None

        return {
            "identity": Path(best_match["identity"]).stem,
            "distance": distance
        }

    except Exception as e:
        print("Face recognition error:", e)
        return None


def verify_face_by_account(image_data: str, account_number: str):
    """
    Hàm này dùng cho Đăng nhập và Quên mật khẩu. 
    So sánh trực tiếp ảnh chụp với ảnh tham chiếu của riêng tài khoản đó (So khớp 1:1).
    """
    try:
        if "," in image_data:
            image_data = image_data.split(",")[1]

        image_bytes = base64.b64decode(image_data)

        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp_file:
            temp_file.write(image_bytes)
            temp_path = temp_file.name

        # Tạo đường dẫn tới file ảnh gốc của người dùng này (VD: reference_faces/23072006.jpg)
        reference_path = os.path.join(REFERENCE_FOLDER, f"{account_number}.jpg")
        
        # Nếu không tìm thấy file ảnh gốc trong hệ thống -> Từ chối luôn
        if not os.path.exists(reference_path):
            os.remove(temp_path)
            print(f"[Error] Không tìm thấy ảnh gốc của tài khoản {account_number}")
            return False

        # So sánh 1:1 bằng DeepFace.verify
        result = DeepFace.verify(
            img1_path=temp_path,
            img2_path=reference_path,
            model_name="VGG-Face",
            enforce_detection=False
        )
        
        os.remove(temp_path)

        distance = result.get("distance", 1.0)
        
        # Áp dụng chốt chặn bảo mật
        if distance > MATCH_THRESHOLD:
            print(f"[AI Alert] Cảnh báo người lạ xâm nhập! Khoảng cách {distance} vượt ngưỡng {MATCH_THRESHOLD}")
            return False

        return result.get("verified", False)

    except Exception as e:
        print("Lỗi so khớp tài khoản:", e)
        return False