"""Pruebas unitarias para validación estricta de tarjetas bancarias (16 dígitos, bloques de 4, Luhn, etc.)."""
import pytest
from app.core.card_validator import (
    clean_card_number,
    format_card_number,
    detect_card_brand,
    luhn_check,
    clean_card_holder,
    validate_card_payload
)


def test_clean_card_number_removes_letters_and_symbols():
    # El usuario reportó escribir 'kkkkkkkkkkkkkkkk'
    assert clean_card_number("kkkkkkkkkkkkkkkk") == ""
    assert clean_card_number("4557-1234-5678-9012") == "4557123456789012"
    assert clean_card_number("4557 1234 5678 9012 99999") == "4557123456789012"  # Máximo 16 dígitos
    assert clean_card_number(None) == ""


def test_format_card_number_in_blocks_of_4():
    # Letras completamente ignoradas
    assert format_card_number("kkkkkkkkkkkkkkkk") == ""

    # Formateo 4x4
    assert format_card_number("4557123456789012") == "4557 1234 5678 9012"
    assert format_card_number("4111111111111111") == "4111 1111 1111 1111"
    assert format_card_number("4557") == "4557"
    assert format_card_number("45571") == "4557 1"


def test_detect_card_brand():
    assert detect_card_brand("4111 1111 1111 1111") == "Visa"
    assert detect_card_brand("5412 7534 8901 2345") == "Mastercard"
    assert detect_card_brand("3782 8224 6310 005") == "Amex"
    assert detect_card_brand("3612 3456 7890 12") == "Diners"
    assert detect_card_brand("6011 0000 0000 0000") == "Discover"
    assert detect_card_brand("9999 0000 0000 0000") == "Tarjeta"


def test_luhn_algorithm_checksum():
    # Tarjeta sandbox válida (pasa Luhn)
    assert luhn_check("4111 1111 1111 1111") is True

    # Tarjeta con dígito de control corrupto
    assert luhn_check("4111 1111 1111 1112") is False

    # Tarjeta demasiado corta
    assert luhn_check("12345") is False


def test_clean_card_holder():
    assert clean_card_holder("carlos mendoza") == "CARLOS MENDOZA"
    assert clean_card_holder("María-José 123! Gómez") == "MARÍAJOSÉ GÓMEZ"


def test_validate_card_payload_success():
    is_valid, data = validate_card_payload(
        number="4111 1111 1111 1111",
        holder="CARLOS MENDOZA",
        expiry="12/28",
        cvc="123"
    )
    assert is_valid is True
    assert data["brand"] == "Visa"
    assert data["last4"] == "1111"
    assert data["formatted_number"] == "4111 1111 1111 1111"
    assert len(data["errors"]) == 0


def test_validate_card_payload_rejection():
    # Caso 1: Todo letras en número (reporte del usuario)
    is_valid, data = validate_card_payload(
        number="kkkkkkkkkkkkkkkk",
        holder="CARLOS",
        expiry="99/99",
        cvc="abc"
    )
    assert is_valid is False
    assert "number" in data["errors"]
    assert "holder" in data["errors"]
    assert "expiry" in data["errors"]
    assert "cvc" in data["errors"]

    # Caso 2: Menos de 16 dígitos
    is_valid, data = validate_card_payload(
        number="4111 1111",
        holder="CARLOS MENDOZA",
        expiry="12/28",
        cvc="123"
    )
    assert is_valid is False
    assert "16 dígitos" in data["errors"]["number"]

    # Caso 3: Tarjeta expirada en el pasado
    is_valid, data = validate_card_payload(
        number="4111 1111 1111 1111",
        holder="CARLOS MENDOZA",
        expiry="01/20",
        cvc="123"
    )
    assert is_valid is False
    assert "expirada" in data["errors"]["expiry"]
