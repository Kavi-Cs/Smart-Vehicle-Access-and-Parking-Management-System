import os
import uuid

import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("CAMERA_API_KEY")
API_URL = "http://127.0.0.1:8000/vehicle-events"

if not API_KEY:
    raise RuntimeError("CAMERA_API_KEY is missing from .env")

# Generate one event ID and reuse it for the duplicate test.
event_id = str(uuid.uuid4())

payload = {
    "event_id": event_id,
    "registration_number": "TEST-1234",
    "direction": "entry",
    "camera_id": "ENTRY_CAM_01",
}

headers = {
    "X-Camera-API-Key": API_KEY,
}


# TEST 1: Submit a new event.
first_response = requests.post(
    API_URL,
    headers=headers,
    json=payload,
    timeout=10,
)

print("\nTEST 1 — First submission")
print("Status:", first_response.status_code)
print("Response:", first_response.text)

if first_response.status_code != 201:
    raise SystemExit("Test 1 failed. Fix this before continuing.")


# TEST 2: Submit exactly the same event again.
second_response = requests.post(
    API_URL,
    headers=headers,
    json=payload,
    timeout=10,
)

print("\nTEST 2 — Duplicate submission")
print("Status:", second_response.status_code)
print("Response:", second_response.text)

if second_response.status_code != 201:
    raise SystemExit("Test 2 failed: expected HTTP 201 for the duplicate.")


# Verify both responses identify the same database event.
first_event = first_response.json()["event"]
second_event = second_response.json()["event"]

if first_event["id"] != second_event["id"]:
    raise SystemExit("FAILED: duplicate created a different database event.")

print("\nSUCCESS: Both requests returned the same event ID.")
print("Database event ID:", first_event["id"])