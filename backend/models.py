import uuid
from sqlalchemy import Column, String, Integer, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

def generate_id():
    return str(uuid.uuid4())

class Place(Base):

    __tablename__ = "places"

    id = Column(String, primary_key=True, default=generate_id)
    name = Column(String)
    location = Column(String)
    description = Column(String)
    cameras = Column(Integer)

class Camera(Base):

    __tablename__ = "cameras"

    id = Column(String, primary_key=True, default=generate_id)
    name = Column(String)
    streamUrl = Column(String)
    type = Column(String)
    status = Column(String)

    placeId = Column(String, ForeignKey("places.id"))
