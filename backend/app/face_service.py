from deepface import DeepFace
import base64
import tempfile
import os
from pathlib import Path

REFERENCE_FOLDER = "reference_faces"

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

        # search trong database reference
        result = DeepFace.find(
            img_path=temp_path,
            db_path=REFERENCE_FOLDER,
            model_name="VGG-Face",
            enforce_detection=False
        )
        
        os.remove(temp_path)

        # result[0] là dataframe match
        if len(result[0]) == 0:
            return None

        best_match = result[0].iloc[0]

        return {
            "identity": Path(best_match["identity"]).stem,
            "distance": float(best_match["distance"])
        }

    except Exception as e:
        print("Face recognition error:", e)
        return None