document.addEventListener("visibilitychange", function () {
    if (document.hidden) document.title = "Ivan R | Come back!";
    else document.title = "Ivan R | Portfolio";
});

document.addEventListener('DOMContentLoaded', () => {
    function scrollToElement(targetY, duration) {
        const startY = window.scrollY;
        const distance = targetY - startY;
        const startTime = performance.now();

        function scroll() {
            const elapsedTime = performance.now() - startTime;
            const progress = Math.min(elapsedTime / duration, 1);
            const easing = easeInOutQuad(progress);
            window.scrollTo(0, startY + distance * easing);

            if (progress < 1) {
                requestAnimationFrame(scroll);
            }
        }

        requestAnimationFrame(scroll);
    }

    function easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    function handleNavClick(event) {
        event.preventDefault();
        const targetId = this.getAttribute('href').substring(1);
        const targetElement = document.getElementById(targetId);

        if (targetElement) {
            const targetY = targetElement.offsetTop;
            scrollToElement(targetY, 1000);
        }
    }

    function handleScrollDownClick() {
        const nextSectionId = this.getAttribute("aria-label");
        const targetElement = document.getElementById(nextSectionId);

        if (targetElement) {
            const targetY = targetElement.offsetTop;
            scrollToElement(targetY, 1000);
        }
    }

    function handleScrollToTopClick() {
        scrollToElement(0, 1000);
    }

    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => link.addEventListener('click', handleNavClick));

    const scrollDownButtons = document.querySelectorAll('.scroll-down');
    scrollDownButtons.forEach(button => button.addEventListener('click', handleScrollDownClick));

    const scrollToTopButtons = document.querySelectorAll('.scroll-to-top');
    scrollToTopButtons.forEach(button => button.addEventListener('click', handleScrollToTopClick));
});
