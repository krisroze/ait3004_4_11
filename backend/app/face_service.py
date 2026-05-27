import os
import base64
import tempfile
from typing import Optional, Dict, Any, List
import uuid

from deepface import DeepFace
from qdrant_client import QdrantClient
from qdrant_client.http import models as qm

QDRANT_HOST = os.getenv("QDRANT_HOST", "qdrant_db")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", "6333"))
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "face_embeddings")

MODEL_NAME = os.getenv("FACE_MODEL_NAME", "VGG-Face")

MATCH_THRESHOLD = float(os.getenv("FACE_MATCH_THRESHOLD", "0.35"))

client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)


def _ensure_collection(vector_size: int) -> None:
    collections = client.get_collections().collections
    if any(c.name == QDRANT_COLLECTION for c in collections):
        return

    client.create_collection(
        collection_name=QDRANT_COLLECTION,
        vectors_config=qm.VectorParams(
            size=vector_size,
            distance=qm.Distance.COSINE,
        ),
    )


def _save_temp_image_from_base64(image_data: str) -> str:
    if "," in image_data:
        image_data = image_data.split(",")[1]
    image_bytes = base64.b64decode(image_data)

    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as f:
        f.write(image_bytes)
        return f.name


def get_embedding(image_data: str) -> List[float]:
    """
    Returns a single embedding vector for the image (first detected face).
    """
    temp_path = _save_temp_image_from_base64(image_data)
    try:
        reps = DeepFace.represent(
            img_path=temp_path,
            model_name=MODEL_NAME,
            enforce_detection=False,
        )
        if not reps:
            raise ValueError("No embedding produced")

        emb = reps[0].get("embedding")
        if emb is None:
            raise ValueError("No embedding in DeepFace output")

        emb = [float(x) for x in emb]
        _ensure_collection(vector_size=len(emb))
        return emb
    finally:
        try:
            os.remove(temp_path)
        except OSError:
            pass



def upsert_face_embedding(account_number: str, image_data: str) -> bool:
    emb = get_embedding(image_data)

    point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"face:{account_number}"))

    client.upsert(
        collection_name=QDRANT_COLLECTION,
        points=[
            qm.PointStruct(
                id=point_id,
                vector=emb,
                payload={"account_number": str(account_number)},
            )
        ],
    )
    return True


def search_face(image_data: str) -> Optional[Dict[str, Any]]:
    emb = get_embedding(image_data)

    res = client.query_points(
        collection_name=QDRANT_COLLECTION,
        query=emb,
        limit=1,
        with_payload=True,
    )

    points = res.points or []
    if not points:
        return None

    best = points[0]
    payload = best.payload or {}

    return {
        "account_number": payload.get("account_number", str(best.id)),
        "score": float(best.score) if best.score is not None else None,
    }


def verify_face(image_data: str) -> Optional[Dict[str, Any]]:
    """
    Old behavior: identify who it is (1:N).
    New: search Qdrant and apply threshold.
    """
    res = search_face(image_data)
    if not res:
        return None

    return res


def verify_face_by_account(image_data: str, account_number: str) -> bool:
    emb = get_embedding(image_data)
    point_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"face:{account_number}"))

    point = client.retrieve(
        collection_name=QDRANT_COLLECTION,
        ids=[point_id],
        with_vectors=True,
        with_payload=False,
    )

    if not point:
        return False

    ref_vec = point[0].vector
    if ref_vec is None:
        return False

    import math

    def dot(a, b): return sum(x * y for x, y in zip(a, b))
    def norm(a): return math.sqrt(sum(x * x for x in a))

    sim = dot(emb, ref_vec) / (norm(emb) * norm(ref_vec) + 1e-12)
    distance = 1.0 - sim

    return distance <= MATCH_THRESHOLD