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

const COURSE_FEES = Object.freeze({
    'canine-obedience-training': 1500,
    'pet-grooming': 1500,
    'animal-behaviour': 1500,
    'pet-business-management': 1500,
    'puppy-care': 750,
    'pet-first-aid': 750,
    'basic-dog-walking': 750
});

function roundCurrency(amount) {
    return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function calculateQuote(courseIds) {
    const uniqueIds = [...new Set(courseIds)];
    const selected = uniqueIds.filter(id =>
        Object.prototype.hasOwnProperty.call(COURSE_FEES, id)
    );
    const invalid = uniqueIds.filter(id =>
        !Object.prototype.hasOwnProperty.call(COURSE_FEES, id)
    );
    const subtotal = selected.reduce((sum, id) => sum + COURSE_FEES[id], 0);
    const rate = selected.length > 3
        ? 0.15
        : selected.length === 3
            ? 0.10
            : selected.length === 2
                ? 0.05
                : 0;
    const discount = roundCurrency(subtotal * rate);
    const afterDiscount = roundCurrency(subtotal - discount);
    const vat = roundCurrency(afterDiscount * 0.15);

    return {
        selected,
        invalid,
        subtotal,
        rate,
        discount,
        afterDiscount,
        vat,
        total: roundCurrency(afterDiscount + vat)
    };
}

function formatRand(amount) {
    return new Intl.NumberFormat('en-ZA', {
        style: 'currency',
        currency: 'ZAR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

function setupFeeCalculator() {
    const form = document.getElementById('fee-calculator-form');
    if (!form) {
        return;
    }

    const results = document.getElementById('quote-results');
    const feedback = document.getElementById('fee-feedback');
    const calculateButton = document.getElementById('calculate-fees');
    const courseInputs = [...form.querySelectorAll('input[name="courses"]')];

    function appendSummaryRow(list, label, value, isTotal = false) {
        const row = document.createElement('div');
        row.className = isTotal ? 'summary-row summary-total' : 'summary-row';

        const term = document.createElement('dt');
        term.textContent = label;
        const amount = document.createElement('dd');
        amount.textContent = value;

        row.append(term, amount);
        list.append(row);
    }

    function renderQuote(quote) {
        results.replaceChildren();

        if (quote.invalid.length > 0) {
            const message = document.createElement('p');
            message.textContent = 'One or more selected courses are unavailable. Remove invalid selections before calculating.';
            results.append(message);
            return;
        }

        if (quote.selected.length === 0) {
            const message = document.createElement('p');
            message.textContent = 'No courses selected.';
            results.append(message);
            return;
        }

        const count = document.createElement('p');
        count.textContent = `${quote.selected.length} course${quote.selected.length === 1 ? '' : 's'} selected`;
        results.append(count);

        const selectedList = document.createElement('ul');
        quote.selected.forEach(id => {
            const input = courseInputs.find(course => course.value === id);
            const item = document.createElement('li');
            item.textContent = input.closest('label').querySelector('span').textContent;
            selectedList.append(item);
        });
        results.append(selectedList);

        if (quote.discount > 0) {
            const savings = document.createElement('p');
            savings.textContent = `You save ${formatRand(quote.discount)} with this bundle.`;
            results.append(savings);
        }

        const breakdown = document.createElement('dl');
        appendSummaryRow(breakdown, 'Subtotal', formatRand(quote.subtotal));
        appendSummaryRow(breakdown, `Discount (${quote.rate * 100}%)`, `−${formatRand(quote.discount)}`);
        appendSummaryRow(breakdown, 'After discount', formatRand(quote.afterDiscount));
        appendSummaryRow(breakdown, 'VAT (15%)', formatRand(quote.vat));
        appendSummaryRow(breakdown, 'Total including VAT', formatRand(quote.total), true);
        results.append(breakdown);

        const note = document.createElement('p');
        note.textContent = 'VAT is calculated after the course-count discount. This is an estimate, not a formal invoice.';
        results.append(note);
    }

    function updateQuote(showSuccess = false) {
        const selectedIds = courseInputs
            .filter(input => input.checked)
            .map(input => input.value);
        const quote = calculateQuote(selectedIds);
        renderQuote(quote);

        feedback.classList.remove('success');
        if (quote.invalid.length > 0) {
            feedback.textContent = 'Some selected courses could not be priced. Review your selections.';
        } else if (quote.selected.length === 0) {
            feedback.textContent = 'Select at least one course to calculate your fees.';
        } else if (showSuccess) {
            feedback.textContent = 'Fee estimate updated.';
            feedback.classList.add('success');
        } else {
            feedback.textContent = '';
        }

        return quote;
    }

    courseInputs.forEach(input => {
        input.addEventListener('change', () => updateQuote());
    });

    calculateButton.addEventListener('click', () => updateQuote(true));
    updateQuote();
}

function setupContactForm() {
    const form = document.getElementById('contact-form');
    if (!form) {
        return;
    }

    const feedback = document.getElementById('contact-feedback');
    const fields = [...form.querySelectorAll('input, textarea')];
    const phonePattern = /^[\d+(). -]{7,20}$/;
    let hasAttemptedSubmit = false;

    function validateField(field) {
        const value = field.type === 'checkbox' ? '' : field.value.trim();
        let message = '';

        if (field.required && (field.type === 'checkbox' ? !field.checked : !value)) {
            message = field.type === 'checkbox'
                ? 'Please agree to be contacted before continuing.'
                : 'This field is required.';
        } else if (field.type === 'email' && !field.validity.valid) {
            message = 'Enter a valid email address.';
        } else if (field.type === 'tel' && value && !phonePattern.test(value)) {
            message = 'Enter a valid phone number, or leave this optional field blank.';
        } else if (field.minLength > 0 && value.length < field.minLength) {
            message = `Enter at least ${field.minLength} characters.`;
        }

        const error = document.getElementById(`${field.id}-error`);
        error.textContent = message;
        field.setAttribute('aria-invalid', String(Boolean(message)));
        return message === '';
    }

    function validateAllFields() {
        return fields.map(validateField).every(Boolean);
    }

    fields.forEach(field => {
        field.addEventListener('invalid', () => {
            hasAttemptedSubmit = true;
            validateField(field);
            feedback.classList.add('error');
            feedback.textContent = 'Please correct the highlighted fields before continuing.';
        });

        field.addEventListener(field.type === 'checkbox' ? 'change' : 'input', () => {
            if (!hasAttemptedSubmit) {
                return;
            }

            if (validateAllFields()) {
                feedback.classList.remove('error');
                feedback.textContent = '';
            }
        });
    });

    form.addEventListener('submit', event => {
        event.preventDefault();
        hasAttemptedSubmit = true;

        if (!validateAllFields()) {
            feedback.classList.add('error');
            feedback.textContent = 'Please correct the highlighted fields before continuing.';
            fields.find(field => field.getAttribute('aria-invalid') === 'true').focus();
            return;
        }

        feedback.classList.remove('error');
        feedback.textContent = 'Your message has not been sent. This website does not have a submission service configured.';
    });
}

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        setupCourseDropdown();
        setupFeeCalculator();
        setupContactForm();
    });
}

if (typeof module !== 'undefined') {
    module.exports = { calculateQuote, COURSE_FEES };
}
