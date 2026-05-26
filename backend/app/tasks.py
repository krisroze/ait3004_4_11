from app.celery_app import celery_app
from app.minio_service import upload_base64_image

@celery_app.task(name="upload_snapshot")
def upload_snapshot_task(image_data: str) -> str:
    return upload_base64_image(image_data)