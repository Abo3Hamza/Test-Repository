// Main JavaScript file for portfolio website

document.addEventListener('DOMContentLoaded', function() {
    // --- Mobile menu toggle ---
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('nav');
    
    if (menuToggle && nav) {
        menuToggle.addEventListener('click', function() {
            nav.classList.toggle('active');
        });
    }
    
    // --- FAQ toggle functionality ---
    const faqItems = document.querySelectorAll('.faq-item');
    
    if (faqItems.length > 0) {
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            const answer = item.querySelector('.faq-answer');
            const toggleIcon = question.querySelector('.faq-toggle i');

            if (question && answer && toggleIcon) {
                question.addEventListener('click', () => {
                    const isOpen = item.classList.contains('active');

                    // Close all other items
                    faqItems.forEach(otherItem => {
                        if (otherItem !== item && otherItem.classList.contains('active')) {
                            otherItem.classList.remove('active');
                            const otherAnswer = otherItem.querySelector('.faq-answer');
                            const otherIcon = otherItem.querySelector('.faq-toggle i');
                            otherAnswer.style.maxHeight = null;
                            otherAnswer.style.paddingTop = '0';
                            otherAnswer.style.opacity = '0';
                            otherIcon.classList.remove('fa-minus');
                            otherIcon.classList.add('fa-plus');
                        }
                    });

                    // Toggle the clicked item
                    item.classList.toggle('active');
                    if (item.classList.contains('active')) {
                        answer.style.maxHeight = answer.scrollHeight + 'px';
                        answer.style.paddingTop = '15px'; // Add padding when open
                        answer.style.opacity = '1';
                        toggleIcon.classList.remove('fa-plus');
                        toggleIcon.classList.add('fa-minus');
                    } else {
                        answer.style.maxHeight = null;
                        answer.style.paddingTop = '0';
                        answer.style.opacity = '0';
                        toggleIcon.classList.remove('fa-minus');
                        toggleIcon.classList.add('fa-plus');
                    }
                });
            }
        });
    }
    
    // --- Contact form submission through EmailJS ---
    const contactForm = document.getElementById('contact-form');
    const EMAILJS_SERVICE_ID = 'service_5omaagh';
    const EMAILJS_TEMPLATE_ID = 'template_mxs2stn';
    const EMAILJS_PUBLIC_KEY = 'VmMqq2bf8awlQtmKt';
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault(); // Prevent default form submission
            const submitButton = contactForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            const isArabic = document.documentElement.lang === 'ar';
            const name = document.getElementById('name')?.value.trim() || '';
            const email = document.getElementById('email')?.value.trim() || '';
            const subjectValue = document.getElementById('subject')?.value.trim() || '';
            const messageValue = document.getElementById('message')?.value.trim() || '';
            const subject = subjectValue || (isArabic ? 'رسالة جديدة من موقعك الشخصي' : 'New message from your website');

            if (typeof emailjs === 'undefined') {
                alert(isArabic ? 'تعذر تحميل خدمة الإرسال. حاول مرة أخرى لاحقاً.' : 'The sending service could not be loaded. Please try again later.');
                return;
            }

            const captchaResponse = grecaptcha.getResponse();
            if (captchaResponse.length === 0) {
                alert("الرجاء التحقق من أنك لست روبوت.");
                return;
            }

            // Disable button while sending the message
            submitButton.disabled = true;
            submitButton.textContent = isArabic ? 'جارٍ الإرسال...' : 'Sending...';

            const templateParams = {
                // 1. بيانات القالب الأساسي
                from_name: name,
                from_email: email,
                subject: subject,
                message: messageValue,
                reply_to: email,
                
                time: new Date().toLocaleString(isArabic ? 'ar-EG' : 'en-US'), 

                // 2. المتغيرات اللي هيستخدمها الـ Auto-Reply تلقائياً
                dir: isArabic ? 'rtl' : 'ltr',
                greeting_text: isArabic ? 'مرحباً' : 'Hi',
                thank_you_text: isArabic 
                    ? 'شكراً لتواصلك معنا! لقد استلمنا طلبك بخصوص:' 
                    : 'Thank you for reaching out to us! We have received your request:',
                process_text: isArabic 
                    ? 'وسنبذل قصارى جهدنا للرد عليك في أقرب وقت.' 
                    : 'and we\'ll do our best to process it as soon as possible.',
                best_regards_text: isArabic ? 'أطيب التحيات،' : 'Best regards,',
                team_name: isArabic ? 'أحمد رمضان' : 'Ahmed Ramadan',

                'g-recaptcha-response': captchaResponse
            };

            emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams, EMAILJS_PUBLIC_KEY)
                .then(() => {
                    contactForm.reset();
                    window.location.href = 'thank-you.html';
                })
                .catch(() => {
                    alert(isArabic ? 'حدث خطأ أثناء إرسال الرسالة. حاول مرة أخرى.' : 'There was an error sending your message. Please try again.');
                })
                .finally(() => {
                    submitButton.disabled = false;
                    submitButton.textContent = originalButtonText;
                    grecaptcha.reset();
                });
        });
    }

    // --- Language Switcher Logic ---
    const setupLanguageSwitcher = () => {
        const langSwitcherAr = document.getElementById('lang-switcher-ar');
        const langSwitcherEn = document.getElementById('lang-switcher-en');
        
        if (langSwitcherAr) {
            langSwitcherAr.addEventListener('click', function(e) {
                e.preventDefault();
                const currentPath = window.location.pathname;
                            const pathParts = currentPath.split('/');
                const pageName = pathParts[pathParts.length - 1];

                const targetPath = pageName === 'index.html' || pageName === '' ? '../index.html' : '../' + pageName;
                window.location.href = targetPath;
            });
        }
        
        if (langSwitcherEn) {
            langSwitcherEn.addEventListener('click', function(e) {
                e.preventDefault();
                const currentPath = window.location.pathname;
                const pathParts = currentPath.split('/');
                const pageName = pathParts[pathParts.length - 1];

                const targetPath = pageName === 'index.html' || pageName === '' ? 'en/index.html' : 'en/' + pageName;
                window.location.href = targetPath;
            });
        }
    };
    setupLanguageSwitcher();

    // --- Project Filter Logic ---
    const filterBtns = document.querySelectorAll('.filter-btn');
    const projectCards = document.querySelectorAll('.project-card');

    if (filterBtns.length > 0 && projectCards.length > 0) {
        filterBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                filterBtns.forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                const filter = this.getAttribute('data-filter');
                projectCards.forEach(card => {
                    if (filter === 'all' || card.getAttribute('data-category') === filter) {
                        card.style.display = 'block';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        });
    }

    // --- Dark Mode Toggle Logic ---
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    const moonIcon = 'fa-moon';
    const sunIcon = 'fa-sun';

    // Function to set the theme
    const setTheme = (theme) => {
        if (theme === 'dark') {
            body.classList.add('dark-mode');
            if (themeToggle) themeToggle.querySelector('i').classList.replace(moonIcon, sunIcon);
            localStorage.setItem('theme', 'dark');
        } else {
            body.classList.remove('dark-mode');
            if (themeToggle) themeToggle.querySelector('i').classList.replace(sunIcon, moonIcon);
            localStorage.setItem('theme', 'light');
        }
    };

    // Apply the saved theme on initial load
    const savedTheme = localStorage.getItem('theme') || 'light'; // Default to light
    setTheme(savedTheme);

    // Add event listener for the toggle button
    if (themeToggle) {
        themeToggle.addEventListener('click', (e) => {
            e.preventDefault();
            const currentTheme = localStorage.getItem('theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
        });
    }

    const footerPlaceholder = document.getElementById('footer-placeholder');
    if (footerPlaceholder) {
        const footerPath = 'footer.html';

        fetch(footerPath)
            .then(response => {
                if (!response.ok) {
                    throw new Error('لم يتم العثور على ملف الفوتر');
                }
                return response.text();
            })
            .then(data => {
                footerPlaceholder.innerHTML = data;
            })
            .catch(error => console.error('خطأ في تحميل الفوتر:', error));
    }

});

