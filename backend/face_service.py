from deepface import DeepFace

class FaceService:
    def __init__(self, model_name="VGG-Face", distance_metric="cosine"):
        """
        Khởi tạo dịch vụ nhận diện khuôn mặt.
        - model_name: VGG-Face (theo yêu cầu)
        - distance_metric: 'cosine', 'euclidean', 'euclidean_l2'. Cosine thường chuẩn nhất.
        """
        self.model_name = model_name
        self.distance_metric = distance_metric

    def verify_faces(self, img1_path: str, img2_path: str, custom_threshold: float = None) -> dict:
        """
        So sánh 2 khuôn mặt và tính điểm.
        Nếu truyền custom_threshold, hàm sẽ dùng ngưỡng này để đánh giá kết quả (True/False).
        """
        try:
            result = DeepFace.verify(
                img1_path=img1_path,
                img2_path=img2_path,
                model_name=self.model_name,
                distance_metric=self.distance_metric,
                enforce_detection=True # Yêu cầu phải nhận diện được khuôn mặt trong ảnh
            )
            
            # Finetune ngưỡng: Nếu có custom_threshold, ta ghi đè lại kết quả verified
            if custom_threshold is not None:
                # Với cosine distance, khoảng cách CÀNG NHỎ thì CÀNG GIỐNG NHAU
                is_verified = result['distance'] <= custom_threshold
                result['verified'] = bool(is_verified)
                result['threshold'] = custom_threshold
                
            return {
                "verified": result["verified"],
                "distance": result["distance"],       # Điểm số tính toán được
                "threshold": result["threshold"],     # Ngưỡng đang sử dụng
                "model": self.model_name,
                "status": "success"
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def vectorize_face(self, img_path: str) -> list:
        """
        Vector hóa ảnh mặt (Extract Embeddings).
        Trả về một list các số thực (vector) để lưu vào Qdrant.
        """
        try:
            # represent trả về list các dict (đề phòng ảnh có nhiều mặt)
            # Ở đây ta lấy mặt đầu tiên / rõ nhất [0]
            result = DeepFace.represent(
                img_path=img_path,
                model_name=self.model_name,
                enforce_detection=True
            )
            return result[0]['embedding']
        except Exception as e:
            print(f"Lỗi vector hóa: {e}")
            return []