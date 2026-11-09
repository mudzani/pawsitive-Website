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

const COURSE_NAMES = Object.freeze({
    'canine-obedience-training': 'Canine Obedience Training',
    'pet-grooming': 'Pet Grooming',
    'animal-behaviour': 'Animal Behaviour',
    'pet-business-management': 'Pet Business Management',
    'puppy-care': 'Puppy Care',
    'pet-first-aid': 'Pet First Aid',
    'basic-dog-walking': 'Basic Dog Walking'
});

function getCourseEnquiry(search) {
    const params = new URLSearchParams(search);
    const requestedCourses = params.getAll('course');

    if (requestedCourses.length === 0) {
        return { type: 'general' };
    }

    const courses = new Map();
    for (const value of requestedCourses) {
        const course = Object.entries(COURSE_NAMES)
            .find(([id, name]) => id === value || name === value);
        if (!course) {
            return { type: 'invalid' };
        }
        courses.set(course[0], course[1]);
    }

    const selectedCourses = [...courses].map(([id, name]) => ({ id, name }));
    return {
        type: 'courses',
        courses: selectedCourses,
        quote: calculateQuote(selectedCourses.map(course => course.id))
    };
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

function getCalculatorCourseSelection(search) {
    const requested = new Set(new URLSearchParams(search).getAll('course'));
    const selected = [];
    const invalid = [];

    requested.forEach(id => {
        (Object.prototype.hasOwnProperty.call(COURSE_FEES, id) ? selected : invalid)
            .push(id);
    });

    return { selected, invalid };
}

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
    const continueLink = document.getElementById('continue-to-enquiry');
    const courseCount = document.getElementById('selected-course-count');
    const discountTierFeedback = document.getElementById('discount-tier-feedback');
    const discountTiers = [...document.querySelectorAll('[data-course-tier]')];
    const courseInputs = [...form.querySelectorAll('input[name="courses"]')];
    const initialSelection = getCalculatorCourseSelection(location.search);
    let hasInvalidCourseParameter = initialSelection.invalid.length > 0;
    courseInputs.forEach(input => {
        input.checked = initialSelection.selected.includes(input.value);
    });

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
            const name = input.closest('label').querySelector('span').textContent;
            item.textContent = `${name} — ${formatRand(COURSE_FEES[id])}`;
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
        appendSummaryRow(breakdown, 'Price before VAT', formatRand(quote.afterDiscount));
        appendSummaryRow(breakdown, 'VAT (15%)', formatRand(quote.vat));
        appendSummaryRow(breakdown, 'Total including VAT', formatRand(quote.total), true);
        results.append(breakdown);

        const note = document.createElement('p');
        note.textContent = 'VAT is added after discount. This is an estimate, not a formal invoice.';
        results.append(note);
    }

    function renderPendingQuote(quote) {
        results.replaceChildren();

        const message = document.createElement('p');
        if (quote.invalid.length > 0) {
            message.textContent = 'One or more selected courses are unavailable. Remove invalid selections before calculating.';
        } else if (quote.selected.length === 0) {
            message.textContent = 'Select your courses, then calculate to see your fee estimate.';
        } else {
            message.textContent = 'Press Calculate to see the fee breakdown for your selected courses.';
        }
        results.append(message);
    }

    function updateDiscountTier(quote) {
        const selectedCount = quote.selected.length;
        const activeTier = selectedCount === 0
            ? null
            : selectedCount > 3
                ? 4
                : selectedCount;

        discountTiers.forEach(row => {
            const isActive = Number(row.dataset.courseTier) === activeTier;
            row.classList.toggle('discount-tier-active', isActive);
            if (isActive) {
                row.setAttribute('aria-current', 'true');
            } else {
                row.removeAttribute('aria-current');
            }
        });

        if (selectedCount === 0) {
            discountTierFeedback.textContent = 'Select courses to see your discount tier.';
            return;
        }

        const courseNoun = selectedCount === 1 ? 'course qualifies' : 'courses qualify';
        discountTierFeedback.textContent = `${selectedCount} selected ${courseNoun} for a ${quote.rate * 100}% discount before VAT.`;
    }

    function updateEnquiryLink(courseIds) {
        if (courseIds.length === 0) {
            continueLink.href = 'contact.html';
            return;
        }

        const params = new URLSearchParams();
        courseIds.forEach(id => params.append('course', id));
        continueLink.href = `contact.html?${params.toString()}`;
    }

    function updateCalculatorUrl(courseIds) {
        const params = new URLSearchParams();
        courseIds.forEach(id => params.append('course', id));
        const query = params.toString();
        const url = `${location.pathname}${query ? `?${query}` : ''}${location.hash}`;
        history.replaceState(null, '', url);
    }

    function updateQuote(showSuccess = false) {
        const selectedIds = courseInputs
            .filter(input => input.checked)
            .map(input => input.value);
        const quote = calculateQuote(selectedIds);
        courseCount.textContent = `${quote.selected.length} course${quote.selected.length === 1 ? '' : 's'} selected`;
        updateDiscountTier(quote);
        if (showSuccess) {
            renderQuote(quote);
        } else {
            renderPendingQuote(quote);
        }
        updateEnquiryLink(quote.selected);

        feedback.classList.remove('success');
        if (quote.invalid.length > 0) {
            feedback.textContent = 'Some selected courses could not be priced. Review your selections.';
        } else if (hasInvalidCourseParameter) {
            feedback.textContent = 'Some course details in this link were not recognized. Choose courses below to continue.';
        } else if (showSuccess && quote.selected.length === 0) {
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
        input.addEventListener('change', () => {
            const selectedIds = courseInputs
                .filter(course => course.checked)
                .map(course => course.value);
            hasInvalidCourseParameter = false;
            updateCalculatorUrl(selectedIds);
            updateQuote();
        });
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
    const contextTitle = document.getElementById('enquiry-context-title');
    const contextDescription = document.getElementById('enquiry-context-description');
    const selectedCourses = document.getElementById('selected-courses');
    const selectedFeeSummary = document.getElementById('selected-fee-summary');
    const selectedCourseContext = document.getElementById('selected-course-context');
    const formHeading = document.getElementById('contact-form-heading');
    const enquiryContext = contextTitle.closest('.enquiry-context');
    const subject = document.getElementById('subject');
    const message = document.getElementById('message');
    const enquiry = getCourseEnquiry(location.search);
    const fields = [...form.querySelectorAll('input, textarea')];
    const phonePattern = /^[\d+(). -]{7,20}$/;
    let hasAttemptedSubmit = false;

    enquiryContext.hidden = enquiry.type === 'general';

    if (enquiry.type === 'courses') {
        enquiryContext.hidden = false;
        const names = enquiry.courses.map(course => course.name);
        contextTitle.textContent = 'Enrolment enquiry';
        contextDescription.textContent = 'You are asking about enrolment in these courses. Your calculated fees are shown below:';
        enquiry.courses.forEach(course => {
            const item = document.createElement('li');
            item.textContent = `${course.name} — ${formatRand(COURSE_FEES[course.id])}`;
            selectedCourses.append(item);
        });

        const summaryRows = [
            ['Subtotal', formatRand(enquiry.quote.subtotal)],
            [`Discount (${enquiry.quote.rate * 100}%)`, `−${formatRand(enquiry.quote.discount)}`],
            ['After discount', formatRand(enquiry.quote.afterDiscount)],
            ['VAT (15%)', formatRand(enquiry.quote.vat)],
            ['Total including VAT', formatRand(enquiry.quote.total)]
        ];
        summaryRows.forEach(([label, amount], index) => {
            const row = document.createElement('div');
            row.className = index === summaryRows.length - 1
                ? 'summary-row summary-total'
                : 'summary-row';
            const term = document.createElement('dt');
            term.textContent = label;
            const value = document.createElement('dd');
            value.textContent = amount;
            row.append(term, value);
            selectedFeeSummary.append(row);
        });

        selectedCourseContext.hidden = false;
        formHeading.textContent = 'Ask about enrolment';
        subject.value = `Enrolment enquiry: ${names.join(', ')}`;
        message.value = `I am interested in enrolling in ${names.join(', ')}. Please provide more information.`;
    } else if (enquiry.type === 'invalid') {
        enquiryContext.hidden = false;
        contextTitle.textContent = 'Course not recognised';
        contextDescription.textContent = 'We could not identify that course. You can continue with a general enquiry or choose courses in the fee calculator.';
    } else {
        contextTitle.textContent = 'General enquiry';
        contextDescription.textContent = 'Complete this form with your question. To ask about a specific course, open its course page and select Enrol now.';
    }

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
        feedback.textContent = enquiry.type === 'courses'
            ? `Your enrolment enquiry for ${enquiry.courses.map(course => course.name).join(', ')} is ready, but has not been sent or stored. This website does not have a submission service configured.`
            : 'Your enquiry details are valid, but have not been sent or stored. This website does not have a submission service configured.';
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
    module.exports = {
        calculateQuote,
        COURSE_FEES,
        getCalculatorCourseSelection,
        getCourseEnquiry,
        COURSE_NAMES
    };
}
