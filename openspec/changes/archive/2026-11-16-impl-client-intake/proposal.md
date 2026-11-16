# План реалізації зрізу 4: чернетка картки клієнта з тексту звернення

## Why

Специфікацію зрізу 4 (`openspec/specs/client-intake/spec.md`, AC-INTAKE-01…09) злито. Цей план описує, як її
реалізувати: AI-функцію, що складає чернетку форми нової картки, офлайн-реплей golden cases PM у CI, живий eval, прод
і UAT. Специфікацію план не змінює (`skip_specs: true`).

## What Changes

- `design.md` — рішення UI · Дані й RLS · Auth · AI з AC ID.
- `tasks.md` — вертикальні задачі «Done when: AC-…».
