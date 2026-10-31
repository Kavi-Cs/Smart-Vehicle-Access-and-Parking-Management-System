from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime

from sqlalchemy import String, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from sqlalchemy import Boolean, String, ForeignKey, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from sqlalchemy import UniqueConstraint

from database import Base


class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    registration_number: Mapped[str] = mapped_column(
        String(20),
        unique=True,
        index=True,
        nullable=False,
    )

    vehicle_type: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    approval_status: Mapped[str] = mapped_column(
        String(20),
        default="pending",
        nullable=False,
    )

    owner_id: Mapped[int | None] = mapped_column(
    ForeignKey("users.id"),
    nullable=True,
    index=True,
    )

class VehicleLog(Base):
    __tablename__ = "vehicle_logs"

    __table_args__ = (
        UniqueConstraint("event_id", name="uq_vehicle_logs_event_id"),
    )

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True,
    )

    event_id: Mapped[str | None] = mapped_column(
        String(36),
        nullable=True,
    )

    vehicle_id: Mapped[int | None] = mapped_column(
        ForeignKey("vehicles.id"),
        nullable=True,
    )

    registration_number: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
    )

    direction: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
    )

    camera_id: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )

    authorized: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
    )

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        primary_key=True,
        index=True
    )

    full_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False
    )

    password_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False
    )

    role: Mapped[str] = mapped_column(
        String(20),
        default="student",
        nullable=False
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )        