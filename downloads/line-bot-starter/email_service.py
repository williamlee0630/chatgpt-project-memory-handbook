import smtplib
from email.message import EmailMessage


def send_record_email(
    *,
    sender_address: str,
    app_password: str,
    receiver_email: str,
    subject: str,
    body: str,
    smtp_factory=smtplib.SMTP_SSL,
) -> None:
    """使用 Gmail SMTP 同步寄出一封純文字紀錄信。"""
    message = EmailMessage()
    message["From"] = sender_address
    message["To"] = receiver_email
    message["Subject"] = subject
    message.set_content(body)

    with smtp_factory("smtp.gmail.com", 465, timeout=15) as smtp:
        smtp.login(sender_address, app_password)
        refused_recipients = smtp.send_message(message)
        if refused_recipients:
            raise RuntimeError("Gmail SMTP refused one or more recipients")
