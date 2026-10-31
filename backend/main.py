from contextlib import asynccontextmanager
from typing import Literal

from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    Path,
    Header,
    status,
)
from fastapi.security import (
    HTTPBearer,
    HTTPAuthorizationCredentials,
)

from pydantic import (
    BaseModel,
    Field,
    EmailStr,
    field_validator,
)

from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
import os
import secrets
from dotenv import load_dotenv

import models

from database import Base, engine, SessionLocal

from auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="SmartVehicle API",
    version="0.3.0",
    lifespan=lifespan
)

# ---------- CAMERA SERVICE AUTHENTICATION ----------

load_dotenv()

CAMERA_API_KEY = os.getenv("CAMERA_API_KEY")


def verify_camera_api_key(
    x_camera_api_key: str | None = Header(
        default=None,
        alias="X-Camera-API-Key",
    ),
):
    if not CAMERA_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Camera API authentication is not configured.",
        )

    if (
        not x_camera_api_key
        or not secrets.compare_digest(
            x_camera_api_key,
            CAMERA_API_KEY,
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing camera API key.",
        )

    return True


# ---------- DATABASE SESSION ----------

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

 # ---------- AUTHENTICATION ----------

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    
    token = credentials.credentials

    try:
        payload = decode_access_token(token)
        user_id = int(payload["sub"])
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.get(models.User, user_id)

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=401,
            detail="User account not found or inactive.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user       

# ---------- ROLE-BASED ACCESS CONTROL ----------

def require_admin(
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=403,
            detail="Administrator permissions required.",
        )

    return current_user

# ---------- REQUEST SCHEMA ----------

class VehicleCreate(BaseModel):
    registration_number: str = Field(
        min_length=1,
        max_length=20
    )
    vehicle_type: str = Field(
        min_length=1,
        max_length=30
    )

class UserRegister(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    role: Literal["student", "staff"]

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, value: str) -> str:
        value = value.strip()

        if not value:
            raise ValueError("Full name cannot be blank.")

        return value


class UserLogin(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)    


# ---------- BASIC ROUTES ----------

@app.get("/")
def home():
    return {"message": "SmartVehicle backend is running!"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/health/database")
def database_health_check():
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))

    return {
        "status": "healthy",
        "database": "connected"
    }
# ---------- CURRENT USER ----------

@app.get("/auth/me")
def get_my_profile(
    current_user: models.User = Depends(get_current_user),
):
    return {
        "id": current_user.id,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role": current_user.role,
    }


# ---------- LIST VEHICLES ----------

