// Общие шапка и подвал для макетов. В макете: <header data-active="flights"></header> и <footer></footer>.
const IMG = '../../public/images';

const NAV = [
  ['flights', 'Рейсы'],
  ['destinations', 'Направления'],
  ['airlines', 'Авиакомпании'],
  ['news', 'Новости'],
  ['services', 'Сервисы'],
  ['more', 'Ещё ▾'],
];

const header = document.querySelector('header[data-active]');
if (header) {
  const active = header.dataset.active;
  const user = header.dataset.user;
  header.className = 'header';
  header.innerHTML = `
    <div class="container header-inner">
      <a class="header-logo" href="home.html"><img src="${IMG}/brand/logo.svg" alt="Avocado Travel"></a>
      <nav class="nav" aria-label="Основное меню">
        ${NAV.map(([id, label]) => `<a href="#"${id === active ? ' aria-current="page"' : ''}>${label}</a>`).join('')}
      </nav>
      <div class="header-search">⌕ Поиск по сайту</div>
      ${user ? `<a class="btn btn-ghost" href="account.html">${user}</a>` : '<a class="btn btn-secondary" href="#">Войти</a>'}
      <button class="icon-btn" aria-label="Поиск">⌕</button>
      <button class="icon-btn" aria-label="Меню">☰</button>
    </div>`;
}

const footer = document.querySelector('footer');
if (footer) {
  footer.className = 'footer';
  footer.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div>
          <img src="${IMG}/brand/logo-light.svg" alt="Avocado Travel" height="36">
          <p class="muted" style="color:#b7bdb6;margin-top:12px">Авиабилеты по России и за рубеж. Учебный проект: авиакомпании выдуманные, оплата демонстрационная.</p>
        </div>
        <div>
          <h3>Карта сайта</h3>
          <ul>
            <li><a href="#">Рейсы</a></li><li><a href="#">Направления</a></li><li><a href="#">Авиакомпании</a></li>
            <li><a href="#">Новости</a></li><li><a href="#">Пресс-центр</a></li><li><a href="#">Сервисы</a></li>
            <li><a href="#">Форум</a></li><li><a href="#">Гостевая книга</a></li><li><a href="#">Аналитика</a></li>
            <li><a href="#">API и выгрузки</a></li><li><a href="#">Полезные ссылки</a></li><li><a href="#">Справка</a></li>
          </ul>
        </div>
        <div class="rates">
          <h3>Курсы ЦБ на 21.10</h3>
          <div><span>USD</span><span>92,40 ₽</span></div>
          <div><span>EUR</span><span>99,15 ₽</span></div>
          <div><span>CNY</span><span>12,82 ₽</span></div>
        </div>
        <div>
          <h3>Посещения</h3>
          <p>Сегодня: 128</p>
          <p>Всего: 15 342</p>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© 2026 Ермаков Александр, Биз-Б23</span>
        <span>Next.js · TypeScript · PostgreSQL</span>
      </div>
    </div>`;
}
