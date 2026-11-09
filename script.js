function setupCourseDropdown() {
    const navigation = document.querySelector('.site-header nav');
    if (!navigation) {
        return;
    }

    const coursesLink = [...navigation.querySelectorAll('a')]
        .find(link => link.getAttribute('href') === 'courses.html');
    if (!coursesLink) {
        return;
    }

    const dropdown = document.createElement('div');
    dropdown.className = 'nav-dropdown';

    const toggle = document.createElement('button');
    toggle.className = 'nav-dropdown-toggle';
    toggle.type = 'button';
    toggle.textContent = 'Individual courses';
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-controls', 'course-pages-menu');

    const panel = document.createElement('div');
    panel.className = 'nav-dropdown-panel';
    panel.id = 'course-pages-menu';
    panel.hidden = true;

    const coursePages = [
        ['Canine Obedience Training', 'canine-obedience-training.html'],
        ['Pet Grooming', 'pet-grooming.html'],
        ['Animal Behaviour', 'animal-behaviour.html'],
        ['Pet Business Management', 'pet-business-management.html'],
        ['Puppy Care', 'puppy-care.html'],
        ['Pet First Aid', 'pet-first-aid.html'],
        ['Basic Dog Walking', 'basic-dog-walking.html']
    ];

    coursePages.forEach(([label, href]) => {
        const link = document.createElement('a');
        link.href = href;
        link.textContent = label;
        panel.append(link);
    });

    dropdown.append(toggle, panel);
    coursesLink.after(dropdown);

    function closeDropdown(returnFocus = false) {
        panel.hidden = true;
        toggle.setAttribute('aria-expanded', 'false');
        dropdown.classList.remove('open');
        if (returnFocus) {
            toggle.focus();
        }
    }

    toggle.addEventListener('click', () => {
        const isOpen = toggle.getAttribute('aria-expanded') === 'true';
        if (isOpen) {
            closeDropdown();
            return;
        }

        panel.hidden = false;
        toggle.setAttribute('aria-expanded', 'true');
        dropdown.classList.add('open');
    });

    document.addEventListener('click', event => {
        if (!dropdown.contains(event.target)) {
            closeDropdown();
        }
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !panel.hidden) {
            closeDropdown(true);
        }
    });
}

document.addEventListener('DOMContentLoaded', setupCourseDropdown);
