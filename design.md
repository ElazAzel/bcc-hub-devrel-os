# BCC HUB — Design Language Reference

> Design reference для внутренних продуктов и интерфейсов, визуально совместимых с `bcchub.kz`.
>
> Основа анализа: публичные страницы `https://bcchub.kz/ru` и `https://bcchub.kz/ru/about`, а также доступные визуальные ассеты сайта.
>
> **Важно:** значения цветов, размеров, радиусов и шрифтов ниже частично являются восстановленными/рекомендованными токенами. Они отражают визуальный язык сайта, но не претендуют на точное копирование production CSS. Точное название используемого font-family из доступной разметки надежно не определяется.

---

## 1. Дизайн-направление

BCC HUB визуально сочетает два образа:

1. **технологическая B2B-платформа**
   - чистая архитектура;
   - системность;
   - модульность;
   - большие продуктовые блоки;
   - минимум визуального шума;

2. **современный tech/employer brand**
   - яркий фиолетовый;
   - крупная фотография;
   - контрастный свет;
   - цифровые/ASCII-элементы;
   - объемные 3D-объекты;
   - более дерзкая визуальная подача, чем у классического банковского сайта.

Главный характер:

> **clean fintech + expressive tech culture**

Интерфейс не должен ощущаться как классический интернет-банк, бухгалтерская система или тяжелый enterprise dashboard.

---

# 2. Главные визуальные принципы

## 2.1. Светлая база

Основная поверхность — белая или очень светлая.

Темные элементы используются преимущественно для:

- текста;
- контраста;
- отдельных CTA;
- визуальных акцентов.

Фиолетовый работает как главный брендовый цвет, а не как постоянный фон всего интерфейса.

---

## 2.2. Большие цветовые акценты

Фиолетовый появляется крупными пятнами:

- hero-графика;
- изображения;
- 3D-сцены;
- яркие UI-фрагменты;
- отдельные CTA;
- активные состояния;
- выделенные данные.

Не окрашивать весь интерфейс в фиолетовый.

---

## 2.3. Мягкая геометрия

Ключевой паттерн:

- крупные скругленные контейнеры;
- изображения с большим радиусом;
- pill-компоненты;
- мягкие карточки;
- отсутствие агрессивных острых углов.

Форма должна ощущаться технологичной, но дружелюбной.

---

## 2.4. Модульность

Сайт часто рассказывает о сложных вещах через простые модули:

- карточка;
- визуал;
- короткий заголовок;
- пояснение;
- 2–4 тезиса;
- CTA.

Для внутренних продуктов сохранять тот же принцип:

> одна поверхность = одна понятная функция.

---

# 3. Цветовая система

Цвета ниже восстановлены по визуальным ассетам сайта.

## Core

```css
:root {
  --bcc-bg: #FFFFFF;
  --bcc-ink: #1D1D1D;
  --bcc-black: #000000;

  --bcc-violet: #8934F9;
  --bcc-violet-deep: #4C04A5;

  --bcc-lilac: #DEC4FF;
  --bcc-cyan: #B6F3F5;

  --bcc-neutral-100: #F4F5F8;
  --bcc-neutral-200: #E8E7EC;
  --bcc-neutral-500: #8A8A90;
}
```

## Дополнительный visual range

```css
--bcc-purple-300: #B781E3;
--bcc-purple-400: #A561E3;
--bcc-purple-600: #7E08DF;
--bcc-purple-900: #40077F;

--bcc-soft-pink: #F4E3ED;
```

### Использование

| Роль | Цвет |
|---|---|
| Основной текст | `#1D1D1D` |
| Основной фон | `#FFFFFF` |
| Главный акцент | `#8934F9` |
| Сильный акцент / active | `#4C04A5` |
| Мягкая акцентная поверхность | `#DEC4FF` |
| Контрастный secondary accent | `#B6F3F5` |
| Divider / muted surface | `#E8E7EC` |

---

# 4. Градиенты

