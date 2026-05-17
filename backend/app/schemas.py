from pydantic import BaseModel


class VerifyRequest(BaseModel):
    recipientName: str
    accountNumber: str
    amount: int
    image_data: str