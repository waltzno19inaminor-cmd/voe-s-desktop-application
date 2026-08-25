# 📖 Руководство по системе авто-обновлений (Payload Updater)

Данный документ подробно описывает устройство, архитектуру и пошаговый процесс генерации обновлений для приложения **J.L.JÖRMUNGANDR** (Tauri + Nuxt).

---

## 🏗️ 1. Архитектура системы обновлений

Приложение использует **Payload Updater (Инкрементальный веб-апдейтер)**:
- Позволяет мгновенно обновлять веб-интерфейс (`.output/public`), компоненты, стили и аналитику без необходимости переустановки бинарного файла приложения на ПК пользователя.
- Скачивает дифференциальный архив `patch.zip` (около **1 МБ**), сверяет SHA256 каждого файла с `payload-manifest.json` и активирует их на лету.

---

## 📂 2. Структура файлов и компонентов

### Скрипты сборки и подписи:
- `scripts/create-payload-manifest.mjs` — анализирует дифференциальные изменения между текущей сборкой и прошлыми версиями (`.payload-history`), генерирует `payload-manifest.json`, архивы `payload.zip` / `patch.zip` и подписывает манифест ключом.
- `.secrets/hotfix/jlj-hotfix.key` и `jlj-hotfix.password` — локальный закрытый ключ подписи Tauri Signer и пароль к нему (автоматически считываются скриптом).

### Клиентский движок приложения:
- `src-tauri/src/payload_update.rs` — модуль Rust, отвечающий за безопасную загрузку, сверку хэшей, установку и очистку временных папок обновлений.
- `src/widgets/workspace/ui/init/ExInitialization.vue` — интерфейс стартового экрана: проверка доступных версий, отображение карточки обновления, процент шкалы и скорость скачивания (в МБ/с).

---

## ⚠️ 3. Критически важные технические решения (Gotchas)

При работе с системой обновлений соблюдаются 3 фундаментальных правила:

### 1. Фильтрация архивов от рекурсивной упаковки
В скрипте `create-payload-manifest.mjs` в функции `listFiles` установлен обязательный фильтр:
```javascript
if (entry.name.endsWith('.zip') || entry.name.endsWith('.jljpatch') || entry.name === 'payload' || entry.name === 'dist') {
  continue;
}
```
*Зачем это нужно:* Без этого фильтра старые архивы попадали внутрь новых `.zip` архивов, раздувая их объем с 1 МБ до 200+ МБ.

### 2. Права доступа на macOS/Unix (`Permission denied` / `os error 66`)
В `payload_update.rs` реализованы:
- Смена прав `chmod -R u+w` перед вызовом `rm -rf` при очистке временных каталогов `payload-staging`.
- Принудительная установка прав `0o755` на все файлы, распаковываемые из ZIP-архивов.
*Зачем это нужно:* Запрещает macOS блокировать удаление папок со статусом `Permission denied`, если из архива распаковались файлы «только для чтения».

### 3. Загрузочный `baseUrl`
При создании манифеста параметр `--base-url` обязан указывать на активный эндпоинт релиза:
`https://github.com/jorudr/JLJ/releases/download/release/`
*Зачем это нужно:* Запросы файлов `patch.zip` и `payload.zip` возвращают статус **HTTP 200 OK**, исключая ошибки 404 и сброс загрузки на 5%.

---

## 🚀 4. Пошаговая инструкция: Как выпустить новое обновление (например, 1.0.84)

Когда вы внесли правки в код и готовы опубликовать обновление:

### Шаг 1: Измените номер версии
Обновите версию с `1.0.83` на `1.0.84` в 4 файлах:
1. `package.json` ➔ `"version": "1.0.84"`
2. `package-lock.json` ➔ `"version": "1.0.84"` (в двух местах)
3. `src-tauri/tauri.conf.json` ➔ `"version": "1.0.84"`
4. `src/widgets/dashboard/ui/main/ExDashboard.vue` ➔ `appVersion` fallback `'1.0.84'`

Закомите правку:
```bash
git add package.json package-lock.json src-tauri/tauri.conf.json src/widgets/dashboard/ui/main/ExDashboard.vue
git commit -m "chore: bump version to 1.0.84"
git push origin release
git push cmd release
```

### Шаг 2: Соберите фронтенд
```bash
npm run build
```

### Шаг 3: Сгенерируйте манифест и файлы обновления
```bash
npm run payload:manifest -- \
  --channel release \
  --version 1.0.84 \
  --platform macos-universal \
  --dir .output/public \
  --base-url https://github.com/jorudr/JLJ/releases/download/release/ \
  --tauri-signer-key-path .secrets/hotfix/jlj-hotfix.key \
  --out dist/payload/1.0.84/payload-manifest.json
```

### Шаг 4: Опубликуйте файлы на GitHub Releases
Перейдите на GitHub в тег/релиз канала `release` и прикрепите созданные файлы из папки `dist/payload/1.0.84/`:
- `patch.zip` *(~1 МБ — дифференциальный патч)*
- `payload-manifest.json` *(основной манифест)*
- `payload-manifest.json.sig` *(подпись)*
- `payload-manifest.json.minisig` *(подпись Minisig)*
- `payload.zip` *(полный архив)*

---
*Документ создан для быстрого обращения и гарантии стабильности будущего процесса обновлений.*