В графике BCC HUB фиолетовый редко ощущается плоским.

Рекомендуемый диапазон:

```css
background:
  linear-gradient(
    135deg,
    #4C04A5 0%,
    #7E08DF 35%,
    #8934F9 65%,
    #DEC4FF 100%
  );
```

Для крупных иллюстративных поверхностей допустимы:

- glow;
- мягкое размытие;
- световые переходы;
- объем;
- тонкая зернистость.

Для рабочих таблиц и баз данных градиенты **не использовать**.

---

# 5. Типографика

## Наблюдаемый характер

Типографика:

- нейтральная;
- grotesk / neo-grotesk;
- современная;
- без декоративности;
- крупные заголовки;
- плотная визуальная иерархия;
- хороший контраст заголовка и основного текста.

Точный production font-family не подтвержден.

### Безопасный implementation fallback

```css
font-family:
  Inter,
  Arial,
  Helvetica,
  system-ui,
  sans-serif;
```

Если будет доступен официальный брендовый шрифт BCC HUB, он должен заменить fallback.

---

## Размерная шкала

```css
--text-xs: 12px;
--text-sm: 14px;
--text-base: 16px;
--text-lg: 18px;

--heading-sm: 24px;
--heading-md: 32px;
--heading-lg: 48px;
--heading-xl: clamp(52px, 6vw, 84px);
```

### Headline

```css
font-weight: 500-700;
letter-spacing: -0.02em;
line-height: 0.98-1.08;
```

### Body

```css
font-weight: 400;
line-height: 1.45-1.6;
```

### Labels / eyebrow

```css
font-size: 14px;
font-weight: 500;
line-height: 1.2;
```

---

# 6. Контентная иерархия

Один из самых заметных паттернов BCC HUB:

```text
Section label

Большой смысловой заголовок

Короткое объяснение

Визуальный / функциональный блок
```

Например концептуально:

```text
Как мы работаем
Связываем технологии в единый процесс
[visual modules]
```

или:

```text
Культура
Среда, где можно влиять на результат и расти
[image + principles]
```

Не начинать секции сразу с огромной таблицы.

Сначала дать человеку понять:

1. что он смотрит;
2. зачем это важно;
3. что здесь можно сделать.

---

# 7. Grid

## Desktop

Рекомендуемая структура:

```css
max-width: 1440px;
padding-inline: 32-64px;
```

12-column grid.

Большие смысловые секции:

- 6/6;
- 7/5;
- 8/4;
- full-width.

## Internal product

Для DevRel/Operations-интерфейса:

```text
sidebar: 240–280px
main content: fluid
right context panel: 320–400px optional
```

Основной контент не должен быть зажат.

---

# 8. Spacing

Использовать заметный vertical rhythm.

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 24px;
--space-6: 32px;
--space-7: 48px;
--space-8: 64px;
--space-9: 96px;
--space-10: 128px;
```

### Правило

Маркетинговые страницы:
- много воздуха;
- секции 96–160 px.

Рабочий интерфейс:
- значительно плотнее;
- блоки 16–32 px;
- без превращения dashboard в лендинг.

---

# 9. Radius

Скругления — одна из сильнейших визуальных характеристик.

```css
--radius-sm: 10px;
--radius-md: 16px;
--radius-lg: 24px;
--radius-xl: 32px;
--radius-2xl: 40px;
--radius-pill: 999px;
```

### Использование

- input: `12–16px`
- button: `12–16px` или pill
- card: `20–32px`
- hero/media card: `32–48px`
- badge/chip: pill

Не использовать один radius буквально для всего.

---

# 10. Borders

BCC HUB лучше работает с мягкими границами, чем с тяжелыми рамками.

```css
border: 1px solid #E8E7EC;
```

Акцент:

```css
border-color: rgba(137, 52, 249, 0.3);
```

Hover:

```css
border-color: rgba(137, 52, 249, 0.55);
```

Избегать:

- темных рамок вокруг каждой карточки;
- двойных границ;
- чрезмерного количества separators.

---

# 11. Shadows

Тени не должны быть главным способом разделения интерфейса.

```css
--shadow-soft:
  0 8px 30px rgba(0, 0, 0, 0.06);

