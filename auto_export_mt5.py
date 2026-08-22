#!/usr/bin/env python3
"""
Универсальный скрипт авто-экспорта сделок MetaTrader 5 (Windows & macOS).

Функционал:
1. Автоматически определяет ОС (Windows / macOS).
2. На Windows: Находит установленный MT5 (terminal64.exe), подключается через API и извлекает историю сделок.
3. На macOS: Находит виртуальные папки Wine/MT5 (Library/Application Support/...) и файлы экспорта (trades.json / deals.csv).
4. Автоматически сохраняет выгруженные сделки в CSV и JSON в текущую папку.

Использование:
    python3 auto_export_mt5.py
"""

import os
import sys
import glob
import json
from datetime import datetime, timedelta

# Попытка импорта pandas и MetaTrader5
try:
    import pandas as pd
except ImportError:
    pd = None

try:
    import MetaTrader5 as mt5
except ImportError:
    mt5 = None


def find_windows_mt5_paths():
    """Поиск пути к terminal64.exe на Windows."""
    possible_paths = []
    
    # 1. Стандартные папки Program Files
    program_files = [
        os.environ.get("ProgramFiles", "C:\\Program Files"),
        os.environ.get("ProgramFiles(x86)", "C:\\Program Files (x86)"),
        os.path.expanduser("~\\AppData\\Local\\Programs")
    ]
    
    for pf in program_files:
        if os.path.exists(pf):
            # Поиск всех terminal64.exe в подпапках
            matches = glob.glob(os.path.join(pf, "**", "terminal64.exe"), recursive=True)
            possible_paths.extend(matches)
            
    return possible_paths


def find_mac_wine_trade_files():
    """Поиск файлов экпортированных сделок (trades.json / deals.csv) в Wine на macOS."""
    home = os.path.expanduser("~")
    
    # Распространенные пути к папке Common/Files и MQL5/Files в Wine на Mac
    patterns = [
        os.path.join(home, "Library/Application Support/net.metaquotes.wine.metatrader5/Terminal/Common/Files/trades.json"),
        os.path.join(home, "Library/Application Support/net.metaquotes.wine.metatrader5/drive_c/users/*/AppData/Roaming/MetaQuotes/Terminal/Common/Files/trades.json"),
        os.path.join(home, "Library/Application Support/com.metaquotes.metatrader5/netdrive/Terminal/Common/Files/trades.json"),
        os.path.join(home, ".wine/drive_c/users/*/AppData/Roaming/MetaQuotes/Terminal/Common/Files/trades.json"),
        "./trades.json",
        "./deals.csv"
    ]

    found_files = []
    for p in patterns:
        if "*" in p:
            found_files.extend(glob.glob(p))
        elif os.path.exists(p):
            found_files.append(p)

    # Рекурсивный поиск в папке Library при необходимости
    if not found_files:
        wine_root = os.path.join(home, "Library/Application Support/net.metaquotes.wine.metatrader5")
        if os.path.exists(wine_root):
            for root, dirs, files in os.walk(wine_root):
                for f in files:
                    if f in ["trades.json", "deals.csv", "history.json"]:
                        found_files.append(os.path.join(root, f))

    return found_files


def export_from_windows_mt5(days=30):
    """Экспорт сделок на Windows через родную библиотеку MetaTrader5."""
    if mt5 is None:
        print("[!] Пакет MetaTrader5 не установлен. Установите: pip install MetaTrader5")
        return None

    print("[INFO] Попытка подключиться к запущенному MT5 на Windows...")
    
    # 1. Попытка прямого подключения (если MT5 уже запущен)
    if not mt5.initialize():
        print("[INFO] Прямое подключение не удалось. Выполняется автопоиск пути к terminal64.exe...")
        paths = find_windows_mt5_paths()
        
        connected = False
        for exe_path in paths:
            print(f" -> Пробуем запустить: {exe_path}")
            if mt5.initialize(path=exe_path):
                connected = True
                print(f"[SUCCESS] Успешно подключено через {exe_path}")
                break
                
        if not connected:
            print(f"[ERROR] Не удалось подключиться к MT5. Код ошибки: {mt5.last_error()}")
            return None
    else:
        print("[SUCCESS] Успешное подключение к запущенному терминалу MT5!")

    # 2. Получение сделок
    from_date = datetime.now() - timedelta(days=days)
    to_date = datetime.now() + timedelta(days=1)
    
    deals = mt5.history_deals_get(from_date, to_date)
    mt5.shutdown()
    
    if deals is None or len(deals) == 0:
        print("[INFO] Сделок за указанный период не найдено.")
        return []

    print(f"[SUCCESS] Найдено сделок: {len(deals)}")
    
    # Преобразование сделок
    deals_list = []
    for d in deals:
        deal_dict = d._asdict()
        deal_dict['time_formatted'] = datetime.fromtimestamp(deal_dict['time']).strftime('%Y-%m-%d %H:%M:%S')
        deals_list.append(deal_dict)

    return deals_list


