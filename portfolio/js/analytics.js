// Google Analytics tracking code for Ahmed's portfolio website
// Created: May 18, 2025

// Initialize Google Analytics
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-XXXXXXXXXX'); // Replace with actual tracking ID when available

// Track page views
document.addEventListener('DOMContentLoaded', function() {
  // Track page view
  gtag('event', 'page_view', {
    'page_title': document.title,
    'page_location': window.location.href,
    'page_path': window.location.pathname
  });
  
  // Track outbound links
  const trackOutboundLink = function(url) {
    gtag('event', 'click', {
      'event_category': 'outbound',
      'event_label': url,
      'transport_type': 'beacon'
    });
  };
  
  // Add click event listeners to all external links
  const links = document.querySelectorAll('a');
  links.forEach(link => {
    if (link.hostname !== window.location.hostname && link.href.indexOf('javascript:') === -1) {
      link.addEventListener('click', function() {
        trackOutboundLink(link.href);
      });
    }
  });
  
  // Track form submissions
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', function() {
      gtag('event', 'form_submission', {
        'event_category': 'contact',
        'event_label': 'Contact Form'
      });
    });
  }
  
  // Track language switches
  const languageSwitch = document.querySelector('a[onclick="toggleLanguage()"]');
  if (languageSwitch) {
    languageSwitch.addEventListener('click', function() {
      const currentLang = document.documentElement.lang;
      const targetLang = currentLang === 'ar' ? 'en' : 'ar';
      gtag('event', 'language_switch', {
        'event_category': 'engagement',
        'event_label': `${currentLang} to ${targetLang}`
      });
    });
  }
  
  // Track scroll depth
  let scrollDepthTriggered = {};
  window.addEventListener('scroll', function() {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrollPercentage = Math.round((scrollTop / scrollHeight) * 100);
    
    const depths = [25, 50, 75, 100];
    depths.forEach(depth => {
      if (scrollPercentage >= depth && !scrollDepthTriggered[depth]) {
        scrollDepthTriggered[depth] = true;
        gtag('event', 'scroll_depth', {
          'event_category': 'engagement',
          'event_label': `${depth}%`,
          'non_interaction': true
        });
      }
    });
  });
});

// Track time on site
let startTime = new Date();
window.addEventListener('beforeunload', function() {
  const endTime = new Date();
  const timeSpent = Math.round((endTime - startTime) / 1000);
  gtag('event', 'time_on_site', {
    'event_category': 'engagement',
    'event_label': timeSpent,
    'non_interaction': true
  });
});
