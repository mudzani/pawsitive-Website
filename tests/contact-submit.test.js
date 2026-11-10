const assert = require('node:assert/strict');
const {
    createEnquiryPayload,
    getCourseEnquiry,
    isConfirmedBackendResponse,
    setupContactForm,
    validateContactField
} = require('../script.js');

const validFields = {
    name: 'Example Learner',
    email: 'learner@example.com',
    phone: '',
    subject: 'Enrolment question',
    message: 'Please send me more information.'
};

const generalEnquiry = getCourseEnquiry('');
const singleCourseEnquiry = getCourseEnquiry('?course=puppy-care');
const multipleCourseEnquiry = getCourseEnquiry('?course=puppy-care&course=pet-first-aid');

assert.deepEqual(createEnquiryPayload(validFields, generalEnquiry), {
    ...validFields,
    enquiry_type: 'General enquiry',
    contact_consent: true,
    selected_course_ids: []
});
assert.deepEqual(createEnquiryPayload(validFields, singleCourseEnquiry), {
    ...validFields,
    enquiry_type: 'Course enrolment enquiry',
    contact_consent: true,
    selected_course_ids: ['puppy-care']
});
assert.deepEqual(createEnquiryPayload(validFields, multipleCourseEnquiry), {
    ...validFields,
    enquiry_type: 'Course enrolment enquiry',
    contact_consent: true,
    selected_course_ids: ['puppy-care', 'pet-first-aid']
});
assert.equal(createEnquiryPayload(validFields, getCourseEnquiry('?course=unknown-course')), null);
assert.equal(createEnquiryPayload(validFields, {
    type: 'courses',
    courses: [{ id: 'unknown-course' }]
}), null);

assert.equal(validateContactField({
    type: 'checkbox',
    required: true,
    checked: false,
    value: '',
    minLength: -1
}), 'Please agree to be contacted before continuing.');
assert.equal(validateContactField({
    type: 'email',
    required: true,
    value: 'not-an-email',
    validity: { valid: false },
    minLength: -1
}), 'Enter a valid email address.');
assert.equal(validateContactField({
    type: 'email',
    required: true,
    value: '',
    validity: { valid: false },
    minLength: -1
}), 'This field is required.');

assert.equal(isConfirmedBackendResponse({
    success: true,
    saved: true,
    emailSent: true,
    submissionId: 'submission-123'
}), true);
assert.equal(isConfirmedBackendResponse({ success: true, submissionId: 'submission-123' }), false);
assert.equal(isConfirmedBackendResponse({
    success: true,
    saved: true,
    submissionId: ''
}), false);

function classList() {
    const values = new Set();
    return {
        add: value => values.add(value),
        remove: value => values.delete(value),
        contains: value => values.has(value)
    };
}

function node(properties = {}) {
    return {
        textContent: '',
        hidden: false,
        className: '',
        children: [],
        attributes: {},
        listeners: {},
        classList: classList(),
        append(...children) {
            this.children.push(...children);
        },
        addEventListener(type, handler) {
            this.listeners[type] = handler;
        },
        setAttribute(name, value) {
            this.attributes[name] = value;
        },
        getAttribute(name) {
            return this.attributes[name] ?? null;
        },
        focus() {},
        ...properties
    };
}

function createFormHarness(search = '?course=puppy-care') {
    const fields = [
        node({
            id: 'name', name: 'name', type: 'text', value: validFields.name,
            required: true, minLength: 2, validity: { valid: true }
        }),
        node({
            id: 'email', name: 'email', type: 'email', value: validFields.email,
            required: true, minLength: -1, validity: { valid: true }
        }),
        node({
            id: 'phone', name: 'phone', type: 'tel', value: validFields.phone,
            required: false, minLength: -1, validity: { valid: true }
        }),
        node({
            id: 'subject', name: 'subject', type: 'text', value: validFields.subject,
            required: true, minLength: 3, validity: { valid: true }
        }),
        node({
            id: 'message', name: 'message', type: 'textarea', value: validFields.message,
            required: true, minLength: 10, validity: { valid: true }
        }),
        node({
            id: 'contact-consent', name: 'contact-consent', type: 'checkbox',
            value: 'on', checked: true, required: true, minLength: -1,
            validity: { valid: true }
        })
    ];
    const button = node({ textContent: 'Send enquiry', disabled: false });
    const feedback = node();
    const title = node({
        closest: () => enquiryContext
    });
    const description = node();
    const selectedCourses = node();
    const feeSummary = node();
    const selectedCourseContext = node();
    const formHeading = node();
    const enquiryContext = node();
    const errors = new Map(fields.map(field => [`${field.id}-error`, node()]));
    const form = node({
        dataset: { endpoint: 'https://worker.example/submit' },
        fields,
        querySelectorAll: selector => selector.startsWith('input')
            ? fields
            : [],
        querySelector: () => button
    });

    global.document = {
        getElementById(id) {
            return new Map([
                ['contact-feedback', feedback],
                ['contact-form', form],
                ['enquiry-context-title', title],
                ['enquiry-context-description', description],
                ['selected-courses', selectedCourses],
                ['selected-fee-summary', feeSummary],
                ['selected-course-context', selectedCourseContext],
                ['contact-form-heading', formHeading],
                ['subject', fields.find(field => field.id === 'subject')],
                ['message', fields.find(field => field.id === 'message')]
            ]).get(id) || errors.get(id) || null;
        },
        createElement: () => node()
    };
    global.location = { search };
    global.FormData = class {
        constructor() {}
        entries() {
            return fields.map(field => [
                field.name,
                field.type === 'checkbox' ? (field.checked ? 'on' : '') : field.value
            ])[Symbol.iterator]();
        }
    };
    setupContactForm();

    return {
        fields,
        button,
        feedback,
        form,
        submit: () => form.listeners.submit({ preventDefault() {} })
    };
}

