from sqlalchemy import Column, Integer, String, DateTime, Text
from app.database import Base


class Transfer(Base):
    __tablename__ = "transfers"

    id = Column(Integer, primary_key=True, index=True)
    recipient_name = Column(String(255))
    account_number = Column(String(50))
    amount = Column(Integer)
    status = Column(String(20))
    transaction_time = Column(DateTime)
    snapshot_url = Column(Text)