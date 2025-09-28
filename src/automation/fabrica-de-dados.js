const unidecode = require('unidecode');

const PREPOPULATE_COUNT = 1000;

let fakerInstance = null;
let initializationPromise = null;
let commonFirstNames = null;
let commonLastNames = null;

function scheduleInitialization() {
  if (fakerInstance) {
    return Promise.resolve(fakerInstance);
  }

  if (!initializationPromise) {
    initializationPromise = (async () => {
      const { Faker, pt_BR } = await import('@faker-js/faker');
      const instance = new Faker({ locale: [pt_BR] });

      const firstNames = new Set();
      const lastNames = new Set();

      for (let index = 0; index < PREPOPULATE_COUNT; index += 1) {
        firstNames.add(unidecode(instance.person.firstName()));
        lastNames.add(unidecode(instance.person.lastName()));
      }

      fakerInstance = instance;
      commonFirstNames = firstNames;
      commonLastNames = lastNames;

      global.commonFirstNames = firstNames;
      global.commonLastNames = lastNames;

      return fakerInstance;
    })()
      .catch((error) => {
        fakerInstance = null;
        commonFirstNames = null;
        commonLastNames = null;
        throw error;
      })
      .finally(() => {
        initializationPromise = null;
      });
  }

  return initializationPromise;
}

async function initializeFaker(options = {}) {
  const { background = false } = options;
  const promise = scheduleInitialization();

  if (background) {
    promise.catch((error) => {
      console.warn('Falha ao executar warm-up do Faker:', error.message);
    });
    return null;
  }

  await promise;
  return fakerInstance;
}

const removeAccents = (text) => unidecode(text);
const cleanNick = (nick) => nick.replace(/[^a-zA-Z]/g, '').trim();

const findLongestMatchInList = (text, nameList) => {
  const cleanText = text.toLowerCase();
  let bestMatch = null;

  for (let i = 0; i < cleanText.length; i += 1) {
    for (let j = i + 1; j <= cleanText.length; j += 1) {
      const substring = cleanText.substring(i, j);
      const capitalizedSubstring = substring.charAt(0).toUpperCase() + substring.slice(1);

      if (nameList.has(capitalizedSubstring)) {
        if (!bestMatch || capitalizedSubstring.length > bestMatch.length) {
          bestMatch = capitalizedSubstring;
        }
      }
    }
  }

  return bestMatch;
};

function resolveCommonFirstNames() {
  return commonFirstNames || global.commonFirstNames || new Set();
}

function resolveCommonLastNames() {
  return commonLastNames || global.commonLastNames || new Set();
}

function ensureDifferentName(candidate, nickLower, fallbackGenerator) {
  let value = candidate;

  while (value && value.toLowerCase() === nickLower) {
    console.warn(`[Ajuste]: O primeiro nome ('${value}') era identico ao nickname. Gerando um novo.`);
    value = fallbackGenerator();
  }

  return value;
}

function generateComposedNameFromNick(nick) {
  const firstNameCache = resolveCommonFirstNames();
  const lastNameCache = resolveCommonLastNames();

  const nickClean = cleanNick(nick);
  const nickLower = nick.toLowerCase();

  if (nickClean.length >= 2) {
    const firstLetter = nickClean[0].toUpperCase();
    const possibleSurname = nickClean.charAt(1).toUpperCase() + nickClean.slice(2);

    if (lastNameCache.has(possibleSurname)) {
      const candidates = [...firstNameCache].filter((name) => name.startsWith(firstLetter));
      let firstName = candidates.length > 0
        ? fakerInstance.helpers.arrayElement(candidates)
        : fakerInstance.person.firstName();

      firstName = ensureDifferentName(firstName, nickLower, () => fakerInstance.person.firstName());
      const middleName = fakerInstance.person.lastName();

      return removeAccents(`${firstName} ${middleName} ${possibleSurname}`);
    }
  }

  let firstName = findLongestMatchInList(nickClean, firstNameCache)
    || (nickClean.charAt(0).toUpperCase() + nickClean.slice(1));
  firstName = ensureDifferentName(firstName, nickLower, () => fakerInstance.person.firstName());

  const lastName = findLongestMatchInList(nickClean, lastNameCache) || fakerInstance.person.lastName();
  const middleName = fakerInstance.person.lastName();

  return removeAccents(`${firstName} ${middleName} ${lastName}`);
}

function generateUsername() {
  const username = fakerInstance.internet.username().replace(/[^a-zA-Z0-9]/g, '');
  return username.slice(0, 10);
}

function generateCpf() {
  const numbers = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));

  const calcDigit = (arr) => {
    const sum = arr.reduce((accumulator, value, index) => (
      accumulator + value * (arr.length + 1 - index)
    ), 0);

    const digit = 11 - (sum % 11);
    return digit >= 10 ? 0 : digit;
  };

  const digitOne = calcDigit(numbers);
  const digitTwo = calcDigit([...numbers, digitOne]);
  const cpfArray = [...numbers, digitOne, digitTwo];

  return `${cpfArray.slice(0, 3).join('')}.${cpfArray.slice(3, 6).join('')}.${cpfArray.slice(6, 9).join('')}-${cpfArray.slice(9, 11).join('')}`;
}

async function generateUser() {
  await initializeFaker();

  const username = generateUsername();
  const fullName = generateComposedNameFromNick(username);
  const cpf = generateCpf();

  return { username, fullName, cpf };
}

async function generateMultipleUsers(count = 1) {
  await initializeFaker();

  const users = await Promise.all(
    Array.from({ length: count }, () => generateUser())
  );

  return users;
}

async function generatePassword(length = 12) {
  await initializeFaker();

  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.?';

  const allChars = lowercase + uppercase + numbers + symbols;

  let password = '';
  password += fakerInstance.helpers.arrayElement([...lowercase]);
  password += fakerInstance.helpers.arrayElement([...uppercase]);
  password += fakerInstance.helpers.arrayElement([...numbers]);
  password += fakerInstance.helpers.arrayElement([...symbols]);

  for (let index = 4; index < length; index += 1) {
    password += fakerInstance.helpers.arrayElement([...allChars]);
  }

  return password.split('').sort(() => Math.random() - 0.5).join('');
}

async function generateRandomNumbers(min = 1, max = 100, count = 1) {
  await initializeFaker();

  if (count === 1) {
    return fakerInstance.number.int({ min, max });
  }

  return Array.from({ length: count }, () => fakerInstance.number.int({ min, max }));
}

async function generatePhoneNumber() {
  await initializeFaker();

  const ddd = fakerInstance.number.int({ min: 11, max: 99 });
  const firstDigit = 9;
  const remainingDigits = [];

  for (let index = 0; index < 8; index += 1) {
    remainingDigits.push(fakerInstance.number.int({ min: 0, max: 9 }));
  }

  const remainingDigitsStr = remainingDigits.join('');

  return `${ddd.toString().padStart(2, '0')}${firstDigit}${remainingDigitsStr}`;
}

module.exports = {
  initializeFaker,
  generateUser,
  generateMultipleUsers,
  generatePassword,
  generateRandomNumbers,
  generatePhoneNumber,
};