--shadow-floating:
  0 16px 50px rgba(50, 15, 90, 0.10);
```

Большинство карточек могут жить:

- без shadow;
- только с border;
- либо на контрастной поверхности.

---

# 12. Buttons

## Primary

```css
background: #1D1D1D;
color: #FFFFFF;
border-radius: 999px;
```

или в более брендовой функции:

```css
background: #8934F9;
color: #FFFFFF;
```

## Secondary

```css
background: transparent;
border: 1px solid #D8D8DC;
color: #1D1D1D;
```

## Ghost

```css
background: transparent;
color: #1D1D1D;
```

## Active / AI / special action

```css
background: #8934F9;
color: #FFFFFF;
```

### Размер

```css
height: 44-52px;
padding-inline: 20-28px;
```

Рабочие интерфейсы могут использовать compact buttons 32–40px.

---

# 13. Pills / Chips

Pills соответствуют визуальному языку бренда.

Использовать для:

- статусов;
- тегов;
- фильтров;
- направлений;
- KPI;
- групп пользователей.

Пример:

```css
.chip {
  min-height: 32px;
  padding: 6px 12px;
  border-radius: 999px;
  background: #F4F5F8;
}
```

Active:

```css
background: #DEC4FF;
color: #4C04A5;
```

---

# 14. Cards

Карточки — основной строительный блок.

## Standard card

```text
label / icon
title
description
metadata
actions
```

## Media card

```text
[large rounded image]
title
short description
CTA
```

## Metric card

```text
large number
short label
optional delta
```

## Product card

Наблюдаемый паттерн сайта:

```text
visual
product title
1 sentence value proposition
divider
3 key capabilities
CTA
```

---

# 15. Изображения

BCC HUB использует изображения как самостоятельную часть идентичности.

## 15.1. Purple monochrome portrait

Характер:

- сильный фиолетовый tint;
- темные глубокие shadows;
- высокий contrast;
- digital/ASCII overlay;
- фигура не обязательно смотрит в камеру;
- ощущение tech editorial.

Для culture / people / employer brand.

---

## 15.2. 3D product illustrations

Характер:

- soft 3D;
- rounded geometry;
- физические метафоры цифровых процессов;
- кубы;
- конвейеры;
- модули;
- объемные иконки;
- studio lighting;
- purple/lilac environment.

Иллюстрация должна объяснять идею продукта, а не быть случайной декорацией.

---

## 15.3. Product UI visualization

Для продуктовых возможностей используются:

- крупные UI-фрагменты;
- white cards;
- purple labels;
- cyan backgrounds;
- сильно округленные контейнеры.

---

# 16. Iconography

Наблюдаемый язык:

- outline icons;
- простые символы;
- одинаковая визуальная масса;
- rounded line endings;
- минимум деталей.

Для собственного интерфейса:

- Lucide;
- Phosphor;
- собственный outline icon set.

Не смешивать 3–4 разных библиотеки.

Рекомендуемый stroke:

```css
1.5–2px
```

---

# 17. ASCII / digital texture

В визуалах BCC HUB встречается характерный цифровой слой из символов.

Использовать очень ограниченно:

- hero;
- event artwork;
- profile hero;
- AI / engineering visual;
- empty state для специальных разделов.

Не использовать:

- поверх таблиц;
- в task list;
- возле каждого заголовка;
- как постоянный background pattern.

Это фирменный акцент, а не обои.

---

# 18. Секции и композиционные паттерны

## Pattern A — Hero

```text
[large headline]
[short supporting text]
[primary CTA] [secondary CTA]

[optional stats]
```

Hero должен быстро объяснять продукт.

---

## Pattern B — Metrics strip

На главной используются крупные числовые показатели.

Применение:

```text
850+
специалистов

10+
лет опыта

