import base64
import io
import time
from minio import Minio

client = Minio(
    "localhost:9000",
    access_key="minio_admin",
    secret_key="minio_password",
    secure=False
)

BUCKET_NAME = "snapshots"

# Tạo bucket nếu chưa tồn tại
if not client.bucket_exists(BUCKET_NAME):
    client.make_bucket(BUCKET_NAME)


def upload_base64_image(image_data: str) -> str:
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

    # Trả về URL
    return f"http://localhost:9000/{BUCKET_NAME}/{filename}"