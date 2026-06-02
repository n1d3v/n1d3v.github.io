(() => {
    const scroller = document.querySelector('.page-content');
    const links = Array.from(document.querySelectorAll('.navigation-button'));
    const items = links
        .map((link) => {
            const id = (link.getAttribute('href') || '').replace('#', '');
            const section = id ? document.getElementById(id) : null;
            return section ? { link, section } : null;
        })
        .filter(Boolean);

    if (!scroller || items.length === 0) return;
    const homeLink = items[0].link;
    const canScroll = () => scroller.scrollHeight - scroller.clientHeight > 1;

    let lockedLink = null;

    const select = (activeLink) => {
        for (const { link } of items) link.classList.toggle('selected', link === activeLink);
    };

    const update = () => {
        if (!canScroll()) return select(homeLink);
        if (lockedLink) return select(lockedLink);

        if (scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2) return select(items[items.length - 1].link);

        const scrollerTop = scroller.getBoundingClientRect().top;
        const line = scroller.clientHeight * 0.3;

        let active = items[0];

        for (const item of items) {
            const top = item.section.getBoundingClientRect().top - scrollerTop;
            if (top <= line) active = item;
        }
        select(active.link);
    };
    const unlock = () => {
        if (!lockedLink) return;
        lockedLink = null;

        update();
    };
    let ticking = false;
    const onScroll = () => {
        if (ticking) return;
        ticking = true;

        requestAnimationFrame(() => {
            update();
            ticking = false;
        });
    };
    for (const { link } of items) {
        link.addEventListener('click', () => {
            if (!canScroll()) return update();
            lockedLink = link;
            select(link);
        });
    }

    const scrollKeys = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];

    scroller.addEventListener('scroll', onScroll, { passive: true });
    scroller.addEventListener('wheel', unlock, { passive: true });
    scroller.addEventListener('touchmove', unlock, { passive: true });

    window.addEventListener('keydown', (e) => { if (scrollKeys.includes(e.key)) unlock(); });
    window.addEventListener('resize', update);
    update();
})();