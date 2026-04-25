import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from ..config import settings

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"
BREVO_API_KEY = settings.BREVO_API_KEY
MAIL_SENDER_EMAIL = settings.MAIL_SENDER_EMAIL
MAIL_SENDER_NAME = settings.MAIL_SENDER_NAME or "CKD Guardian"

print("BREVO KEY FOUND:", bool(BREVO_API_KEY))
print("MAIL SENDER:", MAIL_SENDER_EMAIL)


def _send_email(to_email: str, to_name: str, subject: str, html_content: str):
    if not BREVO_API_KEY or not MAIL_SENDER_EMAIL:
        print("BREVO EMAIL SKIPPED: Missing config")
        return

    payload = {
        "sender": {
            "name": MAIL_SENDER_NAME,
            "email": MAIL_SENDER_EMAIL,
        },
        "to": [
            {
                "email": to_email,
                "name": to_name or to_email,
            }
        ],
        "subject": subject,
        "htmlContent": html_content,
    }

    headers = {
        "accept": "application/json",
        "api-key": BREVO_API_KEY,
        "content-type": "application/json",
        "user-agent": "CKD-Guardian-Backend/1.0",
        "connection": "close",
    }

    try:
        session = requests.Session()

        retries = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=["POST"],
        )

        session.mount("https://", HTTPAdapter(max_retries=retries))

        response = session.post(
            BREVO_API_URL,
            json=payload,
            headers=headers,
            timeout=30,
            verify=True,
        )

        if response.status_code >= 400:
            print("BREVO EMAIL ERROR:", response.status_code, response.text)
        else:
            print("BREVO EMAIL SENT:", response.text)

    except Exception as exc:
        print("BREVO EMAIL EXCEPTION:", str(exc))


def send_patient_consultation_email(
    patient_email: str,
    patient_name: str,
    appointment_time: str,
    meeting_link: str | None,
    doctor_advice: str | None,
    prescription_note: str | None,
    patient_instruction: str | None,
):
    html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
        <h2>CKD Guardian Consultation Scheduled</h2>

        <p>Hello {patient_name or 'Patient'},</p>

        <p>Your CKD consultation has been scheduled.</p>

        <p><strong>Appointment time:</strong> {appointment_time}</p>
        <p><strong>Meeting link:</strong> {meeting_link or 'Will be shared soon'}</p>
        <p><strong>Doctor advice:</strong> {doctor_advice or 'No advice added yet'}</p>
        <p><strong>Prescription note:</strong> {prescription_note or 'No prescription note added yet'}</p>

        <p><strong>What you should do now:</strong> {patient_instruction or 'Please check the app for updates.'}</p>

        <p><strong>Important:</strong> If you cannot attend the meeting immediately, please take the prescribed medicines as advised by your doctor.</p>

        <p>Open CKD Guardian for the latest consultation details.</p>
      </body>
    </html>
    """
    _send_email(
        to_email=patient_email,
        to_name=patient_name,
        subject="CKD Guardian Consultation Scheduled",
        html_content=html,
    )


def send_doctor_urgent_alert_email(
    doctor_email: str,
    doctor_name: str,
    patient_id: int,
    risk_score: float | int | None,
    summary: str | None,
):
    html = f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #0f172a;">
        <h2>Urgent CKD Case Requires Review</h2>
        <p>Hello Dr. {doctor_name or ''},</p>
        <p>A high-priority CKD case needs attention.</p>
        <p><strong>Patient ID:</strong> {patient_id}</p>
        <p><strong>Risk score:</strong> {risk_score if risk_score is not None else 'N/A'}</p>
        <p><strong>Summary:</strong> {summary or 'See doctor dashboard for details.'}</p>
        <p>Please review the case in CKD Guardian as soon as possible.</p>
      </body>
    </html>
    """
    _send_email(
        to_email=doctor_email,
        to_name=doctor_name,
        subject="Urgent CKD Case Requires Review",
        html_content=html,
    )