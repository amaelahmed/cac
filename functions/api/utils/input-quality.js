import { normalizeUrlInput } from "../../../shared/normalizeUrlInput.js";

const LOW_QUALITY_VALUES = new Set([
  'test',
  'testing',
  'asdf',
  'qwerty',
  'abc',
  'abcd',
  'aaaa',
  'blah',
  'demo',
  'sample',
  'none',
  'nil',
  'na',
  'n/a',
  'xxx',
  'xyz',
  'random',
  'gibberish'
]);

export function isMeaningfulText(value, options = {}) {
  const minLength = options.minLength || 2;
  const minLetters = options.minLetters || 2;
  const raw = String(value || '').trim();
  const lower = raw.toLowerCase();

  if (raw.length < minLength) return false;
  if (LOW_QUALITY_VALUES.has(lower)) return false;
  if (/^(.)\1{2,}$/i.test(raw.replace(/\s+/g, ''))) return false;
  if (/^(123|1234|000|111|222|999)$/i.test(raw.replace(/\s+/g, ''))) return false;
  if (/(asdf|qwer|zxcv|lorem ipsum|dummy|fake business)/i.test(raw)) return false;

  const letters = raw.match(/[a-z]/gi) || [];
  if (letters.length < minLetters) return false;

  const uniqueLetters = new Set(letters.map(char => char.toLowerCase()));
  if (letters.length >= 5 && uniqueLetters.size <= 2) return false;

  return true;
}

export function isValidHttpUrl(value) {
  if (!value) return true;
  return normalizeUrlInput(value).ok;
}

export function validateBusinessPayload(biz = {}) {
  const errors = [];
  const requiredTextFields = [
    ['biz_name', 'Business name'],
    ['biz_industry', 'Industry'],
    ['biz_type', 'Business type'],
    ['biz_stage', 'Business stage'],
    ['biz_customer_model', 'Customer model'],
    ['biz_offer', 'Offer'],
    ['biz_audience', 'Audience'],
    ['biz_challenge', 'Challenge'],
    ['biz_usp', 'USP']
  ];

  for (const [field, label] of requiredTextFields) {
    if (!isMeaningfulText(biz[field], { minLength: 2, minLetters: 2 })) {
      errors.push({ field, message: `${label} needs a real answer.` });
    }
  }

  const businessType = String(biz.biz_type || '').toLowerCase();
  const needsLocation = !['online only', 'saas / subscription app', 'ai / vibe-coded app'].includes(businessType);
  if (needsLocation && !isMeaningfulText(biz.biz_location, { minLength: 3, minLetters: 3 })) {
    errors.push({ field: 'biz_location', message: 'Location needs a real city or market.' });
  }

  if (!Array.isArray(biz.goal) || biz.goal.length === 0) {
    errors.push({ field: 'goals', message: 'Choose at least one goal.' });
  }

  if (!Array.isArray(biz.platforms) || biz.platforms.length === 0) {
    errors.push({ field: 'platforms', message: 'Choose at least one platform.' });
  }

  if (!isValidHttpUrl(biz.biz_website)) {
    errors.push({ field: 'biz_website', message: 'Use a valid website URL.' });
  }

  if (!isValidHttpUrl(biz.biz_comp_website)) {
    errors.push({ field: 'biz_comp_website', message: 'Use a valid competitor URL.' });
  }

  return errors;
}
