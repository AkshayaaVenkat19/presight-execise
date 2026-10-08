const { getDbConnection } = require('../connection');
const { runMigrations } = require('../migrations');

const SAMPLE_FIRST_NAMES = [
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'William',
  'Mia', 'James', 'Charlotte', 'Benjamin', 'Amelia', 'Lucas', 'Harper', 'Henry', 'Evelyn', 'Alexander',
  'Aria', 'Sebastian', 'Ella', 'Jack', 'Chloe', 'Owen', 'Camila', 'Daniel', 'Penelope', 'Matthew',
  'Akira', 'Yuki', 'Carlos', 'Elena', 'Mateo', 'Sofia', 'Fatima', 'Tariq', 'Zainab', 'Omar',
  'Priya', 'Aarav', 'Ananya', 'Rohan', 'Meera', 'Lars', 'Freja', 'Sven', 'Astrid', 'Dimitri'
];

const SAMPLE_LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Tanaka', 'Sato', 'Kim', 'Chen', 'Patel', 'Sharma', 'Khan', 'Al-Mansoor', 'Dubois', 'Müller',
  'Nielsen', 'Ivanov', 'Kowalski', 'Rossi', 'Silva', 'Santos', 'O\'Connor', 'Murphy', 'Walsh', 'Novak'
];

const NATIONALITIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia', 'Germany', 'France', 'Japan', 'India',
  'Brazil', 'Mexico', 'Spain', 'Italy', 'Netherlands', 'Sweden', 'Norway', 'Singapore',
  'South Korea', 'United Arab Emirates', 'Egypt', 'South Africa', 'New Zealand', 'Ireland'
];

const HOBBIES_LIST = [
  'Reading', 'Gardening', 'Hiking', 'Cooking', 'Photography', 'Gaming', 'Painting', 'Traveling',
  'Cycling', 'Swimming', 'Running', 'Yoga', 'Writing', 'Music', 'Baking', 'Fishing',
  'Chess', 'Pottery', 'Astronomy', 'Bird Watching', 'Calligraphy', 'Scuba Diving', 'Skiing',
  'Woodworking', 'Knitting', 'Surfing', 'Rock Climbing', 'Archery', 'Dancing', 'Origami'
];

const DEFAULT_USER_COUNT = 1000;
const MIN_AGE = 18;
const MAX_AGE = 75;
const MAX_HOBBIES_PER_USER = 10;
const AVATAR_SIZE = 150;

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function getRandomElements(array, count) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
/** A uniformly random ISO date for someone currently between MIN_AGE and MAX_AGE. */
function getRandomBirthDate() {
  const today = new Date();
  const youngest = Date.UTC(today.getUTCFullYear() - MIN_AGE, today.getUTCMonth(), today.getUTCDate());
  const oldest = Date.UTC(today.getUTCFullYear() - MAX_AGE - 1, today.getUTCMonth(), today.getUTCDate() + 1);
  return new Date(getRandomInt(oldest, youngest)).toISOString().slice(0, 10);
}

async function seedDatabase(numUsers = DEFAULT_USER_COUNT, { onlyIfEmpty = false } = {}) {
  if (!Number.isSafeInteger(numUsers) || numUsers < 1) {
    throw new Error('Seed user count must be a positive integer');
  }
  await runMigrations();

  const db = await getDbConnection();

  // Lock before checking so separate startup processes cannot both seed.
  await db.exec('BEGIN IMMEDIATE;');
  try {
    if (onlyIfEmpty && await db.get('SELECT 1 FROM users LIMIT 1')) {
      await db.exec('COMMIT;');
      console.log('Existing directory found; skipping sample data.');
      return;
    }

    console.log(`Seeding database with ${numUsers} user records...`);
    // Cleanup and inserts commit together; a failed seed preserves prior data.
    await db.exec('DELETE FROM user_hobbies; DELETE FROM hobbies; DELETE FROM users;');
    for (const hobby of HOBBIES_LIST) {
      await db.run('INSERT INTO hobbies (name) VALUES (?)', hobby);
    }
    const hobbyRows = await db.all('SELECT id, name FROM hobbies');
    const hobbyMap = new Map(hobbyRows.map(h => [h.name, h.id]));

    // Generate Users & Assign 0-10 Hobbies per user
    for (let i = 1; i <= numUsers; i++) {
      const firstName = SAMPLE_FIRST_NAMES[Math.floor(Math.random() * SAMPLE_FIRST_NAMES.length)];
      const lastName = SAMPLE_LAST_NAMES[Math.floor(Math.random() * SAMPLE_LAST_NAMES.length)];
      const birthDate = getRandomBirthDate();
      const nationality = NATIONALITIES[Math.floor(Math.random() * NATIONALITIES.length)];
      const avatar = `https://i.pravatar.cc/${AVATAR_SIZE}?u=${i}`;

      const res = await db.run(
        'INSERT INTO users (avatar, first_name, last_name, birth_date, nationality) VALUES (?, ?, ?, ?, ?)',
        [avatar, firstName, lastName, birthDate, nationality]
      );
      const userId = res.lastID;

      // Assign 0 to 10 random hobbies per user as per README specs
      const hobbyCount = getRandomInt(0, MAX_HOBBIES_PER_USER);
      const selectedHobbies = getRandomElements(HOBBIES_LIST, hobbyCount);

      for (const hobbyName of selectedHobbies) {
        const hobbyId = hobbyMap.get(hobbyName);
        if (hobbyId) {
          await db.run('INSERT INTO user_hobbies (user_id, hobby_id) VALUES (?, ?)', [userId, hobbyId]);
        }
      }
    }
    await db.exec('COMMIT;');
    console.log(`Database successfully seeded with ${numUsers} users and associated hobbies.`);
  } catch (err) {
    await db.exec('ROLLBACK;');
    throw err;
  }
}

module.exports = { seedDatabase };

if (require.main === module) {
  seedDatabase().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
