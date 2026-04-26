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
    <body style="margin:0; padding:0; background:#f3f4f6; font-family: Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding: 30px 0;">
            <table width="600" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">

              <tr>
                <td style="background:#2563EB; color:white; padding:20px; font-size:20px; font-weight:bold;">
                  CKD Guardian
                </td>
              </tr>

              <tr>
                <td style="padding:25px; color:#111827;">
                  <h2 style="margin-top:0;">Consultation Scheduled</h2>

                  <p>Hello <strong>{patient_name or 'Patient'}</strong>,</p>

                  <p>Your CKD consultation has been successfully scheduled.</p>

                  <div style="background:#f9fafb; padding:15px; border-radius:8px; margin:20px 0;">
                    <p><strong>📅 Appointment:</strong> {appointment_time}</p>
                    <p><strong>🔗 Meeting Link:</strong> {meeting_link or 'Will be shared soon'}</p>
                  </div>

                  <p><strong>🩺 Doctor Advice:</strong><br>{doctor_advice or 'No advice added yet'}</p>

                  <p style="margin-top:15px;"><strong>💊 Prescription:</strong><br>{prescription_note or 'No prescription provided'}</p>

                  <p style="margin-top:15px;"><strong>📌 What you should do:</strong><br>{patient_instruction or 'Follow instructions in app.'}</p>

                  <div style="margin-top:25px; padding:15px; background:#FEF3C7; border-radius:8px;">
                    <strong>⚠ Important:</strong><br>
                    If you cannot attend, follow prescribed medication immediately.
                  </div>

                  <a href="{meeting_link or '#'}"
                    style="display:inline-block; margin-top:20px; padding:12px 20px; background:#2563EB; color:white; text-decoration:none; border-radius:6px;">
                    Join Meeting
                  </a>
                </td>
              </tr>

              <tr>
                <td style="padding:15px; text-align:center; font-size:12px; color:#6b7280;">
                  © CKD Guardian • Stay Healthy
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
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
    <body style="margin:0; padding:0; background:#f3f4f6; font-family: Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding: 30px 0;">
            <table width="600" style="background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">

              <tr>
                <td style="background:#DC2626; color:white; padding:20px; font-size:20px; font-weight:bold;">
                  CKD Guardian Urgent Alert
                </td>
              </tr>

              <tr>
                <td style="padding:25px; color:#111827;">
                  <h2 style="margin-top:0;">Urgent CKD Case Requires Review</h2>

                  <p>Hello <strong>Dr. {doctor_name or 'Doctor'}</strong>,</p>

                  <p>A high-priority CKD case needs your attention.</p>

                  <div style="background:#FEF2F2; padding:15px; border-radius:8px; margin:20px 0; border:1px solid #FECACA;">
                    <p><strong>Patient ID:</strong> {patient_id}</p>
                    <p><strong>Risk score:</strong> {risk_score if risk_score is not None else 'N/A'}</p>
                    <p><strong>Summary:</strong> {summary or 'Please review the patient dashboard for details.'}</p>
                  </div>

                  <div style="margin-top:25px; padding:15px; background:#FEF3C7; border-radius:8px;">
                    <strong>Important:</strong><br>
                    Please review this patient in CKD Guardian as soon as possible.
                  </div>
                </td>
              </tr>

              <tr>
                <td style="padding:15px; text-align:center; font-size:12px; color:#6b7280;">
                  © CKD Guardian • Doctor Alert
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    """

    _send_email(
        to_email=doctor_email,
        to_name=doctor_name,
        subject="Urgent CKD Case Requires Review",
        html_content=html,
    )