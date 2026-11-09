const assert = require('node:assert/strict');
const {
    calculateQuote,
    COURSE_FEES,
    getCalculatorCourseSelection
} = require('../script.js');

const professionalCourses = [
    'canine-obedience-training',
    'pet-grooming',
    'animal-behaviour',
    'pet-business-management'
];
const shortCourses = ['puppy-care', 'pet-first-aid', 'basic-dog-walking'];

const cases = [
    {
        name: 'no courses',
        ids: [],
        subtotal: 0,
        rate: 0,
        vat: 0,
        total: 0
    },
    {
        name: 'one course',
        ids: [professionalCourses[0]],
        subtotal: 1500,
        rate: 0,
        vat: 225,
        total: 1725
    },
    {
        name: 'two courses',
        ids: professionalCourses.slice(0, 2),
        subtotal: 3000,
        rate: 0.05,
        vat: 427.5,
        total: 3277.5
    },
    {
        name: 'three courses',
        ids: professionalCourses.slice(0, 3),
        subtotal: 4500,
        rate: 0.10,
        vat: 607.5,
        total: 4657.5
    },
    {
        name: 'four courses',
        ids: professionalCourses,
        subtotal: 6000,
        rate: 0.15,
        vat: 765,
        total: 5865
    },
    {
        name: 'more than four with cent rounding',
        ids: [...professionalCourses, shortCourses[0]],
        subtotal: 6750,
        rate: 0.15,
        vat: 860.63,
        total: 6598.13
    },
    {
        name: 'all seven courses',
        ids: [...professionalCourses, ...shortCourses],
        subtotal: 8250,
        rate: 0.15,
        vat: 1051.88,
        total: 8064.38
    }
];

for (const testCase of cases) {
    const quote = calculateQuote(testCase.ids);
    assert.equal(quote.subtotal, testCase.subtotal, `${testCase.name}: subtotal`);
    assert.equal(quote.rate, testCase.rate, `${testCase.name}: discount rate`);
    assert.equal(quote.vat, testCase.vat, `${testCase.name}: VAT`);
    assert.equal(quote.total, testCase.total, `${testCase.name}: total`);
}

const duplicateQuote = calculateQuote([professionalCourses[0], professionalCourses[0]]);
assert.equal(duplicateQuote.selected.length, 1, 'duplicate selections are counted once');
assert.equal(duplicateQuote.subtotal, COURSE_FEES[professionalCourses[0]]);

const invalidQuote = calculateQuote(['unknown-course']);
assert.deepEqual(invalidQuote.selected, []);
assert.deepEqual(invalidQuote.invalid, ['unknown-course']);
assert.equal(invalidQuote.total, 0);

assert.deepEqual(getCalculatorCourseSelection(''), {
    selected: [],
    invalid: []
});
for (const id of [...professionalCourses, ...shortCourses]) {
    assert.deepEqual(
        getCalculatorCourseSelection(`?course=${id}`),
        { selected: [id], invalid: [] }
    );
}
assert.deepEqual(
    getCalculatorCourseSelection(`?course=${professionalCourses[0]}&course=${shortCourses[0]}`),
    { selected: [professionalCourses[0], shortCourses[0]], invalid: [] }
);
assert.deepEqual(
    getCalculatorCourseSelection(`?course=${professionalCourses[0]}&course=${professionalCourses[0]}`),
    { selected: [professionalCourses[0]], invalid: [] }
);
assert.deepEqual(getCalculatorCourseSelection('?course=unknown-course'), {
    selected: [],
    invalid: ['unknown-course']
});
assert.deepEqual(
    getCalculatorCourseSelection(`?course=${professionalCourses[0]}&course=unknown-course`),
    { selected: [professionalCourses[0]], invalid: ['unknown-course'] }
);

console.log(`${cases.length * 4 + 17} calculator assertions passed`);
