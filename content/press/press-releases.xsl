<?xml version="1.0" encoding="UTF-8"?>
<!--
  Преобразование XML-файла пресс-релизов в HTML-страницу (лаба 2): поиск по всем полям,
  выборка по категории и автору, сортировка по любой колонке. Параметры передаёт сервер
  (адрес /xml/transform?q=…&category=…&author=…&sort=…&order=…); если браузер сам применит
  файл к press-releases.xml, параметры пустые — показываются все записи, новые сверху.
-->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>

  <xsl:param name="q" select="''"/>
  <xsl:param name="category" select="''"/>
  <xsl:param name="author" select="''"/>
  <xsl:param name="sort" select="'date'"/>
  <xsl:param name="order" select="'descending'"/>

  <!-- Поиск без учёта регистра; «ё» ищется как «е». -->
  <xsl:variable name="upper" select="'ABCDEFGHIJKLMNOPQRSTUVWXYZАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯё'"/>
  <xsl:variable name="lower" select="'abcdefghijklmnopqrstuvwxyzабвгдеежзийклмнопрстуфхцчшщъыьэюяе'"/>
  <xsl:variable name="needle" select="translate(normalize-space($q), $upper, $lower)"/>

  <!-- Выборка: категория, автор и набор символов в любом поле (с подписью категории и датой). -->
  <xsl:variable name="items" select="/pressReleases/release[
      ($category = '' or category = $category)
      and ($author = '' or author = $author)
      and contains(translate(concat(@id, ' ', title, ' ', date, ' ',
          substring(date, 9, 2), '.', substring(date, 6, 2), '.', substring(date, 1, 4), ' ',
          category, ' ',
          substring('Новые направления', 1, 100 * (category = 'routes')),
          substring('Сервис', 1, 100 * (category = 'service')),
          substring('Партнёры', 1, 100 * (category = 'partners')),
          substring('Итоги и цифры', 1, 100 * (category = 'results')),
          substring('О компании', 1, 100 * (category = 'company')), ' ',
          author, ' ', summary, ' ', body), $upper, $lower), $needle)]"/>

  <xsl:template name="category-label">
    <xsl:param name="code"/>
    <xsl:choose>
      <xsl:when test="$code = 'routes'">Новые направления</xsl:when>
      <xsl:when test="$code = 'service'">Сервис</xsl:when>
      <xsl:when test="$code = 'partners'">Партнёры</xsl:when>
      <xsl:when test="$code = 'results'">Итоги и цифры</xsl:when>
      <xsl:when test="$code = 'company'">О компании</xsl:when>
      <xsl:otherwise><xsl:value-of select="$code"/></xsl:otherwise>
    </xsl:choose>
  </xsl:template>

  <xsl:template name="option">
    <xsl:param name="value"/>
    <xsl:param name="label" select="$value"/>
    <xsl:param name="selected"/>
    <option value="{$value}">
      <xsl:if test="$value = $selected"><xsl:attribute name="selected">selected</xsl:attribute></xsl:if>
      <xsl:value-of select="$label"/>
    </option>
  </xsl:template>

  <!-- Строка таблицы для текущей записи. -->
  <xsl:template name="row">
    <tr>
      <td class="nowrap"><xsl:value-of select="@id"/></td>
      <td><xsl:value-of select="title"/></td>
      <td class="nowrap">
        <xsl:value-of select="concat(substring(date, 9, 2), '.', substring(date, 6, 2), '.', substring(date, 1, 4))"/>
      </td>
      <td>
        <xsl:call-template name="category-label"><xsl:with-param name="code" select="category"/></xsl:call-template>
      </td>
      <td><xsl:value-of select="author"/></td>
      <td><xsl:value-of select="summary"/></td>
      <td>
        <xsl:value-of select="substring(normalize-space(body), 1, 160)"/>
        <xsl:if test="string-length(normalize-space(body)) &gt; 160">…</xsl:if>
      </td>
    </tr>
  </xsl:template>

  <xsl:template match="/">
    <html lang="ru">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <title>Пресс-релизы — результат XSL-преобразования</title>
        <style>
          body { margin: 0; padding: 24px 16px; font: 16px/1.5 system-ui, sans-serif; color: #2b2f33; background: #f4f5f0; }
          main { max-width: 1200px; margin: 0 auto; display: grid; gap: 16px; }
          h1 { margin: 0; font-size: 28px; }
          p { margin: 0; }
          a { color: #3d6b1f; }
          form { display: flex; flex-wrap: wrap; gap: 12px; align-items: end; padding: 16px; background: #fff; border-radius: 12px; }
          label { display: grid; gap: 4px; font-size: 14px; color: #5b636b; }
          input, select, button { font: inherit; padding: 6px 10px; border: 1px solid #c9cfc3; border-radius: 8px; }
          button { background: #3d6b1f; color: #fff; border-color: #3d6b1f; cursor: pointer; }
          .table { overflow-x: auto; background: #fff; border-radius: 12px; }
          table { border-collapse: collapse; width: 100%; }
          caption { text-align: left; padding: 12px 16px; font-weight: 600; }
          th, td { padding: 10px 16px; text-align: left; vertical-align: top; border-top: 1px solid #e3e6df; }
          th { background: #eef1ea; font-size: 14px; white-space: nowrap; }
          td.nowrap { white-space: nowrap; }
        </style>
      </head>
      <body>
        <main>
          <h1>Пресс-релизы Avocado Travel</h1>
          <p>
            Страница собрана XSL-преобразованием файла
            <a href="/xml/press-releases.xml">press-releases.xml</a>
            (<a href="/xml/press-releases.xsl">press-releases.xsl</a>). Таблица на сайте —
            <a href="/xml">вкладка «XML»</a>.
          </p>

          <form action="/xml/transform" method="get">
            <label>Поиск по всем полям
              <input type="search" name="q" value="{$q}" maxlength="100"/>
            </label>
            <label>Категория
              <select name="category">
                <option value="">Все категории</option>
                <xsl:call-template name="option"><xsl:with-param name="value" select="'routes'"/><xsl:with-param name="label" select="'Новые направления'"/><xsl:with-param name="selected" select="$category"/></xsl:call-template>
                <xsl:call-template name="option"><xsl:with-param name="value" select="'service'"/><xsl:with-param name="label" select="'Сервис'"/><xsl:with-param name="selected" select="$category"/></xsl:call-template>
                <xsl:call-template name="option"><xsl:with-param name="value" select="'partners'"/><xsl:with-param name="label" select="'Партнёры'"/><xsl:with-param name="selected" select="$category"/></xsl:call-template>
                <xsl:call-template name="option"><xsl:with-param name="value" select="'results'"/><xsl:with-param name="label" select="'Итоги и цифры'"/><xsl:with-param name="selected" select="$category"/></xsl:call-template>
                <xsl:call-template name="option"><xsl:with-param name="value" select="'company'"/><xsl:with-param name="label" select="'О компании'"/><xsl:with-param name="selected" select="$category"/></xsl:call-template>
              </select>
            </label>
            <label>Автор
              <select name="author">
                <option value="">Все авторы</option>
                <!-- Каждый автор один раз: первая запись с этим именем. -->
                <xsl:for-each select="/pressReleases/release[not(author = preceding-sibling::release/author)]">
                  <xsl:sort select="author"/>
                  <xsl:call-template name="option">
                    <xsl:with-param name="value" select="author"/>
                    <xsl:with-param name="selected" select="$author"/>
                  </xsl:call-template>
                </xsl:for-each>
              </select>
            </label>
            <label>Сортировать
              <select name="sort">
                <xsl:call-template name="option"><xsl:with-param name="value" select="'date'"/><xsl:with-param name="label" select="'Дата'"/><xsl:with-param name="selected" select="$sort"/></xsl:call-template>
                <xsl:call-template name="option"><xsl:with-param name="value" select="'title'"/><xsl:with-param name="label" select="'Заголовок'"/><xsl:with-param name="selected" select="$sort"/></xsl:call-template>
                <xsl:call-template name="option"><xsl:with-param name="value" select="'category'"/><xsl:with-param name="label" select="'Категория'"/><xsl:with-param name="selected" select="$sort"/></xsl:call-template>
                <xsl:call-template name="option"><xsl:with-param name="value" select="'author'"/><xsl:with-param name="label" select="'Автор'"/><xsl:with-param name="selected" select="$sort"/></xsl:call-template>
                <xsl:call-template name="option"><xsl:with-param name="value" select="'id'"/><xsl:with-param name="label" select="'Код'"/><xsl:with-param name="selected" select="$sort"/></xsl:call-template>
              </select>
            </label>
            <label>Порядок
              <select name="order">
                <xsl:call-template name="option"><xsl:with-param name="value" select="'descending'"/><xsl:with-param name="label" select="'По убыванию'"/><xsl:with-param name="selected" select="$order"/></xsl:call-template>
                <xsl:call-template name="option"><xsl:with-param name="value" select="'ascending'"/><xsl:with-param name="label" select="'По возрастанию'"/><xsl:with-param name="selected" select="$order"/></xsl:call-template>
              </select>
            </label>
            <button type="submit">Показать</button>
            <a href="/xml/transform">Сбросить</a>
          </form>

          <p>Найдено: <xsl:value-of select="count($items)"/> из <xsl:value-of select="count(/pressReleases/release)"/></p>

          <div class="table">
            <table>
              <caption>Пресс-релизы: семь полей каждой XML-записи</caption>
              <thead>
                <tr><th>Код</th><th>Заголовок</th><th>Дата</th><th>Категория</th><th>Автор</th><th>Кратко</th><th>Текст</th></tr>
              </thead>
              <tbody>
                <!-- Направление сортировки — двумя ветками: значение order из параметра понимают
                     не все XSLT-процессоры. -->
                <xsl:choose>
                  <xsl:when test="$order = 'ascending'">
                    <xsl:for-each select="$items">
                      <xsl:sort select="*[name() = $sort] | @*[name() = $sort]" order="ascending"/>
                      <xsl:call-template name="row"/>
                    </xsl:for-each>
                  </xsl:when>
                  <xsl:otherwise>
                    <xsl:for-each select="$items">
                      <xsl:sort select="*[name() = $sort] | @*[name() = $sort]" order="descending"/>
                      <xsl:call-template name="row"/>
                    </xsl:for-each>
                  </xsl:otherwise>
                </xsl:choose>
              </tbody>
            </table>
          </div>
        </main>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
