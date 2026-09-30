"""Utilidades de validación y sanitización de tarjetas bancarias (PCI-DSS) para el backend."""
import re
from datetime import datetime
from typing import Dict, Any, Tuple


def clean_card_number(val: str, max_digits: int = 16) -> str:
    """Elimina cualquier caracter que no sea dígito y limita la longitud."""
    if not val:
        return ""
    digits = re.sub(r"\D", "", str(val))
    return digits[:max_digits]


def format_card_number(val: str) -> str:
    """Formatea en bloques de 4 dígitos: '4557 1234 5678 9012'."""
    digits = clean_card_number(val, 16)
    if not digits:
        return ""
    chunks = [digits[i:i + 4] for i in range(0, len(digits), 4)]
    return " ".join(chunks)


def detect_card_brand(val: str) -> str:
    """Detecta la franquicia emisora de la tarjeta."""
    digits = clean_card_number(val, 16)
    if not digits:
        return "Tarjeta"
    if digits.startswith("4"):
        return "Visa"
    if re.match(r"^(5[1-5]|2[2-7])", digits):
        return "Mastercard"
    if re.match(r"^3[47]", digits):
        return "Amex"
    if re.match(r"^(36|38|30[0-5])", digits):
        return "Diners"
    if re.match(r"^(6011|65|64[4-9])", digits):
        return "Discover"
    return "Tarjeta"


def luhn_check(val: str) -> bool:
    """Algoritmo de Luhn (ISO/IEC 7812) para validar la integridad matemática del número."""
    digits = clean_card_number(val, 19)
    if len(digits) < 13:
        return False

    total = 0
    should_double = False
    for char in reversed(digits):
        digit = int(char)
        if should_double:
            digit *= 2
            if digit > 9:
                digit -= 9
        total += digit
        should_double = not should_double

    return total % 10 == 0


def clean_card_holder(val: str) -> str:
    """Sanitiza el nombre del titular: solo letras y espacios, en mayúsculas."""
    if not val:
        return ""
    cleaned = re.sub(r"[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]", "", str(val))
    cleaned = re.sub(r"\s+", " ", cleaned).strip().upper()
    return cleaned[:45]


def validate_card_payload(number: str, holder: str, expiry: str, cvc: str) -> Tuple[bool, Dict[str, Any]]:
    """Valida los campos completos de una tarjeta bancaria."""
    errors = {}

    # 1. Validar número de tarjeta (16 dígitos + Luhn)
    clean_num = clean_card_number(number, 16)
    if not clean_num:
        errors["number"] = "El número de tarjeta es obligatorio."
    elif len(clean_num) != 16:
        errors["number"] = f"El número de tarjeta debe tener exactamente 16 dígitos (recibidos {len(clean_num)})."
    elif not luhn_check(clean_num):
        errors["number"] = "Número de tarjeta inválido (checksum bancario Luhn falló)."

    # 2. Validar titular
    clean_name = clean_card_holder(holder)
    if not clean_name:
        errors["holder"] = "El nombre del titular es obligatorio."
    else:
        parts = clean_name.split()
        if len(clean_name) < 4 or len(parts) < 2:
            errors["holder"] = "Ingresa nombres y apellidos completos."

    # 3. Validar Expiración (MM/AA)
    exp_digits = re.sub(r"\D", "", str(expiry or ""))
    if len(exp_digits) != 4:
        errors["expiry"] = "Formato de expiración inválido. Debe ser MM/AA."
    else:
        month = int(exp_digits[:2])
        year_2d = int(exp_digits[2:])
        if month < 1 or month > 12:
            errors["expiry"] = "Mes de expiración inválido (01-12)."
        else:
            now = datetime.now()
            curr_y = now.year % 100
            curr_m = now.month
            if year_2d < curr_y or (year_2d == curr_y and month < curr_m):
                errors["expiry"] = "La tarjeta se encuentra expirada."

    # 4. Validar CVC
    clean_cvc_val = re.sub(r"\D", "", str(cvc or ""))
    if len(clean_cvc_val) not in (3, 4):
        errors["cvc"] = "El código CVC debe tener 3 o 4 dígitos."

    is_valid = len(errors) == 0
    return is_valid, {
        "is_valid": is_valid,
        "brand": detect_card_brand(clean_num),
        "last4": clean_num[-4:] if len(clean_num) >= 4 else "",
        "formatted_number": format_card_number(clean_num),
        "holder": clean_name,
        "errors": errors
    }