async function withFormHarness(search, fetchHandler, run) {
    const original = {
        document: global.document,
        location: global.location,
        FormData: global.FormData,
        fetch: global.fetch
    };
    const harness = createFormHarness(search);
    global.fetch = fetchHandler;
    try {
        await run(harness);
    } finally {
        for (const [key, value] of Object.entries(original)) {
            if (value === undefined) {
                delete global[key];
            } else {
                global[key] = value;
            }
        }
    }
}

async function runSubmitScenarios() {
    let fetchCalls = 0;
    let resolveResponse;
    await withFormHarness(
        '?course=puppy-care',
        () => {
            fetchCalls += 1;
            return new Promise(resolve => {
                resolveResponse = resolve;
            });
        },
        async harness => {
            const firstSubmit = harness.submit();
            const secondSubmit = harness.submit();
            await secondSubmit;
            assert.equal(fetchCalls, 1, 'submits during an active request are ignored');
            assert.equal(harness.button.disabled, true);

            resolveResponse({
                ok: true,
                json: async () => ({
                    success: true,
                    saved: true,
                    emailSent: true,
                    submissionId: 'submission-123',
                    message: 'Enquiry received successfully.',
                    emailError: ''
                })
            });
            await firstSubmit;
            assert.equal(harness.feedback.classList.contains('success'), true);
            assert.equal(harness.button.disabled, true, 'confirmed submission cannot be sent again');
            assert.equal(harness.button.textContent, 'Enquiry submitted');
        }
    );

    await withFormHarness(
        '',
        async () => ({
            ok: false,
            json: async () => ({ success: false })
        }),
        async harness => {
            await harness.submit();
            assert.equal(harness.feedback.classList.contains('error'), true);
            assert.equal(harness.button.disabled, false, 'failed request can be retried');
            assert.equal(harness.button.textContent, 'Send enquiry');
        }
    );

    let validationFetchCalls = 0;
    await withFormHarness('', async () => {
        validationFetchCalls += 1;
    }, async harness => {
        harness.fields.find(field => field.id === 'contact-consent').checked = false;
        await harness.submit();
        assert.equal(validationFetchCalls, 0, 'missing consent blocks submission');
        assert.match(harness.feedback.textContent, /correct the highlighted fields/i);
        assert.equal(harness.button.disabled, false);
    });

    await withFormHarness('', async () => {
        validationFetchCalls += 1;
    }, async harness => {
        const email = harness.fields.find(field => field.id === 'email');
        email.value = 'not-an-email';
        email.validity.valid = false;
        await harness.submit();
        assert.equal(validationFetchCalls, 0, 'invalid email blocks submission');
        assert.equal(global.document.getElementById('email-error').textContent, 'Enter a valid email address.');
        assert.equal(harness.button.disabled, false);
    });

    let invalidSubmitCalls = 0;
    await withFormHarness(
        '?course=unknown-course',
        async () => {
            invalidSubmitCalls += 1;
            return { ok: true, json: async () => ({}) };
        },
        async harness => {
            await harness.submit();
            assert.equal(invalidSubmitCalls, 0, 'invalid course IDs are not sent as general enquiries');
            assert.equal(harness.feedback.classList.contains('error'), true);
        }
    );
}

runSubmitScenarios().then(() => {
    console.log('Contact payload and submission assertions passed');
}).catch(error => {
    console.error(error);
    process.exitCode = 1;
});
