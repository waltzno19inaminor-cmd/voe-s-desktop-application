#!/usr/bin/env python3
"""
Скрипт для подключения к MetaTrader 5 и получения истории сделок.
Запрашивает у пользователя: Логин (Account ID), Пароль и Сервер брокера.

Требования:
    pip install MetaTrader5 pandas

Примечание для macOS / Linux:
    Библиотека MetaTrader5 работает на Windows (или в среде Wine/CrossOver/VPS).
"""

import sys
import getpass
from datetime import datetime, timedelta

try:
    import MetaTrader5 as mt5
except ImportError:
    mt5 = None

try:
    import pandas as pd
except ImportError:
    pd = None


# Типы сделок MT5
DEAL_TYPES = {
    0: "BUY",
    1: "SELL",
    2: "BALANCE",
    3: "CREDIT",
    4: "CHARGE",
    5: "CORRECTION",
    6: "BONUS",
    7: "COMMISSION",
    8: "COMM_DAILY",
    9: "COMM_MONTHLY",
    10: "AGENT_DAILY",
    11: "AGENT_MONTHLY",
    12: "SO_CHARGE",
    13: "SO_FEE",
    14: "TAX"
}

# Направление сделки (Entry)
DEAL_ENTRIES = {
    0: "IN (Вход)",
    1: "OUT (Выход)",
    2: "IN/OUT (Реверс)",
    3: "OUT BY (Встречный)"
}


def ask_credentials():
    """Запрос учетных данных у пользователя."""
    print("=" * 60)
    print(" 🔐 АВТОРИЗАЦИЯ METATRADER 5")
    print("=" * 60)
    
    # 1. Логин
    while True:
        login_str = input("Введите логин MT5 (Номер счета): ").strip()
        if login_str.isdigit():
            login = int(login_str)
            break
        print("[!] Ошибка: Логин должен состоять только из цифр. Попробуйте снова.")

    # 2. Сервер брокера
    while True:
        server = input("Введите сервер брокера (например, RoboForex-Pro, MetaQuotes-Demo): ").strip()
        if server:
            break
        print("[!] Ошибка: Сервер не может быть пустым.")

    # 3. Пароль
    password = getpass.getpass("Введите пароль MT5: ").strip()
    if not password:
        # Если getpass не сработал или пустой ввода, попробуем обычный input
        password = input("Введите пароль MT5 (видимый ввод): ").strip()

    # 4. Период истории
    days_str = input("За сколько последних дней загрузить сделки? (по умолчанию 30): ").strip()
    days = int(days_str) if days_str.isdigit() else 30

    return login, password, server, days


def fetch_deals(login, password, server, days=30):
    """Подключение к MT5 и получение истории сделок."""
    if mt5 is None:
        print("\n[ERROR] Пакет MetaTrader5 не установлен.")
        print("Для установки выполните: pip install MetaTrader5")
        print("\nОбратите внимание: библиотека MetaTrader5 поддерживается на Windows.")
        print("На macOS/Linux запустите через Wine/CrossOver или на Windows VPS.")
        sys.exit(1)

    print("\n[INFO] Инициализация подключения к MT5...")
    
    # Подключение к MetaTrader 5
    initialized = mt5.initialize(
        login=login,
        password=password,
        server=server
    )

    if not initialized:
        error_code, error_msg = mt5.last_error()
        print(f"\n[ERROR] Не удалось подключиться к MT5. Код ошибки: {error_code} ({error_msg})")
        print("Проверьте правильно ли указаны:")
        print("  - Логин счета")
        print("  - Пароль (торговый или инвесторский)")
        print("  - Точное название сервера брокера")
        return None

    print(f"[SUCCESS] Успешно подключено к счету {login} на сервере '{server}'!")
    
    # Расчет временного диапазона
    from_date = datetime.now() - timedelta(days=days)
    to_date = datetime.now() + timedelta(days=1)

    print(f"[INFO] Запрос сделок за период: {from_date.strftime('%Y-%m-%d')} — {datetime.now().strftime('%Y-%m-%d')}...")

    # Получение истории сделок
    deals = mt5.history_deals_get(from_date, to_date)
    
    if deals is None:
        error = mt5.last_error()
        print(f"[WARNING] Не удалось получить сделки или произошла ошибка: {error}")
        return None

    if len(deals) == 0:
        print("[INFO] За указанный период сделок не найдено.")
        return []

    print(f"[SUCCESS] Получено сделок: {len(deals)}")
    
    # Форматирование сделок
    formatted_deals = []
    for deal in deals:
        d = deal._asdict()
        deal_type = DEAL_TYPES.get(d['type'], str(d['type']))
        deal_entry = DEAL_ENTRIES.get(d['entry'], str(d['entry']))
        deal_time = datetime.fromtimestamp(d['time']).strftime('%Y-%m-%d %H:%M:%S')

        formatted_deals.append({
            'Ticket': d['ticket'],
            'Order': d['order'],
            'Time': deal_time,
            'Symbol': d['symbol'] if d['symbol'] else '-',
            'Type': deal_type,
            'Entry': deal_entry,
            'Volume': d['volume'],
            'Price': d['price'],
            'Commission': d['commission'],
            'Swap': d['swap'],
            'Profit': d['profit'],
            'Comment': d['comment']
        })

    return formatted_deals


def display_and_save_deals(deals):
    """Вывод сделок на экран и предложение сохранить в CSV."""
    if not deals:
        return

    print("\n" + "=" * 80)
    print(" 📊 ИСТОРИЯ СДЕЛОК METATRADER 5")
    print("=" * 80)

    if pd:
        df = pd.DataFrame(deals)
        print(df.to_string(index=False))
    else:
        header = f"{'Ticket':<10} | {'Time':<19} | {'Symbol':<8} | {'Type':<8} | {'Volume':<6} | {'Price':<10} | {'Profit':<10}"
        print(header)
        print("-" * len(header))
        for d in deals:
            print(f"{d['Ticket']:<10} | {d['Time']:<19} | {d['Symbol']:<8} | {d['Type']:<8} | {d['Volume']:<6.2f} | {d['Price']:<10.5f} | {d['Profit']:<10.2f}")

    # Предложение сохранить в файл
    save_choice = input("\nЖелаете сохранить сделки в CSV файл? (y/n): ").strip().lower()
    if save_choice in ['y', 'yes', 'д', 'да']:
        filename = input("Введите имя файла (по умолчанию 'mt5_deals.csv'): ").strip()
        if not filename:
            filename = 'mt5_deals.csv'
        if not filename.endswith('.csv'):
            filename += '.csv'

        if pd:
            df.to_csv(filename, index=False, encoding='utf-8-sig')
        else:
            import csv
            keys = deals[0].keys()
            with open(filename, 'w', newline='', encoding='utf-8-sig') as f:
                dict_writer = csv.DictWriter(f, fieldnames=keys)
                dict_writer.writeheader()
                dict_writer.writerows(deals)

        print(f"[SUCCESS] Сделки успешно сохранены в файл: {filename}")


def main():
    try:
        login, password, server, days = ask_credentials()
        deals = fetch_deals(login, password, server, days)
        display_and_save_deals(deals)
    except KeyboardInterrupt:
        print("\n\n[INFO] Выполнение прервано пользователем.")
    finally:
        if mt5 and mt5.terminal_info() is not None:
            mt5.shutdown()
            print("\n[INFO] Соединение с MT5 закрыто.")


if __name__ == "__main__":
    main()
