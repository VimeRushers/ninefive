from pathlib import Path

from app.services.pricelist_parser import parse_pricelist


def test_parse_csv_with_english_header(tmp_path: Path):
    csv_file = tmp_path / "price.csv"
    csv_file.write_text(
        "Name,Description,Price\n"
        "Laptop,Dell Latitude,12000 MDL\n"
        'Monitor,27 inch,"3 500,50 MDL"\n',
        encoding="utf-8",
    )

    items = parse_pricelist(csv_file)

    assert len(items) == 2
    assert items[0].name == "Laptop"
    assert items[0].description == "Dell Latitude"
    assert items[0].price_amount == 12000.0
    assert items[0].price_currency == "MDL"
    assert items[1].price_amount == 3500.5


def test_parse_csv_semicolon_with_romanian_header(tmp_path: Path):
    csv_file = tmp_path / "ro.csv"
    csv_file.write_text(
        "Denumire;Descriere;Preț\nCiment;Sac 50kg;95,5\n", encoding="utf-8"
    )

    items = parse_pricelist(csv_file)

    assert items[0].name == "Ciment"
    assert items[0].description == "Sac 50kg"
    assert items[0].price_amount == 95.5


def test_parse_csv_without_header_uses_column_order(tmp_path: Path):
    csv_file = tmp_path / "noheader.csv"
    csv_file.write_text("Laptop,Dell,1000\n", encoding="utf-8")

    items = parse_pricelist(csv_file)

    assert items[0].name == "Laptop"
    assert items[0].description == "Dell"
    assert items[0].price_amount == 1000.0


def test_parse_xlsx(tmp_path: Path):
    from openpyxl import Workbook

    xlsx_file = tmp_path / "price.xlsx"
    workbook = Workbook()
    sheet = workbook.active
    assert sheet is not None
    sheet.append(["Name", "Description", "Price"])
    sheet.append(["Table", "Wooden desk", 2500])
    workbook.save(xlsx_file)

    items = parse_pricelist(xlsx_file)

    assert len(items) == 1
    assert items[0].name == "Table"
    assert items[0].price_amount == 2500.0


def test_unsupported_extension_returns_empty(tmp_path: Path):
    other = tmp_path / "price.txt"
    other.write_text("Name,Price\nLaptop,1000\n", encoding="utf-8")

    assert parse_pricelist(other) == []


def test_empty_file_returns_empty(tmp_path: Path):
    empty = tmp_path / "empty.csv"
    empty.write_text("", encoding="utf-8")

    assert parse_pricelist(empty) == []
