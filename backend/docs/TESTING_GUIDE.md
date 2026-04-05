# Руководство по тестированию API

## Шаг 1: Применить миграции в Supabase

1. Откройте https://supabase.com/dashboard
2. Перейдите в SQL Editor
3. Скопируйте содержимое `supabase/migrations/full_migration.sql`
4. Выполните запрос
5. Примените тестовые данные из `supabase/migrations/seed_data.sql`

## Шаг 2: Создать тестового пользователя

### Через Supabase Dashboard

1. Откройте Authentication > Users
2. Нажмите "Add user" > "Create new user"
3. Email: `student@test.com`
4. Password: `password123`
5. User Metadata (JSON):
```json
{
  "full_name": "Тестовый Студент",
  "role": "student"
}
```
6. Нажмите "Create user"

### Создать админа

1. Email: `admin@test.com`
2. Password: `password123`
3. User Metadata:
```json
{
  "full_name": "Администратор",
  "role": "admin"
}
```

## Шаг 3: Получить JWT токен

### Вариант 1: Через Supabase Client (рекомендуется)

Создайте файл `test_auth.html`:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Get JWT Token</title>
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
</head>
<body>
    <h1>CookieLearn - Get JWT Token</h1>
    <input id="email" placeholder="Email" value="student@test.com">
    <input id="password" type="password" placeholder="Password" value="password123">
    <button onclick="login()">Login</button>
    <pre id="result"></pre>
    
    <script>
        const supabase = window.supabase.createClient(
            'https://rapcrtkmgfmzdzefnsaq.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhcGNydGttZ2ZtemR6ZWZuc2FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMzU0OTksImV4cCI6MjA4NzgxMTQ5OX0.R7mfW29Ld7xeLy_qEZwgb8fzbTrke_q67Fo3v2S3L0M'
        );

        async function login() {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            
            if (error) {
                document.getElementById('result').textContent = 'Error: ' + error.message;
            } else {
                const token = data.session.access_token;
                document.getElementById('result').textContent = 
                    'JWT Token (copy this):\n\n' + token + 
                    '\n\nUser ID: ' + data.user.id;
            }
        }
    </script>
</body>
</html>
```

Откройте файл в браузере и нажмите Login.

### Вариант 2: Через curl

```bash
curl -X POST 'https://rapcrtkmgfmzdzefnsaq.supabase.co/auth/v1/token?grant_type=password' \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJhcGNydGttZ2ZtemR6ZWZuc2FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMzU0OTksImV4cCI6MjA4NzgxMTQ5OX0.R7mfW29Ld7xeLy_qEZwgb8fzbTrke_q67Fo3v2S3L0M" \
  -H "Content-Type: application/json" \
  -d '{"email":"student@test.com","password":"password123"}'
```

Скопируйте `access_token` из ответа.

## Шаг 4: Запустить backend

```bash
cd backend
go mod tidy
go run ./cmd/server
```

Должно появиться:
```
🍪 CookieLearn Backend starting on :8080
📚 API Documentation: http://localhost:8080/api/docs
```

## Шаг 5: Открыть Swagger UI

Откройте в браузере:
```
http://localhost:8080/api/docs
```

## Шаг 6: Авторизоваться в Swagger

1. Нажмите кнопку "Authorize" в правом верхнем углу
2. Вставьте JWT токен в поле "Value" (без слова "Bearer")
3. Нажмите "Authorize"
4. Нажмите "Close"

## Шаг 7: Тестировать endpoints

### 1. Health Check

- Endpoint: `GET /health`
- Нажмите "Try it out" > "Execute"
- Ожидаемый результат:
```json
{
  "status": "ok",
  "service": "cookielearn-backend"
}
```

### 2. Get Profile

- Endpoint: `GET /api/me`
- Execute
- Ожидаемый результат: профиль пользователя с балансом

### 3. Claim Daily Bonus

- Endpoint: `POST /api/me/daily-bonus`
- Execute
- Ожидаемый результат:
```json
{
  "success": true,
  "bonus": {...},
  "message": "Вы получили 1 печеньку!"
}
```

При повторном вызове получите ошибку:
```json
{
  "error": "вы уже получили бонус сегодня"
}
```

### 4. Get Leaderboard

- Endpoint: `GET /api/leaderboard`
- Execute
- Ожидаемый результат: массив пользователей с балансами

### 5. Get Certificates

- Endpoint: `GET /api/shop/certificates`
- Execute
- Ожидаемый результат: массив доступных сертификатов

### 6. Buy Certificate

- Endpoint: `POST /api/shop/certificates/{id}/buy`
- Скопируйте `id` сертификата из предыдущего запроса
- Вставьте в поле `id`
- Execute
- Ожидаемый результат: информация о покупке

### 7. Get My Certificates

- Endpoint: `GET /api/me/certificates`
- Execute
- Ожидаемый результат: массив купленных сертификатов

### 8. Get Transactions

- Endpoint: `GET /api/me/transactions`
- Execute
- Ожидаемый результат: история всех транзакций

## Проверка работы триггеров БД

После каждой операции проверяйте:

1. **После daily bonus**: баланс должен увеличиться на 1
2. **После покупки сертификата**: 
   - Баланс уменьшается на цену
   - Цена сертификата увеличивается (инфляция)
   - Остаток количества уменьшается
3. **После random bonus**: баланс изменяется согласно формуле (reward - cost)

## Альтернативное тестирование

### Через Postman

1. Импортируйте `docs/CookieLearn.postman_collection.json`
2. Установите переменную `token` в своё значение
3. Запускайте запросы

### Через VS Code REST Client

1. Установите расширение "REST Client"
2. Откройте `docs/test.http`
3. Замените `YOUR_JWT_TOKEN_HERE` на ваш токен
4. Нажмите "Send Request" над каждым запросом

## Ожидаемые ошибки

### 401 Unauthorized
- Проверьте токен
- Токен мог истечь (создайте новый)
- Проверьте SUPABASE_JWT_SECRET в .env

### 400 Bad Request при покупке
- Недостаточно печенек на балансе
- Сертификат закончился
- Неверный ID сертификата

### 500 Internal Server Error
- Проверьте подключение к БД
- Посмотрите логи backend в консоли

## Успешное тестирование

Если все endpoints работают корректно, вы увидите:
- ✅ Профиль загружается
- ✅ Ежедневный бонус начисляется
- ✅ Баланс обновляется автоматически
- ✅ Сертификаты покупаются
- ✅ Цены растут после покупок
- ✅ История транзакций отображается
- ✅ Лидерборд показывает рейтинги
