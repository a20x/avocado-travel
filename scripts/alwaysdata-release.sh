#!/usr/bin/env bash
# Релизы сайта на alwaysdata. Выполняется на сервере: workflow .github/workflows/alwaysdata-deploy.yml
# передаёт файл по SSH (`ssh … bash -s -- <команда> … < scripts/alwaysdata-release.sh`).
#
# Каждая сборка распаковывается в свой каталог ~/apps/avocado/releases/<релиз>, а ссылка
# ~/apps/avocado/current указывает на работающий. Сайт в панели запускается из current/server.js,
# поэтому переключение версии — замена одной ссылки, а откат — возврат её на прошлый релиз.
# Устройство и первая настройка — docs/09-deploy.md.
#
# Команды:
#   unpack <релиз> <архив в домашнем каталоге>  распаковать сборку в новый каталог релиза
#   current                                     напечатать имя работающего релиза (пусто, если нет)
#   switch <релиз>                              направить current на релиз
#   prune                                       удалить старые релизы, оставив работающий и два прошлых
#   drop <релиз>                                удалить релиз (не работающий)
set -euo pipefail

APP_DIR="$HOME/apps/avocado"
RELEASES="$APP_DIR/releases"
CURRENT="$APP_DIR/current"
# Прошлых релизов для отката — кроме работающего.
KEEP_PREVIOUS=2

fail() {
  echo "alwaysdata-release: $*" >&2
  exit 1
}

# Имя релиза — «дата-время-коммит», например 20261104-153000-e06f6ef. Проверка не даёт
# передать путь вместо имени: имя попадает в rm -rf.
check_release() {
  [[ "$1" =~ ^[0-9]{8}-[0-9]{6}-[0-9a-f]{7}$ ]] || fail "неверное имя релиза: $1"
}

current_release() {
  if [ -L "$CURRENT" ]; then basename "$(readlink "$CURRENT")"; fi
}

case "${1:-}" in
  unpack)
    release="${2:-}"
    archive="${3:-}"
    check_release "$release"
    [[ "$archive" =~ ^avocado-[0-9a-f-]+\.tar\.gz$ ]] || fail "неверное имя архива: $archive"
    mkdir -p "$RELEASES"
    target="$RELEASES/$release"
    [ ! -e "$target" ] || fail "релиз уже есть: $release"
    mkdir "$target"
    tar -xzf "$HOME/$archive" -C "$target"
    rm -f "$HOME/$archive"
    [ -f "$target/server.js" ] || fail "в архиве нет server.js"
    ;;

  current)
    current_release
    ;;

  switch)
    release="${2:-}"
    check_release "$release"
    [ -f "$RELEASES/$release/server.js" ] || fail "нет релиза: $release"
    # Новая ссылка создаётся рядом и встаёт на место current одним переименованием:
    # сайт никогда не видит current отсутствующей.
    ln -sfn "releases/$release" "$APP_DIR/current.next"
    mv -T "$APP_DIR/current.next" "$CURRENT"
    ;;

  prune)
    working="$(current_release)"
    # Имена начинаются с даты, поэтому обратная сортировка — от новых к старым.
    find "$RELEASES" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort -r |
      tail -n +"$((KEEP_PREVIOUS + 2))" |
      while read -r release; do
        check_release "$release"
        [ "$release" = "$working" ] || rm -rf "${RELEASES:?}/$release"
      done
    ;;

  drop)
    release="${2:-}"
    check_release "$release"
    [ "$release" != "$(current_release)" ] || fail "нельзя удалить работающий релиз"
    rm -rf "${RELEASES:?}/$release"
    ;;

  *)
    fail "неизвестная команда: ${1:-}"
    ;;
esac
