document.addEventListener('DOMContentLoaded', () => {
    // ═══════════════════════════════════════════ INITIALIZATION ═══════════════════════════════════════════
    // Always start at the top of the page on refresh
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    // ═══════════════════════════════════════════ NAVIGATION ═══════════════════════════════════════════
    const nav = document.getElementById('main-nav');
    const burger = document.getElementById('nav-burger');
    const navLinksContainer = document.getElementById('nav-links');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            nav.classList.add('nav--scrolled');
        } else {
            nav.classList.remove('nav--scrolled');
        }
    });

    if (burger) {
        burger.addEventListener('click', () => {
            burger.classList.toggle('active');
            navLinksContainer.classList.toggle('nav__links--mobile');
            navLinksContainer.classList.toggle('active');
            
            // Lock/Unlock body scroll for better UX
            if (burger.classList.contains('active')) {
                document.body.style.overflow = 'hidden';
            } else {
                document.body.style.overflow = '';
            }
        });

        // Auto-close menu when a link is clicked
        const mobileLinks = navLinksContainer.querySelectorAll('.nav__link');
        mobileLinks.forEach(link => {
            link.addEventListener('click', () => {
                burger.classList.remove('active');
                navLinksContainer.classList.remove('nav__links--mobile');
                navLinksContainer.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }

    // ═══════════════════════════════════════════ TERMINAL ANIMATION ═══════════════════════════════════════════
    const terminalLines = document.querySelectorAll('.terminal__line');
    
    const animateTerminal = () => {
        terminalLines.forEach((line, index) => {
            setTimeout(() => {
                line.classList.add('terminal__line--active');
            }, index * 400);
        });
    };

    // Start terminal animation when in view
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateTerminal();
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    const heroTerminal = document.getElementById('hero-terminal');
    if (heroTerminal) observer.observe(heroTerminal);

    // ═══════════════════════════════════════════ TESTIMONIAL CAROUSEL ═══════════════════════════════════════════
    const track = document.querySelector('.carousel__track');
    const slides = Array.from(document.querySelectorAll('.carousel__slide'));
    const nextButton = document.getElementById('carousel-next');
    const prevButton = document.getElementById('carousel-prev');
    const dotsContainer = document.getElementById('carousel-dots');
    const dots = Array.from(document.querySelectorAll('.carousel__dot'));

    let currentSlideIndex = 0;

    const updateCarousel = (index) => {
        // Move track
        track.style.transform = `translateX(-${index * 100}%)`;
        
        // Update active slide class
        slides.forEach((slide, i) => {
            slide.classList.toggle('carousel__slide--active', i === index);
        });

        // Update dots
        dots.forEach((dot, i) => {
            dot.classList.toggle('carousel__dot--active', i === index);
        });

        currentSlideIndex = index;
    };

    nextButton.addEventListener('click', () => {
        let nextIndex = currentSlideIndex + 1;
        if (nextIndex >= slides.length) nextIndex = 0;
        updateCarousel(nextIndex);
    });

    prevButton.addEventListener('click', () => {
        let prevIndex = currentSlideIndex - 1;
        if (prevIndex < 0) prevIndex = slides.length - 1;
        updateCarousel(prevIndex);
    });

    dotsContainer.addEventListener('click', (e) => {
        const dot = e.target.closest('.carousel__dot');
        if (!dot) return;
        const index = parseInt(dot.dataset.index);
        updateCarousel(index);
    });

    // Auto-play carousel
    let carouselInterval;
    
    const startAutoPlay = () => {
        carouselInterval = setInterval(() => {
            let nextIndex = (currentSlideIndex + 1) % slides.length;
            updateCarousel(nextIndex);
        }, 4500); // 4.5 seconds
    };
    
    const resetAutoPlay = () => {
        clearInterval(carouselInterval);
        startAutoPlay();
    };

    nextButton.addEventListener('click', resetAutoPlay);
    prevButton.addEventListener('click', resetAutoPlay);
    dotsContainer.addEventListener('click', resetAutoPlay);

    startAutoPlay();

    // ═══════════════════════════════════════════ REVEAL ANIMATIONS ═══════════════════════════════════════════
    const revealOnScroll = () => {
        const elements = document.querySelectorAll('.feature-card, .pricing-card, .origin__content');
        
        elements.forEach(el => {
            const rect = el.getBoundingClientRect();
            const isInView = rect.top <= (window.innerHeight * 0.85);
            
            if (isInView) {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }
        });
    };

    // Initial styles for reveal
    const initReveal = () => {
        const elements = document.querySelectorAll('.feature-card, .pricing-card, .origin__content');
        elements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        });
    };

    // ═══════════════════════════════════════════ NUMBER COUNTER ANIMATION ═══════════════════════════════════════════
    const counters = document.querySelectorAll('.counter');
    const speed = 2000; // Total duration in ms

    const animateCounters = () => {
        counters.forEach(counter => {
            const target = +counter.getAttribute('data-target');
            const startTime = performance.now();
            
            const updateCount = (currentTime) => {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / speed, 1);
                
                // Easing function: easeOutExpo
                const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
                
                const currentValue = Math.floor(easeProgress * target);
                
                // Format number with commas if it's 10,000
                counter.innerText = currentValue.toLocaleString();
                
                if (progress < 1) {
                    requestAnimationFrame(updateCount);
                } else {
                    counter.innerText = target.toLocaleString();
                }
            };
            
            requestAnimationFrame(updateCount);
        });
    };

    // Trigger counters when stats section is in view
    const statsSection = document.getElementById('stats');
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounters();
                statsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    if (statsSection) statsObserver.observe(statsSection);

    // ═══════════════════════════════════════════ SCROLL SPY ═══════════════════════════════════════════
    const spySections = document.querySelectorAll('header[id], section[id]');
    const spyNavLinks = document.querySelectorAll('.nav__link');

    const updateActiveNavLink = () => {
        let current = '';
        
        spySections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            // Adjust the offset (150px) to trigger the active state slightly before reaching the section
            if (window.scrollY >= (sectionTop - 150)) {
                current = section.getAttribute('id');
            }
        });

        spyNavLinks.forEach(link => {
            link.classList.remove('nav__link--active');
            const href = link.getAttribute('href').substring(1);
            if (href === current) {
                link.classList.add('nav__link--active');
            }
        });
    };

    window.addEventListener('scroll', updateActiveNavLink);
    updateActiveNavLink(); // Initial run to set active state on load

    initReveal();
    window.addEventListener('scroll', revealOnScroll);
    revealOnScroll();

    // ═══════════════════════════════════════════ PRICING CAROUSEL LOGIC ═══════════════════════════════════════════
    const pricingGrid = document.getElementById('pricing-grid');
    const pricingCards = document.querySelectorAll('.pricing-card');
    const pricingIndicators = document.querySelectorAll('.pricing__indicator');
    const pricingNext = document.getElementById('pricing-next');
    const pricingPrev = document.getElementById('pricing-prev');

    let currentPricingIndex = 1; // Default to Studio (Center)

    const updatePricingView = (index) => {
        if (index < 0 || index >= pricingCards.length) return;
        currentPricingIndex = index;
        
        pricingCards[index].scrollIntoView({ 
            behavior: 'smooth', 
            inline: 'center', 
            block: 'nearest' 
        });

        // Indicators update via IntersectionObserver (already active)
    };

    // Button Navigation
    if (pricingNext && pricingPrev) {
        pricingNext.addEventListener('click', () => {
            if (currentPricingIndex < pricingCards.length - 1) {
                updatePricingView(currentPricingIndex + 1);
            }
        });

        pricingPrev.addEventListener('click', () => {
            if (currentPricingIndex > 0) {
                updatePricingView(currentPricingIndex - 1);
            }
        });
    }

    // Auto-center the "Most Popular" card on mobile load
    const pricingSection = document.getElementById('pricing');
    const centerFeatured = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && window.innerWidth <= 768) {
                updatePricingView(1); // Force Studio (Index 1)
                centerFeatured.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    if (pricingSection) centerFeatured.observe(pricingSection);

    // Observer for updating indicators and active class on swipe
    const pricingObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                pricingCards.forEach(card => card.classList.remove('active'));
                entry.target.classList.add('active');

                const index = Array.from(pricingCards).indexOf(entry.target);
                currentPricingIndex = index; // Sync index on swipe
                pricingIndicators.forEach((dot, i) => {
                    dot.classList.toggle('active', i === index);
                });
            }
        });
    }, {
        threshold: 0.6,
        rootMargin: '0px -20% 0px -20%'
    });

    pricingCards.forEach(card => pricingObserver.observe(card));
});
