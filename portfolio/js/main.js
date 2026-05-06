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
    
    // --- Contact form submission with AJAX and Success Message ---
    const contactForm = document.getElementById('contact-form');
    //const successMessageEn = document.getElementById('contact-success-message-en');
    //const successMessageAr = document.getElementById('contact-success-message-ar');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault(); // Prevent default form submission
            
            const formData = new FormData(contactForm);
            const submitButton = contactForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.textContent;
            const isArabic = document.documentElement.lang === 'ar';
            //const successMessageDiv = isArabic ? successMessageAr : successMessageEn;

            // Disable button and show sending state
            submitButton.disabled = true;
            submitButton.textContent = isArabic ? 'جار الإرسال...' : 'Sending...';
            //if (successMessageDiv) successMessageDiv.classList.remove('visible'); // Hide previous message

            fetch(contactForm.action, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json'
                }
            })
            .then(response => {
                if (!response.ok) {
                    // Throw an error to be caught by the .catch block, but distinguish it
                    return response.text().then(text => { // Try to get error text from server
                       throw new Error(`HTTP error! status: ${response.status}, message: ${text || 'No error message'}`);
                    });
                }
                // Check if the response has content before trying to parse as JSON
                const contentType = response.headers.get("content-type");
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    return response.json(); // Only parse if it's JSON
                } else {
                    // Handle non-JSON responses if expected (e.g., Formspree might redirect or send text)
                    // Assume success if response.ok is true and it's not JSON
                    return { ok: true }; // Simulate a successful structure if response.ok is true
                }
            })
            .then(data => {
                 // The check for FormSubmit might need adjustment based on actual successful response structure
                 // Assuming 'ok: true' or a specific success field from the JSON data indicates success
                if (data.ok || (data.success && data.success === "true")) {
                    // Show success message
                    // if (successMessageDiv) {
                    //     successMessageDiv.classList.add('visible');
                    // }
                    contactForm.reset();  // Clear the form 
                    // Hide success message after 8 seconds
                    // open thank-you.html in this window
                    window.location.href = isArabic ? 'thank-you.html' : 'en/thank-you.html';
                    // setTimeout(() => {
                    //     if (successMessageDiv) successMessageDiv.classList.remove('visible');
                    // }, 8000);
                } else {
                    // Handle application-level errors (e.g., validation errors from the server in the JSON response)
                    console.error('Application Error:', data);
                    alert(isArabic ? 'حدث خطأ أثناء معالجة طلبك. يرجى المحاولة مرة أخرى.' : 'An error occurred while processing your request. Please try again.');
                }
            })
            .catch(error => {
                // Handle network errors AND the HTTP errors thrown earlier
                console.error('Fetch Error:', error);
                // Check if it's the HTTP error we threw
                if (error.message.startsWith('HTTP error!')) {
                     alert(isArabic ? 'حدث خطأ من جانب الخادم. يرجى المحاولة مرة أخرى لاحقاً.' : 'A server-side error occurred. Please try again later.');
                } else {
                    // Assume it's a network error
                    alert(isArabic ? 'حدث خطأ في الشبكة. يرجى التحقق من اتصالك بالإنترنت والمحاولة مرة أخرى.' : 'A network error occurred. Please check your internet connection and try again.');
                }
            })
            .finally(() => {
                // Re-enable button and restore text
                submitButton.disabled = false;
                submitButton.textContent = originalButtonText;
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

});