80+
проектов
```

Для внутреннего продукта аналог:

```text
14
active projects

8
upcoming deadlines

10
ambassadors

78%
portfolio health
```

Большая цифра + очень короткая подпись.

---

## Pattern C — Split explanation

```text
[What / How]
[Result / Value]
```

Хорош для:

- стратегии;
- проекта;
- KPI;
- процессов;
- ретроспектив.

---

## Pattern D — Process

Сайт постоянно объясняет работу через последовательность.

```text
01
Title
Description

02
Title
Description

03
...
```

Для DevRel OS использовать для:

- event lifecycle;
- ambassador onboarding;
- content approval;
- project stages;
- hiring/speaker workflow.

---

## Pattern E — Visual carousel

В разметке сайта видны счетчики вида:

```text
1 / 3
1 / 2
```

Это указывает на использование последовательных media/product блоков и адаптивной carousel-логики.

Для мобильной версии:
- 1 основной card;
- horizontal swipe;
- progress/count.

Для desktop:
- несколько элементов одновременно либо большой split-layout.

---

## Pattern F — CTA section

Структура:

```text
Short emotional/business headline
Action
```

Не делать CTA огромным маркетинговым баннером внутри рабочего интерфейса.

Для внутренней системы CTA превращается в:

```text
Нет следующего действия
[Добавить next action]
```

---

# 19. Data visualization

Продуктовые изображения BCC HUB используют:

- donut chart;
- небольшое количество сегментов;
- фиолетовый как главный data accent;
- cyan как secondary;
- серый для нейтральных сегментов.

Для analytics:

```css
--chart-primary: #8934F9;
--chart-primary-dark: #4C04A5;
--chart-secondary: #B6F3F5;
--chart-soft: #DEC4FF;
--chart-neutral: #E8E7EC;
--chart-ink: #1D1D1D;
```

Не делать rainbow dashboard.

---

# 20. Таблицы

Публичный сайт почти не строит идентичность вокруг таблиц, поэтому для internal tools таблицы нужно адаптировать аккуратно.

## Table style

- белая поверхность;
- минимальные линии;
- sticky header;
- 44–52 px row height;
- muted metadata;
- color chips вместо цветных строк;
- inline actions на hover;
- сортировка и фильтры рядом с заголовком.

Не использовать:

- темную заливку шапки;
- сильную сетку;
- zebra striping по умолчанию.

---

# 21. Forms

Форма должна быть простой и спокойной.

```css
input {
  min-height: 44px;
  border: 1px solid #E8E7EC;
  border-radius: 14px;
  background: #FFFFFF;
}
```

Focus:

```css
border-color: #8934F9;
box-shadow: 0 0 0 3px rgba(137, 52, 249, .12);
```

Ошибки:
- красный использовать только функционально;
- не заменять им основной брендовый визуальный язык.

---

# 22. Status system для внутреннего продукта

Фирменный purple нельзя использовать для всех статусов.

Рекомендуется:

```text
Purple    = active / strategic / selected
Cyan      = information / healthy
Green     = completed
Amber     = attention
Red       = blocked / critical
Gray      = inactive / archived
```

Главное правило:

> цвет должен передавать функцию, а не просто украшать карточку.

---

# 23. Motion

Характер движения должен быть:

- плавным;
- коротким;
- функциональным.

```css
--motion-fast: 120ms;
--motion-base: 180ms;
--motion-slow: 280ms;
```

Easing:

```css
cubic-bezier(.2, .8, .2, 1);
```

Использовать:

- card hover;
- tab indicator;
- drawer;
- quick add;
- carousel;
- progress;
- number update.

Не использовать:
- bouncing;
- постоянное движение background;
- чрезмерные parallax effects внутри рабочего приложения.

---

# 24. Navigation

Для корпоративного сайта навигация короткая и верхнеуровневая.

Для рабочего продукта этот принцип переводится в:

```text
Dashboard
Projects
Tasks
Contacts
Events
Content
Ambassadors
Knowledge
Analytics
```

Не делать 20 пунктов первого уровня.

Второстепенные функции:
- Settings;
- Templates;
- Documents;
- Archive;

перенести в secondary navigation.

---

# 25. Dashboard pattern

Dashboard в стиле BCC HUB должен выглядеть не как BI-панель 2014 года, а как рабочее пространство.

Рекомендуемая структура:

```text
Good afternoon / Current focus

