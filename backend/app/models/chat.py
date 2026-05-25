"""
Doctor-patient chat models.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import relationship

from app.database.base import Base


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(
        String(255),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    doctor_id = Column(
        String(255),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    patient_id = Column(
        String(255),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )

    doctor = relationship("User", foreign_keys=[doctor_id])
    patient = relationship("User", foreign_keys=[patient_id])
    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )

    __table_args__ = (
        Index("ix_conversations_doc_pat", "doctor_id", "patient_id", unique=True),
    )

    def __repr__(self):
        return f"<Conversation doctor={self.doctor_id} patient={self.patient_id}>"


class Message(Base):
    __tablename__ = "messages"

    id = Column(
        String(255),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
        index=True,
    )
    conversation_id = Column(
        String(255),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sender_id = Column(
        String(255),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    receiver_id = Column(
        String(255),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    message_text = Column(Text, nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )
    is_read = Column(
        String(5),
        nullable=False,
        default="false",
        comment="Whether the receiver has opened this message",
    )

    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id])
    receiver = relationship("User", foreign_keys=[receiver_id])

    # Composite index for unread-count queries (conversation_id + receiver_id + is_read)
    __table_args__ = (
        Index("ix_messages_conv_receiver_read", "conversation_id", "receiver_id", "is_read"),
        Index("ix_messages_conv_created", "conversation_id", "created_at"),
    )

    def __repr__(self):
        return f"<Message {self.id} conversation={self.conversation_id}>"