def find_mac_mql5_experts_dirs():
    """Находит все целевые папки MQL5/Experts, Advisors и Indicators на macOS без задержек."""
    home = os.path.expanduser("~")
    base_dirs = [
        os.path.join(home, "Library/Application Support/net.metaquotes.wine.metatrader5/drive_c/Program Files/MetaTrader 5/MQL5"),
        os.path.join(home, "Library/Application Support/com.metaquotes.metatrader5/netdrive/MQL5"),
        os.path.join(home, ".wine/drive_c/Program Files/MetaTrader 5/MQL5")
    ]
    
    appdata_glob = os.path.join(home, "Library/Application Support/net.metaquotes.wine.metatrader5/drive_c/users/*/AppData/Roaming/MetaQuotes/Terminal/*/MQL5")
    base_dirs.extend(glob.glob(appdata_glob))

    target_dirs = []
    for b in base_dirs:
        if os.path.exists(b):
            target_dirs.append(os.path.join(b, "Experts"))
            target_dirs.append(os.path.join(b, "Experts/Advisors"))
            target_dirs.append(os.path.join(b, "Indicators"))

    return [p for p in target_dirs if os.path.exists(p)]


def auto_install_mq5_script():
    """Автоматически копирует ExportTrades.mq5 и ExportTrades.ex5 в папки экспертов и индикаторов MT5 на Mac."""
    local_files = ["ExportTrades.mq5", "ExportTrades.ex5"]
    
    mql5_dirs = find_mac_mql5_experts_dirs()
    if not mql5_dirs:
        return False

    copied_count = 0
    import shutil
    for target_dir in mql5_dirs:
        os.makedirs(target_dir, exist_ok=True)
        for fname in local_files:
            if os.path.exists(fname):
                dest_path = os.path.join(target_dir, fname)
                try:
                    shutil.copy2(fname, dest_path)
                    copied_count += 1
                    print(f"[AUTO-INSTALL] Файл {fname} скопирован: {dest_path}")
                except Exception as e:
                    pass

    return copied_count > 0


def try_parse_html_xml_reports():
    """Автоматический поиск и парсинг HTML/XML отчетов, сохраненных пользователем из MT5."""
    home = os.path.expanduser("~")
    search_dirs = [
        os.path.join(home, "Downloads"),
        os.path.join(home, "Desktop"),
        os.path.join(home, "Documents"),
        os.path.join(home, "Library/Application Support/net.metaquotes.wine.metatrader5/drive_c"),
        os.path.join(home, "Library/Application Support/net.metaquotes.wine.metatrader5/Terminal/Common/Files")
    ]

    report_files = []
    for s_dir in search_dirs:
        if os.path.exists(s_dir):
            for file in os.listdir(s_dir):
                if file.lower().startswith("report") and file.lower().endswith((".html", ".xml", ".htm")):
                    report_files.append(os.path.join(s_dir, file))

    if not report_files:
        return None

    # Берём самый свежий отчет
    report_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
    target_report = report_files[0]
    print(f"[INFO] Найден сохраненный отчёт MT5: {target_report}")

    deals = []
    try:
        if pd:
            dfs = pd.read_html(target_report)
            if dfs:
                df = dfs[0]
                section = None
                headers = []
                
                for idx, row in df.iterrows():
                    vals = [str(x).strip() for x in row.values if pd.notna(x) and str(x).strip() != "nan"]
                    if not vals:
                        continue
                    first_val = vals[0]
                    if first_val in ["Сделки", "Deals", "Позиции", "Positions"]:
                        section = first_val
                        headers = []
                        continue
                    
                    if section:
                        if any(k in vals for k in ["Время", "Time", "Сделка", "Deal", "Позиция", "Position"]):
                            headers = vals
                            continue
                        if headers and len(vals) >= len(headers) - 3:
                            # Проверяем, что первая колонка похожа на дату
                            if vals[0].startswith("202") or vals[0].startswith("201") or vals[0].isdigit():
                                item = dict(zip(headers[:len(vals)], vals))
                                deals.append(item)
                        elif first_val in ["Результаты", "Results", "Баланс:", "Balance:", "Ордера", "Orders"]:
                            if first_val in ["Результаты", "Results", "Баланс:", "Balance:"]:
                                section = None

                if deals:
                    print(f"[SUCCESS] Отчет HTML успешно распарсен! Получено сделок: {len(deals)}")
                    return deals
    except Exception as e:
        print(f"[WARNING] Ошибка при парсинге отчета {target_report}: {e}")

    return None




