# Guia de contribucion

## Flujo de trabajo

1. Actualizar `main`:
   ```bash
   git checkout main
   git pull origin main
   ```
2. Crear rama con prefijo valido desde `main`:
   ```bash
   git checkout -b feat/mi-funcionalidad
   ```
3. Commitear, pushear y abrir PR hacia `main`.
4. Esperar CI en verde y mergear.
5. El workflow de release versiona automaticamente segun el prefijo de la rama.

## Convencion de ramas

| Prefijo | Uso | Versionado |
|---------|-----|------------|
| `fix/` | Correccion de bugs | PATCH |
| `feat/` | Funcionalidades nuevas | MINOR |
| `refactor/` | Limpieza interna | PATCH |
| `test/` | Pruebas | PATCH |
| `docs/` | Documentacion | Sin bump |
| `chore/` | Mantenimiento | Sin bump |
| `style/` | Formato/estilo | Sin bump |
| `release/vX.Y.Z` | Version explicita | Version fija |

## Versionado

- Version inicial: `1.0.0`
- Version independiente de otros repositorios
- Tags en formato `vX.Y.Z`
- Releases publicados automaticamente en GitHub

## Ejemplos

```bash
git checkout -b fix/error-login
git checkout -b feat/filtro-busqueda
git checkout -b chore/actualizar-dependencias
git checkout -b release/v1.2.0
```
