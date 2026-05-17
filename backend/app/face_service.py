import base64
import tempfile
import os

from deepface import DeepFace


from pathlib import Path

REFERENCE_IMAGES = [
    str(p) for p in Path("reference_faces").glob("*")
    if p.suffix.lower() in [".jpg", ".png"]
]

def verify_face(image_data: str) -> bool:
    try:
        # Xóa phần "data:image/jpeg;base64,"
        if "," in image_data:
            image_data = image_data.split(",")[1]

        # Giải mã base64
        image_bytes = base64.b64decode(image_data)

        # Lưu ảnh tạm
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp_file:
            temp_file.write(image_bytes)
            temp_path = temp_file.name

        # So sánh khuôn mặt
        result = DeepFace.verify(
            img1_path=REFERENCE_IMAGE,
            img2_path=temp_path,
            model_name="VGG-Face",
            enforce_detection=False
        )

        # Xóa file tạm
        os.remove(temp_path)

        # Trả kết quả
        return result["verified"]

    except Exception as e:
        print("Face verification error:", e)
        return False