def export_from_mac_wine_files():
    """Экспорт сделок на macOS из найденных папок Wine или HTML отчетов."""
    # 1. Сначала пробуем автоустановку ExportTrades.mq5 в папку MT5
    installed = auto_install_mq5_script()
    if installed:
        print("[INFO] Скрипт ExportTrades.mq5 был автоматически помещен в папку MT5 (Навигатор -> Советники/Experts)!")

    # 2. Ищем сгенерированный trades.json
    print("[INFO] Поиск файлов сделок в среде Wine на macOS...")
    files = find_mac_wine_trade_files()

    if files:
        target_file = files[0]
        print(f"[SUCCESS] Найден файл данных: {target_file}")
        try:
            with open(target_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return data.get("deals") or data.get("positions") or data
                return data
        except Exception as e:
            print(f"[ERROR] Ошибка при чтении файла {target_file}: {e}")

    # 3. Альтернатива БЕЗ mq5: Авто-поиск HTML/XML отчётов из MT5
    print("[INFO] Поиск сохраненных HTML/XML отчетов из MT5...")
    parsed_report = try_parse_html_xml_reports()
    if parsed_report:
        return parsed_report

    print("\n[WARNING] Авто-экспорт без сохраненного отчета требует включения ExportTrades.mq5 в MT5.")
    print(" 💡 ИНСТРУКЦИЯ (Бесплатно & 1 клик):")
    print(" 1. В MT5 скопирован файл 'ExportTrades.mq5' в окно 'Навигатор' -> 'Советники' (Experts).")
    print(" 2. Перетащите ExportTrades на любой график в MT5.")
    print(" 3. ИЛИ в MT5 внизу во вкладке 'История' нажмите правой кнопкой -> 'Отчет' -> 'Сохранить как HTML' в Загрузки.")
    return None



def save_exported_data(data, output_basename="mt5_auto_export"):
    """Сохранение полученных сделок в CSV и JSON файлы."""
    if not data:
        print("[!] Нет данных для сохранения.")
        return

    csv_filename = f"{output_basename}.csv"
    json_filename = f"{output_basename}.json"

    # Сохранение в JSON
    with open(json_filename, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[SUCCESS] JSON сохранен: {os.path.abspath(json_filename)}")

    # Сохранение в CSV
    if pd:
        df = pd.DataFrame(data)
        df.to_csv(csv_filename, index=False, encoding='utf-8-sig')
        print(f"[SUCCESS] CSV сохранен: {os.path.abspath(csv_filename)}")
    else:
        import csv
        keys = data[0].keys()
        with open(csv_filename, 'w', newline='', encoding='utf-8-sig') as f:
            dict_writer = csv.DictWriter(f, fieldnames=keys)
            dict_writer.writeheader()
            dict_writer.writerows(data)
        print(f"[SUCCESS] CSV сохранен: {os.path.abspath(csv_filename)}")


def main():
    print("=" * 65)
    print(" 🚀 АВТО-ЭКСПОРТ СДЕЛОК METATRADER 5 (Cross-Platform)")
    print("=" * 65)
    
    current_os = sys.platform
    print(f"[INFO] Операционная система: {current_os} ({'Windows' if current_os == 'win32' else 'macOS/Linux'})")

    data = None
    if current_os == "win32":
        data = export_from_windows_mt5(days=60)
    else:
        data = export_from_mac_wine_files()

    if data is not None:
        save_exported_data(data)
        print("\n[COMPLETE] Авто-экспорт успешно завершен!")
    else:
        print("\n[FAILED] Авто-экспорт не удался. Проверьте сообщения выше.")


if __name__ == "__main__":
    main()
