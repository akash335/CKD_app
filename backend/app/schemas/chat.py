"""Schemas for doctor-patient messaging."""

from pydantic import BaseModel, Field


class SendMessageRequest(BaseModel):
    sender_id: str
    receiver_id: str
    message_text: str = Field(..., min_length=1, max_length=4000)


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    receiver_id: str
    message_text: str
    created_at: str
    is_read: str = "false"


class DeleteMessageResponse(BaseModel):
    success: bool = True
    message: str
    message_id: str
    conversation_id: str
    last_message: str | None = None
    last_message_at: str | None = None
    updated_at: str


class ConversationResponse(BaseModel):
    id: str
    doctor_id: str
    patient_id: str
    participant_id: str
    participant_name: str
    participant_image: str | None = None
    last_message: str | None = None
    last_message_at: str | None = None
    unread_count: int = 0
    is_online: bool = False
    created_at: str
    updated_at: str