@app.get("/vehicles")
def list_vehicles(
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    vehicles = db.query(models.Vehicle).order_by(models.Vehicle.id).all()

    return [
        {
            "id": vehicle.id,
            "registration_number": vehicle.registration_number,
            "vehicle_type": vehicle.vehicle_type,
            "approval_status": vehicle.approval_status
        }
        for vehicle in vehicles
    ]

# ---------- ADMINISTRATOR APPROVAL ----------

from typing import Literal
from fastapi import Path


class VehicleApproval(BaseModel):
    approval_status: Literal["approved", "rejected"]


@app.get("/vehicles/pending")
def list_pending_vehicles(
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    vehicles = (
        db.query(models.Vehicle)
        .filter(models.Vehicle.approval_status == "pending")
        .order_by(models.Vehicle.id)
        .all()
    )

    return [
        {
            "id": vehicle.id,
            "registration_number": vehicle.registration_number,
            "vehicle_type": vehicle.vehicle_type,
            "approval_status": vehicle.approval_status
        }
        for vehicle in vehicles
    ]


@app.patch("/vehicles/{vehicle_id}/approval")
def approve_or_reject_vehicle(
    approval: VehicleApproval,
    vehicle_id: int = Path(gt=0),
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    vehicle = db.get(models.Vehicle, vehicle_id)

    if vehicle is None:
        raise HTTPException(
            status_code=404,
            detail="Vehicle not found."
        )

    if vehicle.approval_status != "pending":
        raise HTTPException(
            status_code=409,
            detail="Only pending registrations can be approved or rejected."
        )

    vehicle.approval_status = approval.approval_status
    db.commit()
    db.refresh(vehicle)

    return {
        "message": f"Vehicle {approval.approval_status} successfully.",
        "vehicle": {
            "id": vehicle.id,
            "registration_number": vehicle.registration_number,
            "vehicle_type": vehicle.vehicle_type,
            "approval_status": vehicle.approval_status
        }
    }

# ---------- VEHICLE ENTRY / EXIT LOGGING ----------

from typing import Literal
from pydantic import field_validator


class VehicleEventCreate(BaseModel):
    event_id: str = Field(min_length=36, max_length=36)

    registration_number: str = Field(
        min_length=1,
        max_length=20,
    )

    direction: Literal["entry", "exit"]

    camera_id: Literal["ENTRY_CAM_01", "EXIT_CAM_01"]

    @field_validator("event_id")
    @classmethod
    def validate_event_id(cls, value: str) -> str:
        import uuid

        try:
            parsed = uuid.UUID(value)
        except ValueError:
            raise ValueError("event_id must be a valid UUID.")

        if str(parsed) != value.lower():
            raise ValueError("event_id must be a canonical UUID.")

        return str(parsed)

    @field_validator("registration_number")
    @classmethod
    def normalize_registration_number(cls, value: str) -> str:
        value = value.strip().upper()

        if not value:
            raise ValueError("Registration number cannot be blank.")

        return value

    @field_validator("camera_id")
    @classmethod
    def validate_camera_direction(cls, value, info):
        direction = info.data.get("direction")

        expected_camera = {
            "entry": "ENTRY_CAM_01",
            "exit": "EXIT_CAM_01",
        }

        if direction and expected_camera[direction] != value:
            raise ValueError(
                f"Camera {value} cannot report a {direction} event."
            )

        return value


@app.post("/vehicles", status_code=201)
def register_vehicle(
    vehicle: VehicleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    registration_number = vehicle.registration_number.strip().upper()
    vehicle_type = vehicle.vehicle_type.strip().lower()

    if not registration_number or not vehicle_type:
        raise HTTPException(
            status_code=422,
            detail="Registration number and vehicle type cannot be blank.",
        )

    new_vehicle = models.Vehicle(
        registration_number=registration_number,
        vehicle_type=vehicle_type,
        approval_status="pending",
        owner_id=current_user.id,
    )

    db.add(new_vehicle)

    try:
        db.commit()
        db.refresh(new_vehicle)

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="This vehicle registration number is already registered.",
        )

    return {
        "message": "Vehicle registered successfully. Awaiting administrator approval.",
        "vehicle": {
            "id": new_vehicle.id,
            "registration_number": new_vehicle.registration_number,
            "vehicle_type": new_vehicle.vehicle_type,
            "approval_status": new_vehicle.approval_status,
            "owner_id": new_vehicle.owner_id,
        },
    }


@app.get("/vehicle-events")
def list_vehicle_events(
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    logs = (
        db.query(models.VehicleLog)
        .order_by(models.VehicleLog.timestamp.desc())
        .limit(100)
        .all()
    )

    return [
        {
            "id": log.id,
            "registration_number": log.registration_number,
            "direction": log.direction,
            "camera_id": log.camera_id,
            "authorized": log.authorized,
            "timestamp": log.timestamp,
            "vehicle_id": log.vehicle_id
        }
        for log in logs
    ]

# ---------- VEHICLE EVENT RECORDING ----------

@app.post("/vehicle-events", status_code=201)
def record_vehicle_event(
    event: VehicleEventCreate,
    db: Session = Depends(get_db),
    camera_authenticated: bool = Depends(verify_camera_api_key),
):
    vehicle = (
        db.query(models.Vehicle)
        .filter(
            models.Vehicle.registration_number
            == event.registration_number
        )
        .first()
    )

    authorized = (
        vehicle is not None
        and vehicle.approval_status == "approved"
    )

    log = models.VehicleLog(
    event_id=event.event_id,
    vehicle_id=vehicle.id if vehicle else None,
    registration_number=event.registration_number,
    direction=event.direction,
    camera_id=event.camera_id,
    authorized=authorized,
    )

    db.add(log)

    try:
        db.commit()
        db.refresh(log)

    except IntegrityError:
        db.rollback()

        existing_event = (
            db.query(models.VehicleLog)
            .filter(
                models.VehicleLog.event_id == event.event_id
            )
            .first()
        )

        if existing_event is not None:
            same_event = (
                existing_event.registration_number
                == event.registration_number
                and existing_event.direction == event.direction
                and existing_event.camera_id == event.camera_id
            )

            if not same_event:
                raise HTTPException(
                    status_code=409,
                    detail="event_id was already used for a different event.",
                )

            return {
                "message": "Duplicate event ignored.",
                "event": {
                    "id": existing_event.id,
                    "event_id": existing_event.event_id,
                    "registration_number": existing_event.registration_number,
                    "direction": existing_event.direction,
                    "camera_id": existing_event.camera_id,
                    "authorized": existing_event.authorized,
                    "timestamp": existing_event.timestamp,
                    "vehicle_id": existing_event.vehicle_id,
                },
            }

        raise HTTPException(
            status_code=409,
            detail="Event could not be recorded because of a database conflict.",
        )

    return {
        "message": "Vehicle event recorded.",
        "event": {
            "id": log.id,
            "event_id": log.event_id,
            "registration_number": log.registration_number,
            "direction": log.direction,
            "camera_id": log.camera_id,
            "authorized": log.authorized,
            "timestamp": log.timestamp,
            "vehicle_id": log.vehicle_id,
        },
    }

# ---------- CURRENT OCCUPANCY ----------

@app.get("/occupancy")
def get_occupancy(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Get all recorded vehicle events, newest first.
    events = (
        db.query(models.VehicleLog)
        .order_by(
            models.VehicleLog.timestamp.desc(),
            models.VehicleLog.id.desc(),
        )
        .all()
    )

    # The first event encountered for each registration number
    # is its latest recorded event.
    latest_events = {}

    for event in events:
        registration_number = event.registration_number.strip().upper()

        if registration_number not in latest_events:
            latest_events[registration_number] = event

    # A vehicle is inside if its latest event is entry.
    # Approval status does not determine physical occupancy.
    inside_vehicles = []

    for registration_number, event in latest_events.items():
        if event.direction != "entry":
            continue

        vehicle = None

        if event.vehicle_id is not None:
            vehicle = db.query(models.Vehicle).filter(
                models.Vehicle.id == event.vehicle_id
            ).first()

        inside_vehicles.append({
            "vehicle_id": event.vehicle_id,
            "registration_number": registration_number,
            "vehicle_type": (
                vehicle.vehicle_type if vehicle else "unknown"
            ),
            "approval_status": (
                vehicle.approval_status if vehicle else "unknown"
            ),
            "authorized": event.authorized,
            "last_event": event.direction,
            "last_event_time": event.timestamp,
        })

    # Put unauthorized vehicles first for easier security monitoring.
    inside_vehicles.sort(
        key=lambda vehicle: (
            vehicle["authorized"],
            vehicle["registration_number"],
        )
    )

    return {
        "vehicles_inside": len(inside_vehicles),
        "authorized_vehicles_inside": sum(
            1 for vehicle in inside_vehicles
            if vehicle["authorized"]
        ),
        "unauthorized_vehicles_inside": sum(
            1 for vehicle in inside_vehicles
            if not vehicle["authorized"]
        ),
        "vehicles": inside_vehicles,
    }

# ---------- SECURITY ALERTS ----------

@app.get("/security-alerts")
def get_security_alerts(
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    alerts = (
        db.query(models.VehicleLog)
        .filter(models.VehicleLog.authorized.is_(False))
        .order_by(
            models.VehicleLog.timestamp.desc(),
            models.VehicleLog.id.desc()
        )
        .limit(100)
        .all()
    )

    return {
        "total_alerts": len(alerts),
        "alerts": [
            {
                "id": alert.id,
                "registration_number": alert.registration_number,
                "direction": alert.direction,
                "timestamp": alert.timestamp,
                "vehicle_id": alert.vehicle_id,
                "message": (
                    "Vehicle is not registered or has not been approved."
                )
            }
            for alert in alerts
        ]
    }

# ---------- DASHBOARD STATISTICS ----------

@app.get("/dashboard/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    admin: models.User = Depends(require_admin),
):
    total_vehicles = db.query(models.Vehicle).count()

    pending_vehicles = (
        db.query(models.Vehicle)
        .filter(models.Vehicle.approval_status == "pending")
        .count()
    )

    approved_vehicles = (
        db.query(models.Vehicle)
        .filter(models.Vehicle.approval_status == "approved")
        .count()
    )

    rejected_vehicles = (
        db.query(models.Vehicle)
        .filter(models.Vehicle.approval_status == "rejected")
        .count()
    )

    unauthorized_events = (
        db.query(models.VehicleLog)
        .filter(models.VehicleLog.authorized.is_(False))
        .count()
    )

    occupancy = get_occupancy(db)

    return {
        "total_registered_vehicles": total_vehicles,
        "pending_approvals": pending_vehicles,
        "approved_vehicles": approved_vehicles,
        "rejected_vehicles": rejected_vehicles,
        "vehicles_inside": occupancy["vehicles_inside"],
        "unauthorized_events": unauthorized_events
    }

# ---------- USER REGISTRATION ----------

@app.post("/auth/register", status_code=201)
def register_user(
    user_data: UserRegister,
    db: Session = Depends(get_db)
):
    email = str(user_data.email).strip().lower()

    new_user = models.User(
        full_name=user_data.full_name,
        email=email,
        password_hash=hash_password(user_data.password),
        role=user_data.role,
        is_active=True,
    )

    db.add(new_user)

    try:
        db.commit()
        db.refresh(new_user)

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists."
        )

    return {
        "message": "Account created successfully.",
        "user": {
            "id": new_user.id,
            "full_name": new_user.full_name,
            "email": new_user.email,
            "role": new_user.role,
        }
    }


# ---------- USER LOGIN ----------

@app.post("/auth/login")
def login_user(
    login_data: UserLogin,
    db: Session = Depends(get_db)
):
    email = str(login_data.email).strip().lower()

    user = (
        db.query(models.User)
        .filter(models.User.email == email)
        .first()
    )

    if user is None or not verify_password(
        login_data.password,
        user.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password."
        )

    if not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="This account is inactive."
        )

    access_token = create_access_token(
        user_id=user.id,
        role=user.role
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": 1800,
        "user": {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
        }
    }

# ---------- MY VEHICLES ----------

@app.get("/my-vehicles")
def list_my_vehicles(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    vehicles = (
        db.query(models.Vehicle)
        .filter(models.Vehicle.owner_id == current_user.id)
        .order_by(models.Vehicle.id)
        .all()
    )

    return [
        {
            "id": vehicle.id,
            "registration_number": vehicle.registration_number,
            "vehicle_type": vehicle.vehicle_type,
            "approval_status": vehicle.approval_status,
        }
        for vehicle in vehicles
    ]

# ---------- GET ONE OF MY VEHICLES ----------

@app.get("/my-vehicles/{vehicle_id}")
def get_my_vehicle(
    vehicle_id: int = Path(gt=0),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    vehicle = (
        db.query(models.Vehicle)
        .filter(
            models.Vehicle.id == vehicle_id,
            models.Vehicle.owner_id == current_user.id,
        )
        .first()
    )

    if vehicle is None:
        raise HTTPException(
            status_code=404,
            detail="Vehicle not found.",
        )

    return {
        "id": vehicle.id,
        "registration_number": vehicle.registration_number,
        "vehicle_type": vehicle.vehicle_type,
        "approval_status": vehicle.approval_status,
    }