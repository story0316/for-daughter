(() => {
  'use strict';

  const GAMES = [
    {
      href: 'hidden-picture/index.html',
      emoji: '✨',
      title: '반짝반짝 그림찾기',
      desc: '벚꽃길에 숨은 그림을 찾아보세요',
      theme: 'pink',
    },
    {
      href: 'multiplication-quiz/index.html',
      emoji: '🧮',
      title: '구구단 맞추기',
      desc: '하트 3개! 구구단에 도전해요',
      theme: 'purple',
    },
    {
      href: 'sudoku/index.html',
      emoji: '🔢',
      title: '스도쿠',
      desc: '9×9 칸을 1~9로 채워보세요',
      theme: 'blue',
    },
  ];

  // 앞뒤에 클론을 하나씩 붙여서 좌우로 끝없이 도는 캐러셀을 만든다.
  const slidesData = [GAMES[GAMES.length - 1], ...GAMES, GAMES[0]];

  const track = document.getElementById('track');
  const dotsWrap = document.getElementById('dots');
  const arrowLeft = document.getElementById('arrow-left');
  const arrowRight = document.getElementById('arrow-right');

  let index = 1; // slidesData 기준 현재 위치 (1 ~ GAMES.length가 실제 카드)
  let dragStartX = 0;
  let dragDeltaX = 0;
  let dragging = false;
  let dragMoved = false;

  function renderSlides() {
    track.innerHTML = '';
    slidesData.forEach((game) => {
      const slide = document.createElement('div');
      slide.className = `slide theme-${game.theme}`;
      slide.innerHTML = `
        <div class="slide-emoji">${game.emoji}</div>
        <h1 class="slide-title">${game.title}</h1>
        <p class="slide-desc">${game.desc}</p>
        <a class="slide-play" href="${game.href}">▶ 시작하기</a>
      `;
      track.appendChild(slide);
    });
  }

  function renderDots() {
    dotsWrap.innerHTML = '';
    GAMES.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'dot';
      dot.addEventListener('click', () => goToSlide(i + 1));
      dotsWrap.appendChild(dot);
    });
  }

  function realIndexOf(i) {
    return ((i - 1) % GAMES.length + GAMES.length) % GAMES.length;
  }

  function updateDots() {
    const active = realIndexOf(index);
    [...dotsWrap.children].forEach((dot, i) => {
      dot.classList.toggle('active', i === active);
    });
  }

  function updateTrack(withTransition) {
    track.style.transition = withTransition ? 'transform 0.35s ease' : 'none';
    track.style.transform = `translateX(-${index * 100}%)`;
  }

  function goToSlide(target) {
    index = target;
    updateTrack(true);
    updateDots();
  }

  function goTo(delta) {
    goToSlide(index + delta);
  }

  track.addEventListener('transitionend', () => {
    if (index === slidesData.length - 1) {
      index = 1;
      updateTrack(false);
    } else if (index === 0) {
      index = slidesData.length - 2;
      updateTrack(false);
    }
  });

  arrowLeft.addEventListener('click', () => goTo(-1));
  arrowRight.addEventListener('click', () => goTo(1));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') goTo(-1);
    if (e.key === 'ArrowRight') goTo(1);
  });

  // ---- 드래그 / 스와이프 ----
  function onPointerDown(e) {
    dragging = true;
    dragMoved = false;
    dragDeltaX = 0;
    dragStartX = e.clientX;
    track.style.transition = 'none';
  }

  function onPointerMove(e) {
    if (!dragging) return;
    dragDeltaX = e.clientX - dragStartX;
    if (Math.abs(dragDeltaX) > 5) dragMoved = true;
    track.style.transform = `translateX(calc(-${index * 100}% + ${dragDeltaX}px))`;
  }

  function onPointerUp() {
    if (!dragging) return;
    dragging = false;
    const threshold = track.clientWidth * 0.15;
    if (dragDeltaX <= -threshold) {
      goTo(1);
    } else if (dragDeltaX >= threshold) {
      goTo(-1);
    } else {
      updateTrack(true);
    }
    dragDeltaX = 0;
  }

  track.addEventListener('pointerdown', onPointerDown);
  track.addEventListener('pointermove', onPointerMove);
  track.addEventListener('pointerup', onPointerUp);
  track.addEventListener('pointerleave', onPointerUp);

  // 스와이프 도중에는 카드의 링크 클릭(시작하기 버튼 이동)이 발생하지 않도록 막는다.
  track.addEventListener(
    'click',
    (e) => {
      if (dragMoved) {
        e.preventDefault();
        e.stopPropagation();
        dragMoved = false;
      }
    },
    true
  );

  renderSlides();
  renderDots();
  updateTrack(false);
  updateDots();
})();
