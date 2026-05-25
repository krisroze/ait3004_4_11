import base64
import io
import time
from minio import Minio

# 1. Khởi tạo MinIO (Đã đổi thành 127.0.0.1 để trị lỗi Windows lú)
client = Minio(
    "minio:9000",
    access_key="minio_admin",
    secret_key="minio_password",
    secure=False
)

BUCKET_NAME = "snapshots"

def upload_base64_image(image_data: str) -> str:
    # 2. ĐÃ GIẤU ĐOẠN KIỂM TRA BUCKET VÀO ĐÂY
    # Việc này giúp server khởi động an toàn, không bị "đột tử"
    if not client.bucket_exists(BUCKET_NAME):
        client.make_bucket(BUCKET_NAME)

    # Loại bỏ phần data:image/png;base64,
    header, encoded = image_data.split(",", 1)

    # Xác định đuôi file
    extension = "png"
    if "jpeg" in header or "jpg" in header:
        extension = "jpg"

    # Giải mã base64
    image_bytes = base64.b64decode(encoded)

    # Tạo tên file duy nhất
    filename = f"{int(time.time())}.{extension}"

    # Upload lên MinIO
    client.put_object(
        BUCKET_NAME,
        filename,
        io.BytesIO(image_bytes),
        length=len(image_bytes),
        content_type=f"image/{extension}"
    )

    # Trả về URL (Cũng đổi thành 127.0.0.1 luôn cho đồng bộ)
    return f"http://minio:9000/{BUCKET_NAME}/{filename}"