[4 compact KPI]

Needs attention
[task/project issues]

Portfolio
[projects]

Upcoming
[calendar / events]

People
[recent interactions]

Ambassadors / Content
[compact analytics]
```

Главный экран отвечает:

> Что требует моего внимания сейчас?

а не:

> Сколько графиков мы смогли поместить на экран?

---

# 26. Search / Command Palette

Для внутреннего продукта добавить глобальный command/search layer.

Visual:

```text
rounded dialog
white surface
soft border
large search field
keyboard shortcut hints
purple active row
```

Поиск должен быть центральной частью продукта, потому что система строится вокруг связей между сущностями.

---

# 27. Empty states

Не использовать банальные иллюстрации людей с ноутбуками.

Варианты в духе BCC HUB:

- простая line icon;
- модульный 3D-object;
- небольшой ASCII fragment;
- короткое объяснение;
- одна primary action.

Пример:

```text
Здесь пока нет взаимодействий

Фиксируй встречи и переписки,
чтобы история контакта не терялась.

[Добавить взаимодействие]
```

---

# 28. Tone of interface copy

Копирайтинг на сайте:

- прямой;
- короткий;
- ориентированный на результат;
- без тяжелого корпоративного языка;
- допускает профессиональные английские термины там, где они естественны.

Для продукта:

**Да**
- Следующий шаг
- Нужен ответ
- Проект под риском
- Нет активности 14 дней
- Связать с проектом
- Создать задачу
- Добавить взаимодействие

**Нет**
- Произвести инициацию процесса
- Осуществить переход
- Выполнить добавление сущности
- Информационно-коммуникационная активность

---

# 29. Responsive behavior

На основе структуры страниц можно использовать следующую модель.

## Desktop

- большие split-layout;
- несколько cards в строке;
- медиа рядом с текстом;
- горизонтальные product blocks.

## Tablet

- 2 columns;
- уменьшенные section gaps;
- карточки сохраняют крупный radius.

## Mobile

- single column;
- horizontal card carousel;
- счетчик `1 / N`;
- buttons full-width только когда необходимо;
- KPI в 2 columns;
- sticky action bar для частых операций.

---

# 30. Accessibility

Даже при ярком визуальном стиле:

- основной текст должен иметь высокий contrast;
- purple-on-lilac проверять;
- cyan не использовать как цвет текста на white;
- focus states обязательны;
- интерактивные элементы не кодировать только цветом;
- hit area не менее ~40–44 px;
- motion должен учитывать `prefers-reduced-motion`.

---

# 31. Что нельзя делать

## Не превращать BCC HUB style в:

### ❌ Purple everywhere
Фиолетовый — акцент, а не постоянная заливка интерфейса.

### ❌ Glassmorphism overload
Сайт воспринимается чистым и материальным, а не стеклянным.

### ❌ Crypto/Web3 aesthetic
Несмотря на фиолетовый, стиль BCC HUB — fintech/product/engineering, не NFT.

### ❌ Generic bank UI
Не использовать темно-синий корпоративный dashboard с бесконечными таблицами.

### ❌ Excessive gradients
Градиенты — для иллюстраций и hero, не для каждого badge.

### ❌ Random 3D
Каждый 3D-объект должен быть смысловой метафорой.

### ❌ Excessive cards
Не помещать каждый label внутрь отдельной карточки.

---

# 32. Правило адаптации для DevRel OS

При создании внутреннего DevRel-продукта сохраняем:

- брендовые цвета;
- мягкую геометрию;
- typography hierarchy;
- крупные meaningful numbers;
- чистые поверхности;
- purple/cyan accents;
- line iconography;
- сильные visual states;
- модульную композицию.

Но повышаем плотность интерфейса примерно в 1.5–2 раза относительно маркетингового сайта.

То есть:

```text
BCC HUB website
        ↓
