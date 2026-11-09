const assert = require('node:assert/strict');
const {
    calculateQuote,
    getCourseEnquiry,
    COURSE_NAMES
} = require('../script.js');

assert.deepEqual(getCourseEnquiry(''), { type: 'general' });
assert.deepEqual(getCourseEnquiry('?other=value'), { type: 'general' });

for (const [id, name] of Object.entries(COURSE_NAMES)) {
    assert.deepEqual(getCourseEnquiry(`?course=${encodeURIComponent(name)}`), {
        type: 'courses',
        courses: [{ id, name }],
        quote: calculateQuote([id])
    });
    assert.deepEqual(getCourseEnquiry(`?course=${encodeURIComponent(id)}`), {
        type: 'courses',
        courses: [{ id, name }],
        quote: calculateQuote([id])
    });
}

assert.deepEqual(getCourseEnquiry('?course=unknown-course'), { type: 'invalid' });
assert.deepEqual(getCourseEnquiry('?course=canine-obedience-training&course=puppy-care'), {
    type: 'courses',
    courses: [
        { id: 'canine-obedience-training', name: COURSE_NAMES['canine-obedience-training'] },
        { id: 'puppy-care', name: COURSE_NAMES['puppy-care'] }
    ],
    quote: calculateQuote(['canine-obedience-training', 'puppy-care'])
});
assert.deepEqual(getCourseEnquiry('?course=puppy-care&course=puppy-care'), {
    type: 'courses',
    courses: [{ id: 'puppy-care', name: COURSE_NAMES['puppy-care'] }],
    quote: calculateQuote(['puppy-care'])
});
assert.deepEqual(getCourseEnquiry('?course=puppy-care&course=unknown-course'), {
    type: 'invalid'
});
assert.deepEqual(getCourseEnquiry('?course=%3Cscript%3E'), { type: 'invalid' });
assert.deepEqual(getCourseEnquiry('?course=puppy-care&total=0'), {
    type: 'courses',
    courses: [{ id: 'puppy-care', name: COURSE_NAMES['puppy-care'] }],
    quote: calculateQuote(['puppy-care'])
});

console.log('22 contact enquiry assertions passed');
