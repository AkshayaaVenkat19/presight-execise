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

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomElements(array, count) {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

async function seedDatabase(numUsers = 1000) {
  console.log(`Seeding database with ${numUsers} user records...`);
  await runMigrations();

  const db = await getDbConnection();

  // Clear existing data
  await db.exec('DELETE FROM user_hobbies;');
  await db.exec('DELETE FROM hobbies;');
  await db.exec('DELETE FROM users;');

  // Insert All Hobbies into lookup table
  for (const hobby of HOBBIES_LIST) {
    await db.run('INSERT OR IGNORE INTO hobbies (name) VALUES (?)', hobby);
  }

  // Cache Hobby Name -> ID mapping
  const hobbyRows = await db.all('SELECT id, name FROM hobbies');
  const hobbyMap = new Map(hobbyRows.map(h => [h.name, h.id]));

  await db.exec('BEGIN TRANSACTION;');
  try {
    // Generate Users & Assign 0-10 Hobbies per user
    for (let i = 1; i <= numUsers; i++) {
      const firstName = SAMPLE_FIRST_NAMES[Math.floor(Math.random() * SAMPLE_FIRST_NAMES.length)];
      const lastName = SAMPLE_LAST_NAMES[Math.floor(Math.random() * SAMPLE_LAST_NAMES.length)];
      const age = getRandomInt(18, 75);
      const nationality = NATIONALITIES[Math.floor(Math.random() * NATIONALITIES.length)];
      const avatar = `https://i.pravatar.cc/150?u=${i}`;

      const res = await db.run(
        'INSERT INTO users (avatar, first_name, last_name, age, nationality) VALUES (?, ?, ?, ?, ?)',
        [avatar, firstName, lastName, age, nationality]
      );
      const userId = res.lastID;

      // Assign 0 to 10 random hobbies per user as per README specs
      const hobbyCount = getRandomInt(0, 10);
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
  seedDatabase().catch(console.error);
}
