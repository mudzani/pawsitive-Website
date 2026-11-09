const assert = require('node:assert/strict');
const { getCourseEnquiry, COURSE_NAMES } = require('../script.js');

assert.deepEqual(getCourseEnquiry(''), { type: 'general' });
assert.deepEqual(getCourseEnquiry('?other=value'), { type: 'general' });

for (const [id, name] of Object.entries(COURSE_NAMES)) {
    assert.deepEqual(getCourseEnquiry(`?course=${encodeURIComponent(id)}`), {
        type: 'course',
        id,
        name
    });
}

assert.deepEqual(getCourseEnquiry('?course=unknown-course'), { type: 'invalid' });
assert.deepEqual(getCourseEnquiry('?course=canine-obedience-training&course=puppy-care'), {
    type: 'invalid'
});
assert.deepEqual(getCourseEnquiry('?course=%3Cscript%3E'), { type: 'invalid' });

console.log('12 contact enquiry assertions passed');
