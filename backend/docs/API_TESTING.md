# Тестирование API CookieLearn

## Swagger UI

Запустите backend и откройте в браузере:

```
http://localhost:8080/api/docs
```

## Получение JWT токена

1. Зарегистрируйтесь в Supabase Auth через Dashboard
2. Получите JWT токен через Supabase Client или API

### Через Supabase Dashboard

1. Откройте Authentication > Users
2. Создайте нового пользователя
3. Скопируйте JWT токен из Session

### Быстрое тестирование без токена

Для тестирования можно временно отключить middleware AuthMiddleware в main.go

## Примеры curl запросов

### Health Check

```bash
curl http://localhost:8080/health
```

### Получить профиль

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:8080/api/me
```

### Получить транзакции

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:8080/api/me/transactions
```

### Получить ежедневный бонус

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:8080/api/me/daily-bonus
```

### Получить лидерборд

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:8080/api/leaderboard
```

### Получить каталог сертификатов

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:8080/api/shop/certificates
```

### Купить сертификат

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:8080/api/shop/certificates/CERTIFICATE_ID/buy
```

### Купить случайный бонус

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"cost": 3}' \
  http://localhost:8080/api/shop/random-bonus/buy
```

### Получить купленные сертификаты

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:8080/api/me/certificates
```

## Тестовые данные

Не забудьте применить seed_data.sql для создания тестовых сертификатов в БД!

```sql
INSERT INTO certificates (title, description, base_price, current_price, inflation_step, total_quantity, remaining_quantity, validity_days, is_active)
VALUES
  ('Освобождение от экзамена', 'Полное освобождение от одного экзамена по выбору', 100, 100, 10, 3, 3, 30, true),
  ('Пересдача без штрафа', 'Одна бесплатная пересдача любого задания', 50, 50, 5, 10, 10, 60, true);
```

## Ожидаемые результаты

### Успешные ответы

- **200 OK** - запрос выполнен успешно
- **201 Created** - ресурс создан

### Ошибки

- **400 Bad Request** - неверные данные запроса
- **401 Unauthorized** - отсутствует или невалидный токен
- **403 Forbidden** - недостаточно прав
- **404 Not Found** - ресурс не найден
- **500 Internal Server Error** - ошибка сервера
