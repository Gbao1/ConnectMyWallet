const LANGUAGE_TO_CURRENCY = {
  en: 'USD',
  bn: 'BDT',
  hi: 'INR',
  ur: 'PKR',
};

// Static FX rates from USD. Update as needed.
const FX_RATES = {
  USD: 1,
  BDT: 110,
  INR: 93.7,
  PKR: 280,
};

const LANGUAGE_TO_LOCALE = {
  en: 'en-US',
  bn: 'bn-BD',
  hi: 'hi-IN',
  ur: 'ur-PK',
};

export const getLanguageKey = (lang = 'en') => String(lang).split('-')[0];

export const getCurrencyForLanguage = (lang) => {
  const key = getLanguageKey(lang);
  return LANGUAGE_TO_CURRENCY[key] || LANGUAGE_TO_CURRENCY.en;
};

export const getDefaultFractionDigits = (currency) => (currency === 'USD' ? 2 : 0);

export const convertCurrency = (amount, fromCurrency, toCurrency) => {
  const fromRate = FX_RATES[fromCurrency] ?? 1;
  const toRate = FX_RATES[toCurrency] ?? 1;
  if (!fromRate || !toRate) return amount;
  return (amount / fromRate) * toRate;
};

export const getLocaleForLanguage = (lang) => {
  const key = getLanguageKey(lang);
  return LANGUAGE_TO_LOCALE[key] || LANGUAGE_TO_LOCALE.en;
};

export const formatCurrency = (value, lang, options = {}) => {
  if (value == null || value === '') return '';
  const amount = Number(value);
  if (Number.isNaN(amount)) return '';
  const locale = getLocaleForLanguage(lang);
  const currency = getCurrencyForLanguage(lang);
  const baseCurrency = options.baseCurrency || 'USD';
  const shouldConvert = options.convert !== false;
  const convertedAmount =
    shouldConvert && baseCurrency !== currency
      ? convertCurrency(amount, baseCurrency, currency)
      : amount;
  const maximumFractionDigits =
    options.maximumFractionDigits ?? getDefaultFractionDigits(currency);
  const minimumFractionDigits =
    options.minimumFractionDigits ?? maximumFractionDigits;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits,
    minimumFractionDigits,
    ...options,
  }).format(convertedAmount);
};

export const formatCurrencyRange = (min, max, lang, options = {}) => {
  if (min == null || max == null) return '';
  return `${formatCurrency(min, lang, options)} - ${formatCurrency(max, lang, options)}`;
};

export const formatCurrencyWithCode = (value, lang, currency, options = {}) => {
  if (value == null || value === '') return '';
  const amount = Number(value);
  if (Number.isNaN(amount)) return '';
  const locale = getLocaleForLanguage(lang);
  const maximumFractionDigits =
    options.maximumFractionDigits ?? getDefaultFractionDigits(currency);
  const minimumFractionDigits =
    options.minimumFractionDigits ?? maximumFractionDigits;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits,
    minimumFractionDigits,
    ...options,
  }).format(amount);
};

export const getCurrencySymbol = (lang) => {
  const locale = getLocaleForLanguage(lang);
  const currency = getCurrencyForLanguage(lang);
  const parts = new Intl.NumberFormat(locale, { style: 'currency', currency }).formatToParts(0);
  return parts.find((part) => part.type === 'currency')?.value || currency;
};