same visual DNA
        ↓
Linear / Attio-like information density
        ↓
DevRel OS
```

---

# 33. Suggested CSS tokens

```css
:root {
  /* colors */
  --background: #FFFFFF;
  --foreground: #1D1D1D;

  --primary: #8934F9;
  --primary-foreground: #FFFFFF;

  --primary-deep: #4C04A5;
  --secondary: #B6F3F5;
  --accent-soft: #DEC4FF;

  --muted: #F4F5F8;
  --muted-foreground: #74747C;

  --border: #E8E7EC;
  --input: #E8E7EC;

  /* radius */
  --radius-xs: 8px;
  --radius-sm: 12px;
  --radius-md: 16px;
  --radius-lg: 24px;
  --radius-xl: 32px;

  /* shadows */
  --shadow-soft: 0 8px 30px rgba(0, 0, 0, 0.06);
  --shadow-popover: 0 18px 55px rgba(38, 11, 62, 0.12);

  /* typography */
  --font-sans: Inter, Arial, Helvetica, system-ui, sans-serif;
}
```

---

# 34. Tailwind mapping

```ts
colors: {
  bcc: {
    violet: "#8934F9",
    deep: "#4C04A5",
    lilac: "#DEC4FF",
    cyan: "#B6F3F5",
    ink: "#1D1D1D",
    border: "#E8E7EC",
    soft: "#F4F5F8",
  }
}
```

---

# 35. Component priority

При создании интерфейса сначала определить:

1. App Shell
2. Sidebar
3. Topbar
4. Command Palette
5. Page Header
6. KPI
7. Cards
8. Data Table
9. Board Card
10. Timeline
11. Contact Card
12. Project Card
13. Status Chip
14. Tabs
15. Drawer
16. Dialog
17. Forms
18. Empty State
19. Charts
20. Activity Feed

Каждый компонент должен использовать одни и те же tokens.

---

# 36. Visual QA checklist

Перед приемкой экрана проверить:

- [ ] Есть четкая визуальная иерархия?
- [ ] Главный action понятен за 3 секунды?
- [ ] Purple используется как акцент, а не шум?
- [ ] Карточек не стало больше, чем информации?
- [ ] Скругления согласованы?
- [ ] Визуал выглядит современно, но не как crypto landing?
- [ ] Таблицы достаточно плотные?
- [ ] Secondary text действительно secondary?
- [ ] Есть hover/focus/active states?
- [ ] Интерфейс остается понятным без цветовых подсказок?
- [ ] Mobile не является просто сжатым desktop?
- [ ] Визуальные эффекты не мешают работе?
- [ ] Экран ощущается частью одной системы с другими экранами?

---

# 37. Краткая формула BCC HUB UI

```text
WHITE SPACE
+ BLACK TYPOGRAPHY
+ PURPLE ENERGY
+ CYAN/LILAC SUPPORT
+ LARGE SOFT RADIUS
+ MODULAR PRODUCT THINKING
+ EDITORIAL TECH VISUALS
+ MINIMAL BUREAUCRATIC NOISE
```

---

# 38. Reference summary

Исходные страницы:

- `https://bcchub.kz/ru`
- `https://bcchub.kz/ru/about`

Дополнительно для анализа визуального языка использованы публичные изображения продуктов и culture-assets, загружаемые самим сайтом BCC HUB.

Главные наблюдаемые мотивы:

- purple-led visual identity;
- white/black neutral interface;
- cyan/lilac secondary palette;
- rounded media containers;
- product storytelling through modules;
- big-number stats;
- sequential process sections;
- responsive carousel patterns;
- purple monochrome people photography;
- ASCII/digital overlays;
- soft 3D product metaphors;
- outline iconography.
