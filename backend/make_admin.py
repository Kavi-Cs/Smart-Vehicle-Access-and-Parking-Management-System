from getpass import getpass

from database import SessionLocal
from models import User


def main():
    email = input("Enter the account email to promote: ").strip().lower()

    confirmation = input(
        f"Promote {email} to administrator? Type YES to confirm: "
    ).strip()

    if confirmation != "YES":
        print("Cancelled. No changes made.")
        return

    db = SessionLocal()

    try:
        user = db.query(User).filter(User.email == email).first()

        if user is None:
            print("No account exists with that email.")
            return

        user.role = "admin"
        db.commit()

        print(f"Success! {user.email} is now an administrator.")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    main()