/* Орион — interactions. Vanilla, без зависимостей.
   Без JS страница остаётся читаемой: скрыт только квиз. */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var P = window.ORION_PRODUCTS || [];
  var restack = null;   // пересчёт стопки обязательств, задаётся в initStack

  /* В выгрузке категория записана с опечаткой; ключ трогать нельзя —
     он связывает товары, поэтому правим только то, что видит человек. */
  var CAT_LABEL = { 'Гостинная': 'Гостиная' };
  function catLabel(c) { return CAT_LABEL[c] || c; }

  function money(n) { return n.toLocaleString('ru-RU') + ' ₽'; }
  function esc(s) { return String(s).replace(/"/g, '&quot;'); }

  /* Tilda отдаёт уменьшенные копии с thb.* — просим тот размер, который рисуем */
  function thumb(url, w) {
    return url.replace('://static.tildacdn.com/', '://thb.tildacdn.com/')
              .replace(/\/([^/]+)$/, '/-/resize/' + w + 'x/$1');
  }
  function byTitle(t) { return P.filter(function (p) { return p.title === t; })[0]; }
  function inCat(c) { return P.filter(function (p) { return p.cats.indexOf(c) > -1; }); }

  /* ---------------------------------------------------------
     1. Появление на скролле
     --------------------------------------------------------- */
  var io = null;
  function observe(els) {
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach(function (e) { e.classList.add('in'); });
      return;
    }
    if (!io) {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0.05 });
    }
    els.forEach(function (e) { io.observe(e); });
  }
  /* Заголовки проявляются построчно: строки уже размечены как .l,
     остаётся раздать им порядковый номер для задержки. */
  function initCascade() {
    $$('.h2, .ask__t, .quiz__side h2, .promo__txt h2').forEach(function (h) {
      var lines = $$('.l', h);
      if (!lines.length) return;
      h.classList.add('casc');
      if (!h.classList.contains('reveal')) h.classList.add('reveal');
      lines.forEach(function (l, i) { l.style.setProperty('--li', i); });
    });
  }

  /* Пункты меню: каждая буква — своя ячейка, поэтому при наведении
     они уезжают волной, а снизу подходит копия. */
  function initCascadeNav() {
    $$('.hdr__nav a').forEach(function (link) {
      var t = link.textContent, out = '';
      for (var i = 0; i < t.length; i++) {
        var ch = t[i] === ' ' ? ' ' : t[i];
        out += '<span class="chw"><span class="ch" style="--ci:' + i + '" data-c="' + ch + '">' +
               ch + '</span></span>';
      }
      link.innerHTML = out;
    });
  }

  function initReveal() {
    initCascade(); initCascadeNav();
    var items = $$('.reveal');
    var groups = new Map();
    items.forEach(function (el) {
      var p = el.parentElement;
      if (!groups.has(p)) groups.set(p, 0);
      var i = groups.get(p);
      el.style.setProperty('--d', Math.min(i, 6) * 65 + 'ms');
      groups.set(p, i + 1);
    });
    observe(items);
  }

  /* ---------------------------------------------------------
     2. Липкая шапка + параллакс комнаты
     --------------------------------------------------------- */
  function initScroll() {
    var hdr = $('#hdr'), room = $('.hero__media img'), ticking = false;
    function frame() {
      var y = window.pageYOffset;
      hdr.classList.toggle('stuck', y > 12);
      if (room && !reduce && y < window.innerHeight * 1.4) {
        room.style.transform = 'scale(1.04) translateY(' + (y * 0.07).toFixed(1) + 'px)';
      }
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(frame); }
    }, { passive: true });
    frame();
  }

  /* ---------------------------------------------------------
     3. Переключатель аудитории
     --------------------------------------------------------- */
  /* Выбранная версия переживает переход между страницами: пишем её в
     хранилище, а адрес с ?aud= остаётся запасным путём для внешних ссылок. */
  function audRemember(set) {
    try { localStorage.setItem('orion:aud', set); } catch (e) {}
  }
  function audWanted() {
    var m = /[?&]aud=(private|wholesale)/.exec(location.search);
    if (m) return m[1];
    try { return localStorage.getItem('orion:aud'); } catch (e) { return null; }
  }
  function audRestore() {
    var want = audWanted();
    if (!want || !$('.hero') || document.body.dataset.aud === want) return;
    var btn = $('.switch__btn[data-set="' + want + '"]');
    if (btn) btn.click();
  }

  function initSwitch() {
    var btns = $$('.switch__btn');
    /* Оптовая версия живёт только на главной. С внутренних страниц
       переключатель уводит туда же, а не молчит. */
    var homePage = !!$('.hero');
    if (!homePage) {
      btns.forEach(function (b) {
        b.addEventListener('click', function () {
          audRemember(b.dataset.set);
          location.href = '/?aud=' + b.dataset.set;
        });
      });
      return;
    }
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        var set = b.dataset.set;
        if (document.body.dataset.aud === set) return;
        document.body.dataset.aud = set;
        btns.forEach(function (x) {
          var on = x === b;
          x.classList.toggle('is-on', on);
          x.setAttribute('aria-selected', String(on));
        });
        $$('[data-aud-txt]').forEach(function (el) { el.textContent = el.dataset[set]; });
        $$('.aud--' + set).forEach(function (el) {
          el.classList.remove('aud-swap'); void el.offsetWidth; el.classList.add('aud-swap');
        });
        $$('.aud--' + set + ' .reveal, .aud--' + set + '.reveal').forEach(function (el) { el.classList.add('in'); });
        renderShelf(set);
        setHeroImage(set);
        document.dispatchEvent(new CustomEvent('orion:aud', { detail: set }));
        audRemember(set);
        if (restack) restack();   // у версий разная высота — пересобираем стопку
        /* Это смена страницы, а не фильтр: поднимаемся к первому экрану, как по якорю.
           Иначе позиция «плывёт» — у версий разная высота, и человека бросает
           в середину чужого блока. С большой высоты прыгаем сразу, чтобы не ждать. */
        var far = window.pageYOffset > window.innerHeight * 2.5;
        window.scrollTo({ top: 0, behavior: (reduce || far) ? 'auto' : 'smooth' });
      });
    });
  }

  /* ---------------------------------------------------------
     4. Мобильное меню
     --------------------------------------------------------- */
  function initBurger() {
    var b = $('#burger'), nav = $('#mobnav');
    if (!b) return;
    b.addEventListener('click', function () {
      var open = b.getAttribute('aria-expanded') === 'true';
      b.setAttribute('aria-expanded', String(!open));
      nav.hidden = open;
      /* шапка на телефоне бывает в две строки — меню встаёт под неё,
         иначе первый пункт уезжает под переключатель версии */
      if (!nav.hidden) {
        var hdr = $('#hdr');
        if (hdr) nav.style.top = Math.round(hdr.getBoundingClientRect().bottom + 8) + 'px';
      }
    });
    $$('#mobnav a').forEach(function (a) {
      a.addEventListener('click', function () {
        b.setAttribute('aria-expanded', 'false'); nav.hidden = true;
      });
    });
  }

  /* ---------------------------------------------------------
     5. Счётчики
     --------------------------------------------------------- */
  function initCounters() {
    var els = $$('.count');
    if (!els.length) return;
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.textContent = el.dataset.to; }); return;
    }
    var o = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        o.unobserve(e.target);
        var el = e.target, to = +el.dataset.to, t0 = performance.now();
        (function step(t) {
          var p = Math.min((t - t0) / 1300, 1);
          el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))).toLocaleString('ru-RU');
          if (p < 1) requestAnimationFrame(step);
        })(t0);
      });
    }, { threshold: 0.5 });
    els.forEach(function (el) { o.observe(el); });
  }

  /* ---------------------------------------------------------
     6. Этапы: на десктопе выделяет наведение, на телефоне — скролл
     --------------------------------------------------------- */
  function initFlow() {
    var steps = $$('.fstep');
    if (!steps.length || !('IntersectionObserver' in window)) return;
    if (window.matchMedia('(min-width:1000px)').matches) return;
    var o = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        e.target.classList.toggle('is-on', e.isIntersecting && e.intersectionRatio > 0.6);
      });
    }, { threshold: [0, 0.6, 1], rootMargin: '-25% 0px -25% 0px' });
    steps.forEach(function (s) { o.observe(s); });
  }

  /* ---------------------------------------------------------
     6b. Обязательства: карточки копятся стопкой, доехавшая до места
         открывает свой кадр. Только на узких экранах — на десктопе бенто.
     --------------------------------------------------------- */
  function initStack() {
    var sec = $('#doveryayut'), wrap = sec && $('.wrap', sec), box = $('.bento');
    if (!sec || !wrap || !box) return;
    var cards = $$('.ben', box);
    if (!cards.length) return;

    var mq = window.matchMedia('(max-width:900px)');
    var N = cards.length;
    var LAP = 12;                       // кромка, на которой карточка успокаивается
    var UNIT = 78;                      // прокрутки на один шаг движения
    var STEPS = (N - 1) * 2;            // у каждой карточки два шага: половина и кромка
    var TRAVEL = STEPS * UNIT;          // столько прокрутки съедает прижатая секция
    var m = null;                       // замеры, обновляются только при resize

    cards.forEach(function (c, i) { c.style.setProperty('--i', i); });
    sec.style.setProperty('--n', N);

    function reset() {
      sec.style.removeProperty('min-height');
      box.style.removeProperty('--box-h');
      cards.forEach(function (c) {
        c.style.removeProperty('--y');
        c.classList.remove('is-photo');
      });
    }

    /* Вся геометрия читается здесь, чтобы прокрутка ничего не измеряла. */
    function measure() {
      if (!mq.matches) { m = null; reset(); return; }

      var hdr = $('#hdr');
      var hdrH = hdr ? Math.round(hdr.getBoundingClientRect().height) : 110;
      var cs = getComputedStyle(sec);
      var padT = parseFloat(cs.paddingTop) || 0;
      var padB = parseFloat(cs.paddingBottom) || 0;
      var cardH = cards[0].offsetHeight || 236;
      var half = Math.round(cardH / 2);

      /* Самое высокое положение стопки за анимацию: последняя карточка стоит
         на половине предпоследней. Под это и открываем окно. */
      var ideal = cardH + (N - 2) * LAP + half;
      var headH = Math.round(box.getBoundingClientRect().top - wrap.getBoundingClientRect().top);
      var room = window.innerHeight - hdrH - headH - 16;
      var boxH = Math.min(ideal, Math.max(cardH + half, room));
      var shift = -Math.max(0, ideal - boxH);   // на низких экранах чуть подрезаем сверху

      sec.style.setProperty('--hdr-h', hdrH + 'px');
      box.style.setProperty('--box-h', Math.round(boxH) + 'px');

      /* Запас прокрутки кладём в min-height: липкий блок ходит только
         в пределах content-box родителя, padding для него не считается. */
      sec.style.minHeight = Math.round(wrap.offsetHeight + TRAVEL + padT + padB) + 'px';

      m = { hdrH: hdrH, padT: padT, half: half, shift: shift, startY: boxH + 24 };
      place();
    }

    function ease(t) { return 1 - Math.pow(1 - t, 3); }

    /* Единственное чтение на кадр — положение секции. */
    function place() {
      if (!m) return;
      var p = ((m.hdrH - m.padT) - sec.getBoundingClientRect().top) / TRAVEL;
      p = Math.max(0, Math.min(1, p));
      var active = p * STEPS;

      for (var i = 0; i < N; i++) {
        var rest = i * LAP + m.shift;                       // тонкая кромка, финал
        var y, done;

        if (i === 0) { y = rest; done = true; }
        else {
          var half = (i - 1) * LAP + m.half + m.shift;      // накрыть предыдущую наполовину
          var u = Math.max(0, Math.min(2, active - (i - 1) * 2));
          if (u <= 1) {                                     // шаг 1: подъезжает на половину
            y = m.startY + (half - m.startY) * ease(u);
          } else {                                          // шаг 2: дожимается до кромки
            y = half + (rest - half) * ease(u - 1);
          }
          done = u >= 0.985;                                // встала — открывает кадр
        }
        cards[i].style.setProperty('--y', y.toFixed(1) + 'px');
        cards[i].classList.toggle('is-photo', done);
        /* верхняя карточка стопки — та, что сейчас читают: её кадр светлее */
        cards[i].classList.toggle('is-current', i === Math.min(N - 1, Math.ceil(active / 2)));
      }
    }

    /* place() зовём прямо из обработчика: кадр анимации может не прийти
       (свёрнутая вкладка, инерционная прокрутка), и стопка застывала */
    window.addEventListener('scroll', place, { passive: true });
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    window.addEventListener('pageshow', measure);
    mq.addEventListener ? mq.addEventListener('change', measure) : mq.addListener(measure);
    restack = measure;          // переключатель аудитории пересобирает блок
    measure();
  }

  /* ---------------------------------------------------------
     7. Бегущая строка — дублируем ленту, чтобы стык был бесшовным
     --------------------------------------------------------- */
  function initMarquee() {
    var row = $('#marqRow');
    if (!row) return;
    var items = [
      ['i-factory', '1000+ м² собственного производства'],
      ['i-ruler', 'Точность 0,1 мм на линии Nanxing'],
      ['i-clock', 'Сроки от 3 дней с фиксацией в договоре'],
      ['i-scissors', 'Распил и кромление ЛДСП'],
      ['i-truck', 'Отгрузка в 7 регионов'],
      ['i-box', 'Материалы и логистику берём на себя'],
      ['i-shield', 'Гарантия 12 месяцев'],
      ['i-tag', 'Цена фиксируется в договоре'],
      ['i-wallet', 'Рассрочка без банков']
    ];
    var one = items.map(function (it) {
      return '<span><svg class="ico"><use href="#' + it[0] + '"/></svg>' + it[1] + '</span>';
    }).join('');
    row.innerHTML = one + one;   // ровно две копии — сдвиг на -50% замыкает петлю
  }

  /* ---------------------------------------------------------
     8. Витрина
     --------------------------------------------------------- */
  /* 09. На главной витрина работает превью: шесть моделей и ссылка
     на каталог. Полный список со страницами живёт на katalog.html. */
  var SHORT = !!document.querySelector('#vitrina[data-short]');
  var PAGE = SHORT ? 6 : 9;
  var state = { cat: 'Все', shown: PAGE };
  var CAT_SHORT = { 'Мебель для организаций': 'Офис', 'Гостинная': 'Гостиная',
                    'Кухни': 'Кухня', 'Стеллажи': 'Стеллаж', 'Столы': 'Стол', 'Тумбы': 'Тумба' };

  /* теги собираем из реальных данных карточки, ничего не выдумываем */
  function tagsFor(p) {
    var t = [];
    if (p.dim) t.push(p.dim + ' мм');
    var txt = p.text || '';
    if (/фасад/i.test(txt)) t.push('Фасады на заказ');
    if (/подсветк/i.test(txt)) t.push('Подсветка');
    if (/столешниц/i.test(txt)) t.push('Столешница');
    if (/дуб|шпон/i.test(txt)) t.push('Текстура дерева');
    /* 10. Ничем не добиваем: общее для всех позиций сказано в подзаголовке
       раздела, а на карточке остаётся только то, чем товары отличаются. */
    return t.slice(0, 2);
  }

  function cardHTML(p) {
    var cat = CAT_SHORT[p.cats[0]] || p.cats[0] || 'Мебель';
    return '<article class="card reveal" data-id="' + p.id + '" tabindex="0" role="button" aria-label="' + esc(p.title) + '">' +
      '<span class="card__media"><img src="' + thumb(p.img, 560) + '" alt="' + esc(p.title) + '" loading="lazy" decoding="async"></span>' +
      '<span class="card__body">' +
        '<span class="card__meta">' + cat + '</span>' +
        '<span class="card__t">' + p.title + '</span>' +
        '<span class="card__price"><em>от</em>' + money(p.price) + '</span>' +
        '<span class="tags">' + tagsFor(p).map(function (t) { return '<span>' + t + '</span>'; }).join('') + '</span>' +
        '<span class="card__foot"><span class="tlink">Хочу похожую мебель<svg class="ico"><use href="#i-arrow"/></svg></span></span>' +
      '</span>' +
    '</article>';
  }

  function filtered() {
    if (state.cat !== 'Все') {
      return P.filter(function (p) { return p.cats.indexOf(state.cat) > -1; });
    }
    /* на главной без фильтра показываем отобранную шестёрку,
       остальные позиции идут следом — на случай «Показать ещё» */
    if (!SHORT) return P;
    var top = FEATURED.map(byTitle).filter(Boolean);
    return top.concat(P.filter(function (p) { return top.indexOf(p) < 0; }));
  }

  function render() {
    var grid = $('#grid'), more = $('#more');
    var list = filtered();
    grid.innerHTML = list.slice(0, state.shown).map(cardHTML).join('');
    var rest = Math.max(list.length - state.shown, 0);
    if (more) {
      more.hidden = rest === 0;
      $('.btn__t', more).textContent = 'Показать ещё ' + rest;
    }
    renderPager(list.length);
    var cards = $$('.card', grid);
    cards.forEach(function (c, i) { c.style.setProperty('--d', Math.min(i % PAGE, 8) * 50 + 'ms'); });
    observe(cards);
  }

  /* Номера страниц справа от кнопки. Одна модель: номер = сколько
     страниц раскрыто, «Показать ещё» просто раскрывает следующую. */
  function renderPager(total) {
    var pg = $('#pager');
    if (!pg) return;
    var pages = Math.ceil(total / PAGE);
    if (pages < 2) { pg.innerHTML = ''; return; }
    var now = Math.min(Math.ceil(state.shown / PAGE), pages);
    var html = '';
    for (var i = 1; i <= pages; i++) {
      if (i === 1 || i === pages || Math.abs(i - now) <= 1) {
        html += '<button type="button" class="' + (i === now ? 'on' : '') + '" data-page="' + i +
                '" aria-current="' + (i === now ? 'true' : 'false') + '">' + i + '</button>';
      } else if (Math.abs(i - now) === 2) {
        html += '<span>…</span>';
      }
    }
    pg.innerHTML = html;
  }

  /* На телефоне девять чипов не помещаются: остаётся «Все» и «Выбрать»,
     полный список категорий открывается отдельным окном. */
  function initFilterDialog() {
    var dlg = $('#fdlg'), open = $('#fopen'), list = $('#fdlgList');
    if (!dlg || !open || !list) return;
    var cats = ['Все'].concat(window.ORION_CATS || []);
    list.innerHTML = cats.map(function (c) {
      return '<button type="button" data-cat="' + esc(c) + '">' + catLabel(c) +
             '<svg class="ico"><use href="#i-check"/></svg></button>';
    }).join('');
    open.addEventListener('click', function () {
      syncDialog();
      if (dlg.showModal) dlg.showModal();
    });
    list.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cat]');
      if (!b) return;
      setCat(b.dataset.cat);
      dlg.close();
      $('#grid').scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
    });
    $('#fclose').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    syncDialog();
  }

  function syncDialog() {
    var lbl = $('#fbtnLabel');
    if (lbl) lbl.textContent = state.cat === 'Все' ? 'Выбрать' : (CAT_SHORT[state.cat] || state.cat);
    $$('#fdlgList [data-cat]').forEach(function (b) {
      b.classList.toggle('on', b.dataset.cat === state.cat);
    });
    $$('#fbar .chip').forEach(function (c) { c.classList.toggle('on', state.cat === 'Все'); });
  }

  /* оптовику витрина открывается сразу на мебели для организаций:
     остальные категории ему показывать незачем */
  function audCat(aud) {
    return aud === 'wholesale' ? 'Мебель для организаций' : 'Все';
  }

  function setCat(cat) {
    state.cat = cat; state.shown = PAGE;
    $$('#filters .chip').forEach(function (c) { c.classList.toggle('on', c.dataset.cat === cat); });
    syncDialog();
    render();
  }

  function initCatalog() {
    if (!P.length || !$('#grid')) return;
    state.cat = audCat(document.body.dataset.aud);
    var cats = ['Все'].concat(window.ORION_CATS || []);
    $('#filters').innerHTML = cats.map(function (c) {
      return '<button class="chip' + (c === state.cat ? ' on' : '') + '" type="button" data-cat="' + esc(c) + '">' + catLabel(c) + '</button>';
    }).join('');
    /* переключение частный/оптовый — смена страницы, а не фильтра:
       витрина возвращается к своей категории */
    document.addEventListener('orion:aud', function (e) { setCat(audCat(e.detail)); });
    $('#filters').addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (b) setCat(b.dataset.cat);
    });
    var moreBtn = $('#more');
    if (moreBtn) moreBtn.addEventListener('click', function () { state.shown += PAGE; render(); });
    $('#fbar').addEventListener('click', function (e) {
      var b = e.target.closest('.chip[data-cat]');
      if (b) setCat(b.dataset.cat);
    });
    initFilterDialog();
    var pagerEl = $('#pager');
    if (pagerEl) pagerEl.addEventListener('click', function (e) {
      var b = e.target.closest('[data-page]');
      if (!b) return;
      state.shown = +b.dataset.page * PAGE;
      render();
      $('#grid').scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
    });
    /* на странице каталога ссылка из подвала сразу ставит фильтр,
       на остальных — просто ведёт в каталог */
    $$('.ftr__col a[data-cat]').forEach(function (a) {
      a.addEventListener('click', function () { if (!SHORT) setCat(a.dataset.cat); });
    });
    render();
  }

  /* ---------------------------------------------------------
     9. Витрина в герое и фото-полосы между разделами
     --------------------------------------------------------- */
  /* Витрина в герое: частнику — жильё, оптовику — офисные позиции */
  /* Превью витрины на главной: шесть позиций, отобранных вручную.
     Порядок здесь — порядок на странице. Полный каталог живёт на katalog.html. */
  var FEATURED = [
    'Кухонный гарнитур «Mint & Wood»',
    'Прихожая-гардероб «Монако-Глэйд»',
    'Интерьерный комплекс для прихожей «Air Gray»',
    'Гостиная «Графит»',
    'Интерьерный комплекс для прихожей «Graft Concept»',
    'Интерьерная система хранения «Vertical Rhythm»'
  ];

  var SHELF = {
    private: ['Гостиная «Grand Wood & Stone»', 'Кухонный гарнитур «Nordic Wood» (угловой)', 'Интерьерная входная группа «Антрацит»'],
    wholesale: ['Шкаф 4-хстворчатый для документов', 'Шкаф для документов полуоткрытый', 'Тумба под МФУ']
  };

  /* Кадр первого экрана: жилой интерьер частнику, кабинет оптовику.
     Второй файл грузится только при переключении, а не при первой загрузке. */
  function setHeroImage(aud) {
    var im = $('#heroImg');
    if (!im) return;
    var next = im.dataset[aud];
    if (!next || im.getAttribute('src') === next) return;
    im.src = next;
    im.alt = im.dataset[aud + 'Alt'] || im.alt;
  }

  function renderShelf(aud) {
    var box = $('#heroShelf');
    if (!box || !P.length) return;
    var chosen = (SHELF[aud] || SHELF.private).map(byTitle).filter(Boolean);
    while (chosen.length < 3) {
      var next = P.filter(function (p) { return chosen.indexOf(p) < 0; })[0];
      if (!next) break; chosen.push(next);
    }
    box.innerHTML = chosen.map(function (p) {
      return '<button class="shelf__i" type="button" data-id="' + p.id + '" aria-label="' + esc(p.title) + '">' +
        '<img src="' + thumb(p.img, 760) + '" alt="' + esc(p.title) + '" loading="eager" decoding="async" fetchpriority="high">' +
        /* на узком экране в подпись не влезает имя модели, поэтому там
           показываем тип мебели — он и отвечает на вопрос «что это» */
        '<span class="shelf__c">' +
          '<b class="shelf__full">' + p.title + '</b>' +
          '<b class="shelf__short">' + (CAT_SHORT[p.cats[0]] || p.cats[0] || 'Мебель') + '</b>' +
          '<i>от ' + money(p.price) + '</i></span></button>';
    }).join('');
  }

  /* Примеры работ: карточка с кадром, спецификацией и метриками —
     формат как на образце, данные берём из нашего каталога. */
  /* Сетка 4x4 из наших фото: каждые 3 секунды плитки меняются местами.
     Порядок тасуется, сами кадры остаются те же — как в образце ShuffleGrid. */
  /* Сетка 4x4 как в образце ShuffleGrid: плитки не подменяют картинку,
     а физически переезжают на новые места — пути пересекаются, движение
     пружинное. Позиция задаётся transform, поэтому анимирует композитор. */
  function initShuffle() {
    var box = $('#shuffle');
    if (!box) return;
    var cat = box.dataset.cat;
    var pool = inCat(cat).concat(P.filter(function (p) { return p.cats.indexOf(cat) < 0; }));
    var tiles = pool.slice(0, 16).map(function (p) { return { src: thumb(p.img, 400), t: p.title }; });
    if (tiles.length < 8) return;

    var N = tiles.length, COLS = 4;
    box.innerHTML = tiles.map(function (t) {
      return '<span class="shuffle__i" style="background-image:url(' + t.src + ')" title="' + esc(t.t) + '"></span>';
    }).join('');
    var cells = $$('.shuffle__i', box);

    /* slot[i] — место, которое сейчас занимает плитка i */
    var slots = cells.map(function (_, i) { return i; });
    /* шаг = ширина плитки + зазор --g, поэтому сетка ложится в бокс ровно */
    function step(n) { return 'calc((100% + var(--g)) * ' + n + ')'; }
    function place() {
      cells.forEach(function (c, i) {
        var s = slots[i];
        c.style.transform = 'translate(' + step(s % COLS) + ',' + step(Math.floor(s / COLS)) + ')';
      });
    }
    place();
    /* тасуем и при reduced-motion: движение сетки заказчик просил оставить всегда */

    setInterval(function () {
      for (var i = slots.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var tmp = slots[i]; slots[i] = slots[j]; slots[j] = tmp;
      }
      place();
    }, 3000);
  }

  /* ---- карусель материалов ------------------------------------------
     Обратная перспектива: центральная карточка стоит фронтально, соседние
     разворачивают внешний край на зрителя. Числа сняты с образца
     ruixen.ui/coverflow-carousel и нормированы на ширину карточки:
     шаг 1.05W, глубина до 1.478W, угол насыщается на 82°. */
  function initCoverflow() {
    var src = $('#mats');
    if (!src) return;
    var lis = $$('li', src);
    if (lis.length < 3) return;

    var items = lis.map(function (li, i) {
      var num = $('.mat__n', li);
      return {
        n: num ? num.textContent.trim() : ('0' + (i + 1)),
        title: (li.querySelector('h3') || {}).textContent || '',
        text: (li.querySelector('p') || {}).textContent || '',
        img: li.dataset.img || '',
        meta: (li.dataset.meta || '').split('|').filter(Boolean).map(function (row) {
          var k = row.indexOf(':');
          return k < 0 ? [row, ''] : [row.slice(0, k).trim(), row.slice(k + 1).trim()];
        })
      };
    });

    /* фото: путь берём как есть, иначе подбираем кадр нужной категории */
    items.forEach(function (it, i) {
      if (it.img.indexOf('/') > -1) return;
      var list = it.img ? inCat(it.img) : [];
      var p = list[i % list.length];
      it.img = p ? thumb(p.img, 700) : '';
    });

    var box = document.createElement('div');
    box.className = 'cf';
    box.innerHTML =
      '<div class="cf__stage" id="cfStage" tabindex="0" role="listbox" aria-label="Материалы и фурнитура">' +
        items.map(function (it, i) {
          return '<div class="cf__i" role="option" data-i="' + i + '" aria-label="' + esc(it.title) + '">' +
            (it.img ? '<img src="' + it.img + '" alt="' + esc(it.title) + '" loading="lazy" draggable="false">' : '') +
            '<span class="cf__n">' + it.n + '</span></div>';
        }).join('') +
      '</div>' +
      '<div class="cf__cap"><h3 id="cfTitle"></h3><p id="cfText"></p>' +
        '<dl class="cf__meta" id="cfMeta"></dl></div>' +
      '<div class="cf__nav">' +
        '<button class="cf__b" type="button" data-d="-1" aria-label="Предыдущий материал">' +
          '<svg class="ico"><use href="#i-arrow"/></svg></button>' +
        '<button class="cf__b" type="button" data-d="1" aria-label="Следующий материал">' +
          '<svg class="ico"><use href="#i-arrow"/></svg></button>' +
      '</div>' +
      '<div class="cf__dots" id="cfDots">' + items.map(function (it, i) {
        return '<button type="button" data-i="' + i + '" aria-label="' + esc(it.title) + '"></button>';
      }).join('') + '</div>';
    src.parentNode.replaceChild(box, src);

    /* ширина окна без полосы прокрутки — на неё растягивается стойка */
    function vw() {
      document.documentElement.style.setProperty('--vw', document.documentElement.clientWidth + 'px');
    }
    vw();
    window.addEventListener('resize', vw);

    var stage = $('#cfStage', box), cells = $$('.cf__i', box), dots = $$('#cfDots button', box);
    var ANG = [0, 44, 65, 81, 82, 82],
        DEP = [0, .600, .885, 1.110, 1.304, 1.478],
        OPA = [1, .9, .8, .7, .6, .5];
    function tab(arr, x) {
      var i = Math.floor(x), f = x - i;
      if (i >= arr.length - 1) return arr[arr.length - 1];
      return arr[i] + (arr[i + 1] - arr[i]) * f;
    }

    var cur = Math.floor(items.length / 2), pos = cur;
    function place(p) {
      var W = parseFloat(getComputedStyle(cells[0]).width) || 300;
      cells.forEach(function (c, i) {
        var d = i - p, ad = Math.abs(d), sign = d > 0 ? -1 : 1;
        c.style.transform = 'translateX(calc(-50% + ' + (d * W * 1.05).toFixed(1) + 'px))' +
          ' translateZ(' + (-tab(DEP, ad) * W).toFixed(1) + 'px)' +
          ' rotateY(' + (sign * tab(ANG, ad)).toFixed(2) + 'deg)';
        c.style.opacity = ad > 3.4 ? 0 : tab(OPA, ad);
        c.style.zIndex = String(100 - Math.round(ad));
        c.style.pointerEvents = ad > 3.4 ? 'none' : '';
        c.classList.toggle('on', Math.round(d) === 0);
      });
    }
    function caption(i) {
      var it = items[i];
      $('#cfTitle', box).textContent = it.title;
      $('#cfText', box).textContent = it.text;
      $('#cfMeta', box).innerHTML = it.meta.map(function (m) {
        return '<div><dt>' + m[0] + '</dt><dd>' + m[1] + '</dd></div>';
      }).join('');
      dots.forEach(function (d, k) { d.classList.toggle('on', k === i); });
      cells.forEach(function (c, k) { c.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
    }
    function go(i) {
      cur = Math.max(0, Math.min(items.length - 1, i));
      pos = cur; place(pos); caption(cur);
    }
    go(cur);
    window.addEventListener('resize', function () { place(pos); });

    box.addEventListener('click', function (e) {
      var nav = e.target.closest('.cf__b');
      if (nav) return go(cur + (+nav.dataset.d));
      var dot = e.target.closest('#cfDots button');
      if (dot) return go(+dot.dataset.i);
      var cell = e.target.closest('.cf__i');
      if (cell && !dragged) go(+cell.dataset.i);
    });
    stage.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(cur - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(cur + 1); }
    });

    /* тянем стойку рукой: пока палец на экране позиция дробная */
    var x0 = 0, base = 0, down = false, dragged = false;
    stage.addEventListener('pointerdown', function (e) {
      down = true; dragged = false; x0 = e.clientX; base = cur;
      stage.classList.add('drag'); stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener('pointermove', function (e) {
      if (!down) return;
      var W = parseFloat(getComputedStyle(cells[0]).width) || 300;
      var dx = e.clientX - x0;
      if (Math.abs(dx) > 4) dragged = true;
      pos = Math.max(-.4, Math.min(items.length - .6, base - dx / (W * 1.05)));
      place(pos);
      var near = Math.round(Math.max(0, Math.min(items.length - 1, pos)));
      if (near !== cur) { cur = near; caption(cur); }
    });
    function up() {
      if (!down) return;
      down = false; stage.classList.remove('drag');
      go(Math.round(Math.max(0, Math.min(items.length - 1, pos))));
    }
    stage.addEventListener('pointerup', up);
    stage.addEventListener('pointercancel', up);
  }

  /* ---- калькулятор: пошаговый, как квиз --------------------------------
     Один вопрос на экране. Первый шаг — ползунок габарита, остальные —
     варианты с фотографиями. В конце смета с разбивкой и вилкой. */
  function initCalc() {
    var host = $('#calc');
    if (!host) return;
    var cfg = (window.ORION_CALC || {})[host.dataset.calc];
    if (!cfg) return;

    var S = cfg.steps, LAST = S.length;      // LAST — экран сметы
    var step = 0;
    var pick = {};
    S.forEach(function (s) {
      if (s.kind === 'range') { pick[s.id] = s.def; return; }
      if (s.kind === 'many') { pick[s.id] = {}; return; }
      var d = 0;
      s.opts.forEach(function (o, i) { if (o.on) d = i; });
      pick[s.id] = d;
    });

    function shot(cat, n) {
      var list = inCat(cat);
      if (!list.length) return '';
      return thumb(list[n % list.length].img, 420);
    }
    function nice(v) { return String(v).replace('.', ','); }

    host.innerHTML =
      '<div class="cq" id="cqBox">' +
        '<div class="cq__bar"><span class="cq__fill" id="cqFill"></span></div>' +
        '<p class="cq__step" id="cqStep"></p>' +
        '<div class="cq__screen" id="cqScreen"></div>' +
        '<div class="cq__foot">' +
          '<button class="cq__back" type="button" id="cqBack">' +
            '<svg class="ico"><use href="#i-arrow"/></svg>Назад</button>' +
          '<p class="cq__now" id="cqNow"></p>' +
          '<button class="btn btn--lg" type="button" id="cqNext">' +
            '<span class="btn__t">Далее</span>' +
            '<svg class="ico ico--next"><use href="#i-arrow"/></svg>' +
            '<span class="btn__c"><svg class="ico"><use href="#i-arrow"/></svg></span></button>' +
        '</div>' +
      '</div>';

    var screen = $('#cqScreen', host);

    function sum() {
      var m = 1, core = 0, top = 0, adds = 0, k = 1;
      S.forEach(function (s) {
        function apply(o) {
          if (o.base) core = o.base;
          if (o.perM) top = o.perM;
          if (o.add) adds += o.add;
          if (o.k) k *= o.k;
        }
        if (s.kind === 'range') { m = pick[s.id]; return; }
        if (s.kind === 'many') {
          Object.keys(pick[s.id]).forEach(function (i) { apply(s.opts[i]); });
        } else apply(s.opts[pick[s.id]]);
      });
      var total = (core * m + top * m + adds) * k;
      return { m: m, core: Math.round(core * m), top: Math.round(top * m),
               adds: adds, k: k, total: Math.round(total / 500) * 500 };
    }

    function drawQuestion(si) {
      var s = S[si];
      if (s.kind === 'range') {
        return '<h3 class="cq__q">' + s.q + '</h3>' +
          (s.hint ? '<p class="cq__hint">' + s.hint + '</p>' : '') +
          '<div class="cq__range">' +
            '<output class="cq__val" id="cqVal">' + nice(pick[s.id]) + ' ' + s.unit + '</output>' +
            '<input type="range" id="cqSlider" min="' + s.min + '" max="' + s.max + '"' +
              ' step="' + s.step + '" value="' + pick[s.id] + '"' +
              ' aria-label="' + esc(s.q) + '">' +
            '<div class="cq__ticks"><span>' + nice(s.min) + ' м</span>' +
              '<span>' + nice(s.max) + ' м</span></div>' +
          '</div>';
      }
      var many = s.kind === 'many';
      return '<h3 class="cq__q">' + s.q +
          (many ? '<em>можно выбрать несколько</em>' : '') + '</h3>' +
        '<div class="cq__opts">' + s.opts.map(function (o, oi) {
          var on = many ? !!pick[s.id][oi] : pick[s.id] === oi;
          var src = shot(s.pic, si * 3 + oi);
          return '<button class="cqo' + (on ? ' on' : '') + '" type="button"' +
            ' data-o="' + oi + '" aria-pressed="' + on + '">' +
            '<span class="cqo__img"' + (src ? ' style="background-image:url(' + src + ')"' : '') + '>' +
              '<span class="cqo__tick"><svg class="ico"><use href="#i-check"/></svg></span></span>' +
            '<span class="cqo__t"><b>' + o.t + '</b>' +
              (o.d ? '<i>' + o.d + '</i>' : '') + '</span>' +
          '</button>';
        }).join('') + '</div>';
    }

    function drawResult() {
      var r = sum();
      var rows = [['Корпус и фасады', money(r.core)]];
      if (r.top) rows.push(['Столешница', money(r.top)]);
      if (r.adds) rows.push(['Дополнения', money(r.adds)]);
      if (Math.abs(r.k - 1) > .001) rows.push(['Коэффициент сложности', '×' + r.k.toFixed(2)]);
      rows.push([cfg.unit === 'пог. м' ? 'Длина' : 'Ширина', nice(r.m) + ' ' + cfg.unit]);
      return '<div class="cqr">' +
        '<p class="cqr__k">Ваш расчёт готов</p>' +
        '<p class="cqr__big"><span>' + r.total.toLocaleString('ru-RU') + '</span>' +
          '<span class="cur">₽</span></p>' +
        '<p class="cqr__fork">Вилка по проекту: ' +
          money(Math.round(r.total * .93 / 500) * 500) + ' — ' +
          money(Math.round(r.total * 1.09 / 500) * 500) + '</p>' +
        '<dl class="cqr__rows">' + rows.map(function (x) {
          return '<div><dt>' + x[0] + '</dt><dd>' + x[1] + '</dd></div>';
        }).join('') + '</dl>' +
        '<p class="cqr__save">С онлайн-скидкой 5%: <b>' +
          money(Math.round(r.total * .95 / 500) * 500) + '</b></p>' +
        '<button class="btn btn--lg btn--wide" type="button" id="cqGo"' +
          ' data-modal="Смета: ' + money(r.total) + '">' +
          '<span class="btn__t">Получить смету</span>' +
          '<svg class="ico ico--next"><use href="#i-up-right"/></svg>' +
          '<span class="btn__c"><svg class="ico"><use href="#i-up-right"/></svg></span></button>' +
        '<p class="cqr__note">Предварительный расчёт по средним ценам производства. ' +
          'Точная стоимость — после бесплатного замера, она фиксируется в договоре.</p>' +
      '</div>';
    }

    function paint() {
      var done = step === LAST;
      screen.innerHTML = done ? drawResult() : drawQuestion(step);
      screen.classList.remove('cq--in'); void screen.offsetWidth;
      screen.classList.add('cq--in');

      $('#cqStep', host).textContent = done
        ? 'Готово' : ('Вопрос ' + (step + 1) + ' из ' + LAST);
      $('#cqFill', host).style.width = Math.round((step / LAST) * 100) + '%';
      $('#cqBack', host).hidden = step === 0;
      $('#cqNext', host).hidden = done;
      var now = $('#cqNow', host);
      now.hidden = done || step === 0;
      if (!now.hidden) now.textContent = 'Пока выходит ' + money(sum().total);

      var sl = $('#cqSlider', host);
      if (sl) {
        var s = S[step];
        sl.addEventListener('input', function () {
          pick[s.id] = +sl.value;
          $('#cqVal', host).textContent = nice(+sl.value) + ' ' + s.unit;
        });
      }
    }

    host.addEventListener('click', function (e) {
      var o = e.target.closest('.cqo');
      if (o) {
        var s = S[step], oi = +o.dataset.o;
        if (s.kind === 'many') {
          if (pick[s.id][oi]) delete pick[s.id][oi]; else pick[s.id][oi] = 1;
          o.classList.toggle('on');
          o.setAttribute('aria-pressed', o.classList.contains('on'));
        } else {
          pick[s.id] = oi;
          $$('.cqo', host).forEach(function (x) {
            x.classList.toggle('on', x === o);
            x.setAttribute('aria-pressed', x === o);
          });
          /* одиночный выбор сразу ведёт дальше — меньше лишних нажатий */
          setTimeout(function () { if (step < LAST) { step++; paint(); } }, 220);
        }
        return;
      }
      if (e.target.closest('#cqNext')) { if (step < LAST) { step++; paint(); } }
      if (e.target.closest('#cqBack')) { if (step > 0) { step--; paint(); } }
    });

    paint();
  }

  /* Примеры работ: карточка с кадром, спецификацией и метриками —
     формат как на образце, данные берём из нашего каталога. */

  /* ---- отзывы: горизонтальная лента --------------------------------------
     Ряд листается колесом, пальцем, стрелками и клавишами. Фото клиента
     подставляем из каталога, пока не пришли настоящие снимки. */
  function initReviews() {
    var box = $('#revRow');
    if (!box) return;
    /* у оптовой версии своя подборка: объекты, а не квартиры */
    function setFor(aud) {
      return (aud === 'wholesale' && window.ORION_REVIEWS_WHOLESALE)
        ? window.ORION_REVIEWS_WHOLESALE : (window.ORION_REVIEWS || []);
    }
    var R = setFor(document.body.dataset.aud);
    if (!R.length) return;

    var MONTH = ['января','февраля','марта','апреля','мая','июня',
                 'июля','августа','сентября','октября','ноября','декабря'];
    function human(iso) {
      var d = new Date(iso);
      return d.getDate() + ' ' + MONTH[d.getMonth()] + ' ' + d.getFullYear();
    }
    function stars(n) {
      var out = '';
      for (var i = 1; i <= 5; i++) {
        out += '<svg class="ico' + (i <= n ? '' : ' off') + '"><use href="#i-star"/></svg>';
      }
      return '<span class="rev__stars" aria-label="Оценка ' + n + ' из 5">' + out + '</span>';
    }
    function shot(src, i) {
      /* свой снимок берём как есть; категорию — из каталога */
      if (/[/.]/.test(src) && !inCat(src).length) return src;
      var list = inCat(src);
      var p = list[i % (list.length || 1)];
      return p ? thumb(p.img, 520) : '';
    }

    function draw() {
    box.innerHTML = R.map(function (r, ri) {
      /* в ленте одна фотография; сколько ещё ждёт в окне — говорит метка */
      var all = r.photos || [];
      var src = all.length ? shot(all[0], ri) : '';
      var rest = Math.max(all.length - 1, 0);
      var pics = src
        ? '<button class="rev__shot" type="button" data-r="' + ri + '"' +
            ' aria-label="Открыть отзыв целиком">' +
            '<img src="' + src + '" alt="Работа для клиента: ' + esc(r.item) + '" loading="lazy" decoding="async">' +
            (rest ? '<span class="rev__plus">+' + rest + ' фото</span>' : '') +
          '</button>'
        : '';
      return '<article class="rev">' +
        '<header class="rev__hd">' +
          '<b>' + esc(r.name) + '</b>' + stars(r.stars) +
          '<time datetime="' + r.date + '">' + human(r.date) + '</time>' +
        '</header>' +
        '<p class="rev__item">' + esc(r.item) + '</p>' +
        '<p class="rev__txt">' + esc(r.text) + '</p>' +
        (pics ? '<div class="rev__pics">' + pics + '</div>' : '') +
        '<button class="rev__more" type="button" data-r="' + ri + '">Подробнее' +
          '<svg class="ico"><use href="#i-arrow"/></svg></button>' +
      '</article>';
    }).join('');
    }
    draw();
    /* переключение версии перерисовывает ленту */
    document.addEventListener('orion:aud', function (e) {
      R = setFor(e.detail);
      if (R.length) { draw(); box.scrollLeft = 0; edges(); }
    });

    var dlg = $('#revDlg'), dIn = $('#revDlgIn');
    function openReview(i) {
      var r = R[i];
      if (!r || !dlg) return;
      var gallery = (r.photos || []).map(function (c, k) {
        var src = shot(c, i + k);
        return src ? '<img src="' + src + '" alt="Работа для клиента: ' + esc(r.item) + '" loading="lazy">' : '';
      }).join('');
      dIn.innerHTML =
        '<div class="revdlg__txt">' +
          '<header class="rev__hd"><b>' + esc(r.name) + '</b>' + stars(r.stars) +
            '<time datetime="' + r.date + '">' + human(r.date) + '</time></header>' +
          '<p class="rev__item">' + esc(r.item) + '</p>' +
          '<p class="revdlg__full">' + esc(r.full || r.text) + '</p>' +
          (gallery ? '<div class="revdlg__pics">' + gallery + '</div>' : '') +
        '</div>' +
        '<aside class="revdlg__ask">' +
          '<p class="eyebrow">Хотите так же</p>' +
          '<p class="revdlg__lead">Посчитаем вашу мебель по этому же проекту и в ваших размерах. Замер бесплатный.</p>' +
          '<form class="form" id="revForm" novalidate>' +
            '<input type="hidden" name="source" value="Хочу также: ' + esc(r.item) + '">' +
            '<div class="field"><label for="rv-name">Ваше имя</label>' +
              '<input id="rv-name" name="name" required autocomplete="name" placeholder="Например, Алексей"></div>' +
            '<div class="field"><label for="rv-tel">Ваш телефон</label>' +
              '<input id="rv-tel" name="phone" type="tel" inputmode="tel" required autocomplete="tel" placeholder="+7 (___) ___-__-__"></div>' +
            '<label class="check"><input type="checkbox" required><span>Согласен(а) с ' +
              '<a href="#privacy">политикой конфиденциальности</a> и обработки персональных данных</span></label>' +
            '<button class="btn btn--lg btn--wide" type="submit">' +
              '<span class="btn__t">Хочу также</span>' +
              '<svg class="ico ico--next"><use href="#i-up-right"/></svg>' +
              '<span class="btn__c"><svg class="ico"><use href="#i-up-right"/></svg></span></button>' +
            '<p class="form__ok" hidden><svg class="ico"><use href="#i-check"/></svg>' +
              'Заявка отправлена. Менеджер свяжется с вами в течение часа.</p>' +
          '</form>' +
        '</aside>';
      bindForm($('#revForm', dIn));
      if (dlg.showModal) dlg.showModal();
    }
    box.addEventListener('click', function (e) {
      var b = e.target.closest('.rev__more, .rev__shot');
      if (b) openReview(+b.dataset.r);
    });
    if (dlg) {
      $('#revClose').addEventListener('click', function () { dlg.close(); });
      dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    }

    /* колесо мыши листает ряд вбок, страница при этом стоит на месте */
    box.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      var can = box.scrollWidth - box.clientWidth;
      if (can < 4) return;
      var next = box.scrollLeft + e.deltaY;
      if (next > 0 && next < can) { e.preventDefault(); box.scrollLeft = next; }
    }, { passive: false });

    function step(dir) {
      var card = $('.rev', box);
      var w = card ? card.getBoundingClientRect().width + 14 : 320;
      box.scrollBy({ left: dir * w, behavior: reduce ? 'auto' : 'smooth' });
    }
    var nav = $('#revNav');
    if (nav) nav.addEventListener('click', function (e) {
      var b = e.target.closest('[data-d]');
      if (b) step(+b.dataset.d);
    });
    box.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    });

    function edges() {
      var can = box.scrollWidth - box.clientWidth;
      box.classList.toggle('at-start', box.scrollLeft < 8);
      box.classList.toggle('at-end', box.scrollLeft > can - 8);
    }
    box.addEventListener('scroll', edges, { passive: true });
    window.addEventListener('resize', edges);
    edges();
  }

  /* ---- просмотр фотографий работы ---------------------------------------
     Клик по кадру в карточке открывает окно: крупное фото, стрелки, миниатюры,
     клавиши и свайп. Источник — те же снимки, что лежат в карточке. */
  function initGallery() {
    var dlg = $('#galDlg');
    if (!dlg) return;
    var W = window.ORION_WORKS || [];
    var img = $('#galImg'), thumbs = $('#galThumbs');
    var list = [], at = 0, title = '';

    function show(i) {
      if (!list.length) return;
      at = (i + list.length) % list.length;
      img.src = list[at];
      img.alt = title + ' — фото ' + (at + 1) + ' из ' + list.length;
      $('#galCount').textContent = (at + 1) + ' / ' + list.length;
      $$('.gal__t', thumbs).forEach(function (t, k) {
        t.classList.toggle('on', k === at);
        if (k === at) t.setAttribute('aria-current', 'true');
        else t.removeAttribute('aria-current');
      });
    }

    function open(wi, pi) {
      var w = W[wi];
      if (!w || !w.photos || !w.photos.length) return;
      list = w.photos.slice();
      title = w.title;
      $('#galTitle').textContent = w.title;
      thumbs.innerHTML = list.map(function (src, k) {
        return '<button class="gal__t" type="button" data-i="' + k + '"' +
          ' aria-label="Фото ' + (k + 1) + '">' +
          '<img src="' + src + '" alt="" loading="lazy"></button>';
      }).join('');
      show(pi || 0);
      if (dlg.showModal) dlg.showModal();
      $('#galClose').focus();
    }

    /* карточка работы: клик по кадру открывает просмотр,
       клик по точке листает прямо в карточке */
    document.addEventListener('click', function (e) {
      var t = e.target.closest('.work__img img, .work__open');
      if (t) {
        var card = t.closest('.work');
        var imgs = $$('img', card);
        var cur = imgs.findIndex(function (im) { return !im.hidden; });
        open(+card.dataset.w, Math.max(cur, 0));
        return;
      }
      var dot = e.target.closest('.work__dots button');
      if (dot) {
        var c = dot.closest('.work');
        var all = $$('img', c), dots = $$('.work__dots button', c);
        var n = +dot.dataset.i;
        all.forEach(function (im, k) { im.hidden = k !== n; });
        dots.forEach(function (d, k) { d.classList.toggle('on', k === n); });
      }
    });

    dlg.addEventListener('click', function (e) {
      var nav = e.target.closest('.gal__nav');
      if (nav) return show(at + (+nav.dataset.d));
      var th = e.target.closest('.gal__t');
      if (th) return show(+th.dataset.i);
      if (e.target.closest('#galClose') || e.target === dlg) dlg.close();
    });
    dlg.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); show(at + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(at - 1); }
    });

    /* свайп по кадру */
    var x0 = null;
    $('#galStage').addEventListener('pointerdown', function (e) { x0 = e.clientX; });
    $('#galStage').addEventListener('pointerup', function (e) {
      if (x0 === null) return;
      var dx = e.clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 40) show(at + (dx < 0 ? 1 : -1));
    });
  }

  function initWorks() {
    var box = $('#worksGrid');
    var all = window.ORION_WORKS || [];
    if (!box || !all.length) return;

    /* страница кухонь показывает кухни, страница шкафов — шкафы,
       главная — всё подряд, лентой с прокруткой вбок */
    var kind = box.dataset.kind;
    var sw = $('#worksSwitch');
    /* на главной тумблер «Кухни / Шкафы» выбирает, что показывать */
    if (!kind && sw) kind = sw.dataset.kind;

    function render() {
      var W = kind ? all.filter(function (w) { return w.kind === kind; }) : all;
      box.innerHTML = W.map(function (w, i) {
        return '<article class="work reveal" data-w="' + i + '">' +
          '<span class="work__img" role="button" tabindex="0" aria-label="Открыть фотографии: ' + esc(w.title) + '">' +
            w.photos.map(function (src, k) {
              return '<img src="' + src + '" alt="' + esc(w.title + (w.visualization ? ' — визуализация' : '')) + '"' +
                     (k ? ' hidden' : '') + ' loading="' + (i < 2 && !k ? 'eager' : 'lazy') + '">';
            }).join('') +
            (w.photos.length > 1
              ? '<span class="work__dots">' + w.photos.map(function (_, k) {
                  return '<button type="button" data-i="' + k + '"' +
                    (k ? '' : ' class="on"') + ' aria-label="Фото ' + (k + 1) + '"></button>';
                }).join('') + '</span>' +
                '<button class="work__nav work__nav--prev" type="button" aria-label="Предыдущее фото"><svg class="ico"><use href="#i-arrow"/></svg></button>' +
                '<button class="work__nav work__nav--next" type="button" aria-label="Следующее фото"><svg class="ico"><use href="#i-arrow"/></svg></button>'
              : '') +
          '</span>' +
          '<div class="work__body">' +
            '<h3>' + w.title + '</h3>' +
            ((w.spec && w.spec.length)
              ? '<dl class="work__spec">' + w.spec.map(function (s) {
                  return '<div><dt>' + s[0] + '</dt><dd>' + s[1] + '</dd></div>';
                }).join('') + '</dl>'
              : '') +
            '<div class="work__foot">' +
              (w.visualization ? '<span>Визуализация</span>' : '') +
              (w.area ? '<span>' + w.area + '</span>' : '') +
              (w.days ? '<span>' + w.days + '</span>' : '') +
              '<b>' + w.price + '</b></div>' +
          '</div></article>';
      }).join('');
      box.scrollLeft = 0;
      observe($$('.work', box));
      if (typeof edges === 'function') edges();
    }

    if (!all.some(function (w) { return !kind || w.kind === kind; })) return;

    /* галерея внутри карточки: стрелки и точки листают фото */
    box.addEventListener('click', function (e) {
      var nav = e.target.closest('.work__nav');
      if (!nav) return;
      var card = nav.closest('.work');
      var imgs = $$('img', card), dots = $$('.work__dots button', card);
      var cur = imgs.findIndex(function (im) { return !im.hidden; });
      if (cur < 0) cur = 0;
      var next = (cur + (nav.classList.contains('work__nav--next') ? 1 : -1) + imgs.length) % imgs.length;
      imgs.forEach(function (im, k) { im.hidden = k !== next; });
      dots.forEach(function (d, k) { d.classList.toggle('on', k === next); });
    });

    /* стрелки листают ленту на ширину карточки */
    var nav = $('#worksNav');
    if (nav) {
      nav.addEventListener('click', function (e) {
        var b = e.target.closest('[data-d]');
        if (!b) return;
        var card = $('.work', box);
        var step = card ? card.getBoundingClientRect().width + 18 : 320;
        box.scrollBy({ left: (+b.dataset.d) * step, behavior: reduce ? 'auto' : 'smooth' });
      });
      window.addEventListener('resize', edges);
    }
    function edges() {
      if (!nav) return;
      var can = box.scrollWidth - box.clientWidth;
      nav.hidden = can < 8;
    }

    render();

    if (sw) {
      sw.addEventListener('click', function (e) {
        var b = e.target.closest('.wsw__btn');
        if (!b || b.dataset.k === kind) return;
        kind = b.dataset.k;
        sw.dataset.kind = kind;
        $$('.wsw__btn', sw).forEach(function (x) {
          var on = x === b;
          x.classList.toggle('is-on', on);
          x.setAttribute('aria-selected', String(on));
        });
        render();
      });
    }
  }

  function initPhotos() {
    renderShelf(document.body.dataset.aud || 'private');
    setHeroImage(document.body.dataset.aud || 'private');

    /* одиночные фотографии внутри разделов */
    var singles = {
      1: byTitle('Кухонный гарнитур «Mint & Wood»') || inCat('Кухни')[0],
      2: byTitle('Мебельный комплекс «Нордик-Студио»') || inCat('Гостинная')[0],
      3: inCat('Мебель для организаций')[0],
      4: null
    };
    /* фоны восьми обязательств и три шага сотрудничества — снимки
       заказчика. Средний кадр этапов вертикальный: он лежит фоном
       высокой тёмной карточки */
    var shopFloor = {
      s1: 'img/stages/1.jpg', s3: 'img/stages/2.jpg', s5: 'img/stages/3.jpg'
    };
    for (var bi = 1; bi <= 8; bi++) shopFloor['b' + bi] = 'img/promise/' + bi + '.jpg';

    $$('[data-photo]').forEach(function (img) {
      var key = img.dataset.photo;
      if (key === '4') { img.src = 'img/nanxing.png'; return; }
      if (shopFloor[key]) { img.src = shopFloor[key]; return; }
      var p = singles[key];
      if (!p) { img.closest('.get__img, .ben--photo') && img.closest('.get__img, .ben--photo').remove(); return; }
      img.src = thumb(p.img, 900);
      if (!img.alt) img.alt = p.title;
    });

    /* полосы из четырёх работ */
    function strip(el, titles, fallbackCat) {
      if (!el) return;
      var list = titles.map(byTitle).filter(Boolean);
      var pool = inCat(fallbackCat);
      while (list.length < 4 && pool.length) {
        var n = pool.shift();
        if (list.indexOf(n) < 0) list.push(n);
      }
      while (list.length < 4 && P.length) {
        var m = P[list.length * 3 % P.length];
        if (list.indexOf(m) < 0) list.push(m); else break;
      }
      el.innerHTML = list.slice(0, 4).map(function (p) {
        return '<figure><img src="' + thumb(p.img, 560) + '" alt="' + esc(p.title) + '" loading="lazy">' +
          '<figcaption>' + p.title + '</figcaption></figure>';
      }).join('');
    }
    strip($('#stripPromo'), ['Кухонный гарнитур «Nordic Wood» (угловой)', 'Кухонный модуль «Country White»',
      'Кухонный шкаф-буфет «Smart Coffee Station»', 'Кухонный модуль «Country Side»'], 'Кухни');
    strip($('#stripPartners'), ['Стеллаж «Matrix Graphite»', 'Прихожая-гардероб «Монако-Глэйд»',
      'Гостиная «Графит»', 'Детский мебельный сет «Лесная Сказка»'], 'Стеллажи');
  }

  /* ---------------------------------------------------------
     10. Быстрый просмотр карточки
     --------------------------------------------------------- */
  function initQuickView() {
    var dlg = $('#pv');
    if (!dlg || !dlg.showModal) return;
    function open(id) {
      var p = P.filter(function (x) { return x.id === id; })[0];
      if (!p) return;
      $('.pv__in', dlg).innerHTML =
        '<div class="pv__img"><img src="' + thumb(p.img, 900) + '" alt="' + esc(p.title) + '"></div>' +
        '<div class="pv__txt">' +
          '<p class="pv__cat">' + (CAT_SHORT[p.cats[0]] || p.cats[0] || 'Мебель') + '</p>' +
          '<h3 class="pv__t">' + p.title + '</h3>' +
          '<p class="pv__p">от ' + money(p.price) + '</p>' +
          '<p class="pv__d">' + p.text + '</p>' +
          '<button class="btn" type="button" data-modal="Похожая мебель: ' + esc(p.title) + '">' +
            '<span class="btn__t">Рассчитать в моих размерах</span>' +
            '<span class="btn__c"><svg class="ico"><use href="#i-up-right"/></svg></span></button>' +
        '</div>';
      dlg.showModal();
    }
    document.addEventListener('click', function (e) {
      var c = e.target.closest('.card, .shelf__i');
      if (c) { open(c.dataset.id); return; }
      if (e.target.closest('#pvClose')) dlg.close();
    });
    document.addEventListener('keydown', function (e) {
      var c = e.target.closest && e.target.closest('.card');
      if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(c.dataset.id); }
    });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  }

  /* ---------------------------------------------------------
     11. Модалка заявки — все CTA открывают её, а не якорь
     --------------------------------------------------------- */
  function initModal() {
    var dlg = $('#modal');
    if (!dlg) return;
    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-modal]');
      if (t) {
        e.preventDefault();
        var label = t.dataset.modal;
        $('#modalT').textContent = label;
        $('#modalSource').value = label;
        var f = $('#modalForm');
        f.querySelector('.form__ok').hidden = true;
        f.querySelector('button[type="submit"]').disabled = false;
        if ($('#pv').open) $('#pv').close();
        if (dlg.showModal) dlg.showModal(); else location.hash = '#zayavka';
        return;
      }
      if (e.target.closest('#modalClose')) dlg.close();
    });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
  }

  /* ---------------------------------------------------------
     12. Квиз
     --------------------------------------------------------- */
  var QUIZ = [
    { q: 'Какую мебель вы подбираете?', opts: [
      { t: 'Кухню', s: 'Гарнитур под вашу планировку', cat: 'Кухни', pic: 'img/quiz/kuhnya.jpg' },
      { t: 'Шкаф или гардероб', s: 'Прихожая, спальня, гардеробная', cat: 'Прихожая' },
      { t: 'Гостиную или стеллаж', s: 'ТВ-зона, системы хранения', cat: 'Гостинная' },
      { t: 'Мебель для бизнеса', s: 'Офис, детская, организации', cat: 'Мебель для организаций' }
    ] },
    /* Планировки: фотография ложится поверх схемы, схема остаётся запаской,
       если снимок не загрузится */
    { q: 'Какая планировка помещения?', plain: false, shapes: true, opts: [
      { t: 'Прямая', s: 'Вдоль одной стены', shape: 'line', pic: 'img/quiz/plan/pryamaya.jpg' },
      { t: 'Угловая', s: 'Г-образная', shape: 'corner', pic: 'img/quiz/plan/uglovaya.jpg' },
      { t: 'П-образная', s: 'С трёх сторон', shape: 'u', pic: 'img/quiz/plan/p-obraznaya.jpg' },
      { t: 'С островом', s: 'Отдельный модуль', shape: 'island', pic: 'img/quiz/plan/s-ostrovom.jpg' }
    ] },
    { q: 'Какой бюджет рассматриваете?', plain: true, opts: [
      { t: 'До 60 000 ₽', s: 'Компактные решения' },
      { t: '60 000 — 120 000 ₽', s: 'Средний сегмент' },
      { t: '120 000 — 250 000 ₽', s: 'Комплексные проекты' },
      { t: 'Больше 250 000 ₽', s: 'Проект под ключ' }
    ] },
    { q: 'Как быстро нужна мебель?', plain: true, opts: [
      { t: 'Срочно, до 2 недель', s: 'Приоритетное производство' },
      { t: 'В течение месяца', s: 'Стандартный срок' },
      { t: 'Через 1-2 месяца', s: 'Идёт ремонт' },
      { t: 'Пока просто считаю', s: 'Нужен ориентир по цене' }
    ] },
    { q: 'Готов ли чертёж или размеры?', plain: true, opts: [
      { t: 'Есть чертёж от дизайнера', s: 'Посчитаем по вашему макету' },
      { t: 'Есть примерные размеры', s: 'Уточним на замере' },
      { t: 'Нужен бесплатный замер', s: 'Приедем с образцами' },
      { t: 'Нужна помощь с проектом', s: 'Конструкторское бюро поможет' }
    ] }
  ];
  var SHAPES = {
    line: '<svg viewBox="0 0 100 60" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"><rect x="12" y="12" width="76" height="14" rx="3"/><rect x="12" y="34" width="76" height="14" rx="3"/></svg>',
    corner: '<svg viewBox="0 0 100 60" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"><path d="M14 12h60v14H28v22H14z"/><rect x="34" y="34" width="52" height="14" rx="3"/></svg>',
    u: '<svg viewBox="0 0 100 60" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"><path d="M14 48V12h72v36"/><rect x="26" y="26" width="48" height="10" rx="3"/></svg>',
    island: '<svg viewBox="0 0 100 60" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"><rect x="12" y="10" width="76" height="12" rx="3"/><rect x="28" y="36" width="44" height="14" rx="3"/></svg>'
  };
  var answers = [];
  var qi = 0;

  function quizPhoto(cat) {
    var list = inCat(cat);
    return list.length ? thumb(list[0].img, 560) : '';
  }

  /* Пока идёт первый вопрос, тихо подгружаем кадры следующего шага —
     чтобы при переходе они уже были готовы и ничего не мигало. */
  var quizWarmed = false;
  function warmQuiz() {
    if (quizWarmed) return;
    quizWarmed = true;
    QUIZ.forEach(function (step) {
      (step.opts || []).forEach(function (o) {
        if (o.pic) { var im = new Image(); im.src = o.pic; }
      });
    });
  }

  function renderQuiz() {
    var body = $('#quizBody');
    if (!body) return;
    $('#quizStep').textContent = 'Шаг ' + (qi + 1) + ' из ' + QUIZ.length;
    $('#quizBar').style.width = ((qi + 1) / QUIZ.length * 100) + '%';

    if (qi >= QUIZ.length) {
      $('#quizStep').textContent = 'Готово';
      body.innerHTML =
        '<h3 class="quiz__q">Спасибо, ответы записаны</h3>' +
        '<div class="quiz__sum">' + answers.map(function (a) { return '<span>' + a + '</span>'; }).join('') + '</div>' +
        '<p class="quiz__hint" style="margin-bottom:16px">Оставьте контакт — пришлём подборку похожих проектов с ценами и точный расчёт под ваши размеры.</p>' +
        '<button class="btn btn--lg" type="button" data-modal="Подбор мебели по квизу">' +
          '<span class="btn__t">Получить подборку и расчёт</span>' +
          '<span class="btn__c"><svg class="ico"><use href="#i-up-right"/></svg></span></button>' +
        '<p class="quiz__hint" style="margin-top:14px"><button class="tlink" type="button" id="quizRestart">Пройти заново<svg class="ico"><use href="#i-arrow"/></svg></button></p>';
      $('#quizRestart').addEventListener('click', function () { qi = 0; answers = []; renderQuiz(); });
      return;
    }

    warmQuiz();

    var step = QUIZ[qi];
    var opts = step.opts.map(function (o, i) {
      var media = '';
      if (step.shapes) {
        /* Схема скрыта и ждёт своего часа: показываем её только если снимок
           не загрузился. Иначе при переходе на шаг чертёж успевал мигнуть
           зелёным до того, как поверх ляжет фотография. */
        media = '<span class="qopt__img qopt__img--plan' + (o.pic ? '' : ' no-photo') + '">' +
          SHAPES[o.shape] +
          (o.pic ? '<img src="' + o.pic + '" alt="' + esc(o.t) + ' планировка"' +
            ' onerror="this.parentNode.classList.add(&quot;no-photo&quot;);this.remove()">' : '') +
          '</span>';
      }
      else if (o.pic || o.cat) {
        /* свой снимок, если он есть; иначе подставляем кадр из каталога */
        var src = o.pic || quizPhoto(o.cat);
        if (src) media = '<span class="qopt__img"><img src="' + src + '" alt="' + esc(o.t) + '" loading="lazy"></span>';
      }
      return '<button class="qopt' + (step.plain ? ' qopt--plain' : '') + '" type="button" data-i="' + i + '">' +
        media + '<span class="qopt__b"><b>' + o.t + '</b><span>' + o.s + '</span></span></button>';
    }).join('');

    body.innerHTML =
      '<h3 class="quiz__q">' + step.q + '</h3>' +
      '<div class="quiz__opts">' + opts + '</div>' +
      '<div class="quiz__foot"><span class="quiz__hint">Никаких обязательств, займёт 3 минуты</span>' +
        (qi > 0 ? '<button class="tlink" type="button" id="quizBack">Назад</button>' : '<span></span>') +
      '</div>';

    $$('.qopt', body).forEach(function (b) {
      b.addEventListener('click', function () {
        answers[qi] = step.opts[+b.dataset.i].t;
        $$('.qopt', body).forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        setTimeout(function () { qi++; renderQuiz(); }, 220);
      });
    });
    var back = $('#quizBack');
    if (back) back.addEventListener('click', function () { qi--; renderQuiz(); });
  }

  /* ---------------------------------------------------------
     13. Темы вопроса в блоке «напишите нам»
     --------------------------------------------------------- */
  function initTopics() {
    var box = $('#topics'), ta = $('#a-msg');
    if (!box || !ta) return;
    box.addEventListener('click', function (e) {
      var b = e.target.closest('.topic');
      if (!b) return;
      var on = b.classList.contains('on');
      $$('.topic', box).forEach(function (x) { x.classList.remove('on'); });
      if (on) { ta.value = ''; return; }
      b.classList.add('on');
      ta.value = b.dataset.topic + ' ';
      ta.focus();
    });
  }

  /* ---------------------------------------------------------
     14. Формы: маска телефона, UTM-метки и отправка заявки
     --------------------------------------------------------- */
  var LEAD_ENDPOINT = 'https://functions.yandexcloud.net/d4e4n1knbv7cp1vb4gb5';
  var LEAD_ACCESS_KEY = '0e79586d3a5d42d157f309f984797aeb516ba65b077baae9';

  /* UTM-метки цепляются из адресной строки при заходе и живут во вкладке
     до отправки формы — человек может погулять по сайту до заявки, метки
     первого захода не должны потеряться. Новые UTM в адресе (например,
     пришли по другой ссылке в этой же вкладке) заменяют старые целиком. */
  function captureUtm() {
    var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    var params = new URLSearchParams(location.search);
    var found = {};
    var any = false;
    keys.forEach(function (k) {
      var v = params.get(k);
      if (v) { found[k] = v; any = true; }
    });
    if (any) {
      try { sessionStorage.setItem('orion:utm', JSON.stringify(found)); } catch (e) {}
    }
  }
  function getUtm() {
    try { return JSON.parse(sessionStorage.getItem('orion:utm') || '{}'); } catch (e) { return {}; }
  }

  function audLabel(aud) {
    return aud === 'wholesale' ? 'Оптовый клиент' : 'Частный клиент';
  }

  function maskPhone(v) {
    var d = v.replace(/\D/g, '').replace(/^8/, '7').replace(/^([^7])/, '7$1').slice(0, 11);
    if (!d) return '';
    var out = '+7';
    if (d.length > 1) out += ' (' + d.slice(1, 4);
    if (d.length >= 5) out += ') ' + d.slice(4, 7);
    if (d.length >= 8) out += '-' + d.slice(7, 9);
    if (d.length >= 10) out += '-' + d.slice(9, 11);
    return out;
  }
  /* Одна проверка на все формы, включая те, что скрипт создаёт позже. */
  function bindForm(f) {
    if (!f || f.dataset.bound) return;
    f.dataset.bound = '1';
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = false;
      $$('input[required], textarea[required]', f).forEach(function (i) {
        var ok = i.type === 'checkbox' ? i.checked : i.value.trim().length > (i.type === 'tel' ? 15 : 1);
        i.setAttribute('aria-invalid', String(!ok));
        if (!ok && !bad) { i.focus(); bad = true; }
      });
      if (bad) return;

      var nameEl = f.querySelector('[name="name"]');
      var phoneEl = f.querySelector('[name="phone"]');
      var questionEl = f.querySelector('[name="question"]');
      var checkEl = f.querySelector('input[type="checkbox"]');
      var srcEl = f.querySelector('[name="source"]');
      var from = srcEl && srcEl.value ? srcEl.value : (f.id === 'askForm' ? 'Вопрос на главной' : '');
      var utm = getUtm();

      var payload = {
        access_key: LEAD_ACCESS_KEY,
        'Имя': nameEl ? nameEl.value.trim() : '',
        'Телефон': phoneEl ? phoneEl.value.trim() : '',
        'UTM_Source': utm.utm_source || '',
        'UTM_Medium': utm.utm_medium || '',
        'UTM_Campaign': utm.utm_campaign || '',
        'UTM_Content': utm.utm_content || '',
        'UTM_Term': utm.utm_term || '',
        'Согласие на обработку ПДн': checkEl && checkEl.checked ? 'да' : 'нет',
        'Тип клиента': audLabel(document.body.dataset.aud),
        'Откуда заявка': from,
        'Вопрос': questionEl ? questionEl.value.trim() : '',
        'Страница': location.pathname,
      };

      var btn = f.querySelector('button[type="submit"]');
      btn.disabled = true;

      fetch(LEAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).then(function (r) {
        if (!r.ok) throw new Error('lead endpoint status ' + r.status);
        f.querySelector('.form__ok').hidden = false;
        /* Заявка принята — уводим на страницу «спасибо». Что именно человек
           отправлял, кладём в хранилище: адресную строку сервер может почистить. */
        try { sessionStorage.setItem('orion:from', from); } catch (e) {}
        var q = from ? '?from=' + encodeURIComponent(from) : '';
        setTimeout(function () { location.href = '/thanks_for_your_application' + q; }, 500);
      }).catch(function (err) {
        console.error('[orion] lead submit failed:', err);
        btn.disabled = false;
        alert('Не получилось отправить заявку. Попробуйте ещё раз или напишите нам в WhatsApp/MAX.');
      });
    });
  }

  function goal(name) {
    try { if (typeof ym === 'function') ym(108252333, 'reachGoal', name); } catch (e) {}
  }

  /* клики по мессенджерам и телефону — отдельные цели в Метрике,
     чтобы видеть, через какой канал уходят обращения */
  function initAnalyticsClicks() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href]');
      if (!a) return;
      var href = a.getAttribute('href');
      if (href.indexOf('wa.me/') > -1) return goal('click_whatsapp');
      if (href.indexOf('max.ru/') > -1) return goal('click_max');
      if (href.indexOf('tel:') === 0) return goal('click_phone');
    });
  }

  /* Страница «спасибо» знает, откуда пришёл человек, и говорит об этом. */
  function initThanks() {
    var el = $('#tyWhat');
    if (!el) return;
    goal('lead_submitted');
    var from = '';
    var m = /[?&]from=([^&]+)/.exec(location.search);
    if (m) from = decodeURIComponent(m[1].split('+').join(' '));
    if (!from) { try { from = sessionStorage.getItem('orion:from') || ''; } catch (e) {} }
    try { sessionStorage.removeItem('orion:from'); } catch (e) {}
    if (!from) return;
    el.innerHTML = 'Заявка: <b>' + esc(from).replace(/</g, '&lt;') + '</b>. ' +
      'Менеджер конструкторского бюро перезвонит и уточнит размеры, материалы и сроки. ' +
      'Ничего оплачивать сейчас не нужно.';
  }

  function initForms() {
    document.addEventListener('input', function (e) {
      if (e.target.matches('input[type="tel"]')) e.target.value = maskPhone(e.target.value);
    });
    $$('form').forEach(bindForm);
  }

  /* Увертюра стартует, когда шрифты готовы и полка уже отрисована,
     иначе карточки поехали бы вразнобой с текстом. */
  function intro() {
    var root = document.documentElement, fired = false;
    function go() {
      if (fired) return; fired = true;
      requestAnimationFrame(function () { root.classList.add('go'); });
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go);
    setTimeout(go, 550);
  }

  /* --------------------------------------------------------- */
  function boot() {
    captureUtm();
    intro();
    initMarquee(); initFlow(); initStack(); initWorks(); initGallery(); initReviews(); initShuffle(); initCoverflow(); initCalc(); initPhotos(); initCatalog(); renderQuiz();
    initReveal(); initScroll(); initSwitch(); initBurger(); initAnalyticsClicks();
    initCounters(); initQuickView(); initModal(); initTopics(); initForms(); initThanks();
    audRestore();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
