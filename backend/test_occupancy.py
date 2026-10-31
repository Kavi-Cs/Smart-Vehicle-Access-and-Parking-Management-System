import os
import uuid
import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("CAMERA_API_KEY")
API_URL = "http://127.0.0.1:8000/vehicle-events"

if not API_KEY:
    raise RuntimeError("CAMERA_API_KEY is missing from .env")

headers = {
    "X-Camera-API-Key": API_KEY
}

payload = {
    "event_id": str(uuid.uuid4()),
    "registration_number": "SECURITY-TEST-99",
    "direction": "entry",
    "camera_id": "ENTRY_CAM_01"
}

response = requests.post(
    API_URL,
    json=payload,
    headers=headers,
    timeout=10
)

print("UNREGISTERED VEHICLE TEST")
print("Status:", response.status_code)
print("Response:", response.text)

if response.status_code != 201:
    raise RuntimeError("Event recording failed.")

event = response.json()["event"]

assert event["authorized"] is False
assert event["vehicle_id"] is None

print("\nSUCCESS: Unregistered vehicle recorded as unauthorized.")