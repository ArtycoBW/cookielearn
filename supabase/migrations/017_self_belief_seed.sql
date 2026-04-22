DO $$
BEGIN
  IF to_regclass('public.self_belief_questions') IS NULL THEN
    RAISE EXCEPTION 'Run 016_self_belief_quiz.sql before 017_self_belief_seed.sql';
  END IF;
END $$;

INSERT INTO self_belief_questions (
  category,
  wager,
  prompt,
  options,
  correct_option,
  explanation,
  is_active
)
SELECT
  seed.category,
  seed.wager,
  seed.prompt,
  seed.options,
  seed.correct_option,
  seed.explanation,
  TRUE
FROM (
  VALUES
    (
      'HTML',
      1,
      'Какой тег обычно используют для основного содержимого страницы?',
      ARRAY['<main>', '<div>', '<section>', '<header>'],
      0,
      'Тег <main> обозначает главный контент документа и помогает семантике страницы.'
    ),
    (
      'CSS',
      1,
      'Какое CSS-свойство отвечает за цвет текста?',
      ARRAY['color', 'background', 'font-style', 'border-color'],
      0,
      'Свойство color меняет именно цвет текста, а не фона или рамки.'
    ),
    (
      'SQL',
      1,
      'Какая SQL-команда используется для получения данных из таблицы?',
      ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
      0,
      'SELECT используют, когда нужно прочитать строки из таблицы.'
    ),
    (
      'PHP',
      1,
      'С какого символа начинается имя переменной в PHP?',
      ARRAY['$', '#', '@', '&'],
      0,
      'В PHP переменные всегда начинаются со знака $.'
    ),
    (
      'Авторизация',
      1,
      'Почему нельзя передавать свой session token другим людям?',
      ARRAY[
        'Потому что токен даёт доступ к вашему аккаунту',
        'Потому что после этого сломается CSS',
        'Потому что браузер удалит куки',
        'Потому что база перестанет отвечать'
      ],
      0,
      'Токен сессии подтверждает, что запрос идёт от авторизованного пользователя.'
    ),
    (
      'HTML',
      3,
      'Какой атрибут у label связывает подпись с конкретным input?',
      ARRAY['id', 'for', 'name', 'value'],
      1,
      'Атрибут for у label должен ссылаться на id соответствующего поля.'
    ),
    (
      'CSS',
      3,
      'Какой селектор из списка имеет наибольшую специфичность?',
      ARRAY['.card .title', '#card .title', 'section article p', 'button:hover'],
      1,
      'Селектор с id имеет более высокий приоритет, чем классы и теги.'
    ),
    (
      'SQL',
      3,
      'Какой JOIN вернёт все строки из левой таблицы, даже если совпадения справа нет?',
      ARRAY['LEFT JOIN', 'INNER JOIN', 'CROSS JOIN', 'RIGHT JOIN'],
      0,
      'LEFT JOIN сохраняет все строки из левой таблицы и подставляет NULL справа, если совпадения не найдено.'
    ),
    (
      'PHP',
      3,
      'Какую функцию лучше использовать для хеширования пароля в PHP?',
      ARRAY['md5', 'sha1', 'password_hash', 'htmlspecialchars'],
      2,
      'password_hash создана именно для безопасного хранения паролей.'
    ),
    (
      'Авторизация',
      3,
      'Какой атрибут cookie помогает закрыть доступ к auth cookie из JavaScript?',
      ARRAY['Secure', 'SameSite', 'HttpOnly', 'Path'],
      2,
      'HttpOnly делает cookie недоступной для document.cookie и снижает риск кражи через XSS.'
    ),
    (
      'CSS',
      5,
      'Зачем часто задают box-sizing: border-box?',
      ARRAY[
        'Чтобы margin входил в width и height',
        'Чтобы padding и border входили в итоговую ширину и высоту',
        'Чтобы блок всегда был flex-контейнером',
        'Чтобы элемент игнорировал media queries'
      ],
      1,
      'С border-box ширина и высота включают padding и border, поэтому сетка ведёт себя предсказуемее.'
    ),
    (
      'SQL',
      5,
      'Почему LEFT JOIN легко превратить в INNER JOIN, если потом фильтровать правую таблицу в WHERE?',
      ARRAY[
        'Потому что WHERE автоматически сортирует строки',
        'Потому что фильтр отбрасывает строки с NULL из правой таблицы',
        'Потому что LEFT JOIN нельзя сочетать с WHERE',
        'Потому что база меняет тип JOIN случайно'
      ],
      1,
      'После LEFT JOIN у несовпавших строк справа стоят NULL, и условие в WHERE часто их вырезает.'
    ),
    (
      'PHP',
      5,
      'Как правильно проверять пароль, если в базе лежит hash из password_hash?',
      ARRAY['Сравнить строки через ===', 'Использовать password_verify', 'Закодировать пароль в base64', 'Проверить длину пароля'],
      1,
      'password_verify сравнивает введённый пароль с hash корректно и безопасно.'
    ),
    (
      'Авторизация',
      5,
      'Что обычно используют для защиты формы от CSRF-атаки?',
      ARRAY['CSRF token', 'localStorage', 'console.log', 'display: none'],
      0,
      'CSRF token позволяет убедиться, что форму отправил именно ваш интерфейс, а не чужой сайт.'
    )
) AS seed(category, wager, prompt, options, correct_option, explanation)
WHERE NOT EXISTS (
  SELECT 1
  FROM self_belief_questions existing
  WHERE existing.category = seed.category
    AND existing.wager = seed.wager
    AND existing.prompt = seed.prompt
);
