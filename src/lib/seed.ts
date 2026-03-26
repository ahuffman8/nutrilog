import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'nutrilog.db');

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Ensure tables exist before seeding
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    age INTEGER NOT NULL,
    sex TEXT NOT NULL CHECK(sex IN ('male', 'female', 'other')),
    height_cm REAL NOT NULL,
    weight_kg REAL NOT NULL,
    goal_weight_kg REAL,
    activity_level TEXT NOT NULL CHECK(activity_level IN ('sedentary', 'lightly_active', 'moderately_active', 'very_active')),
    primary_goal TEXT NOT NULL CHECK(primary_goal IN ('lose_weight', 'maintain', 'build_muscle')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS daily_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    calories REAL NOT NULL,
    protein_g REAL NOT NULL,
    carbs_g REAL NOT NULL,
    fat_g REAL NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS food_log_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    meal_type TEXT NOT NULL CHECK(meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    raw_input TEXT NOT NULL,
    confirmed_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS food_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL,
    calories REAL NOT NULL,
    protein_g REAL NOT NULL,
    carbs_g REAL NOT NULL,
    fat_g REAL NOT NULL,
    sugar_g REAL NOT NULL,
    fiber_g REAL NOT NULL,
    FOREIGN KEY (entry_id) REFERENCES food_log_entries(id)
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    raw_input TEXT,
    activity_name TEXT NOT NULL,
    duration_minutes REAL NOT NULL,
    calories_burned REAL NOT NULL,
    met_value REAL,
    source TEXT NOT NULL DEFAULT 'manual',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS weight_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    weight_lbs REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS workout_performances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    exercise_name TEXT NOT NULL,
    exercise_type TEXT NOT NULL CHECK(exercise_type IN ('run', 'lift', 'cardio')),
    distance_miles REAL,
    time_seconds REAL,
    weight_lbs REAL,
    reps INTEGER,
    sets INTEGER,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

function getDateString(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

function seed() {
  // Check if user already exists
  const existingUser = db.prepare('SELECT id FROM users LIMIT 1').get();
  if (existingUser) {
    console.log('User already exists, skipping seed.');
    db.close();
    return;
  }

  console.log('Starting seed...');

  // 1. Create sample user
  const insertUser = db.prepare(`
    INSERT INTO users (name, age, sex, height_cm, weight_kg, goal_weight_kg, activity_level, primary_goal)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const userResult = insertUser.run('Alex', 28, 'male', 175, 75, 70, 'moderately_active', 'lose_weight');
  const userId = userResult.lastInsertRowid as number;
  console.log(`Created user Alex with id=${userId}`);

  // 2. Create daily goals
  const insertGoals = db.prepare(`
    INSERT INTO daily_goals (user_id, calories, protein_g, carbs_g, fat_g)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertGoals.run(userId, 1900, 130, 195, 63);
  console.log('Created daily goals');

  // 3. Food log entries for 7 days (days 7 through 1)
  const insertEntry = db.prepare(`
    INSERT INTO food_log_entries (user_id, date, meal_type, raw_input)
    VALUES (?, ?, ?, ?)
  `);
  const insertItem = db.prepare(`
    INSERT INTO food_items (entry_id, name, quantity, unit, calories, protein_g, carbs_g, fat_g, sugar_g, fiber_g)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const meals: Array<{
    meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    raw_input: string;
    items: Array<{
      name: string;
      quantity: number;
      unit: string;
      calories: number;
      protein_g: number;
      carbs_g: number;
      fat_g: number;
      sugar_g: number;
      fiber_g: number;
    }>;
  }> = [
    {
      meal_type: 'breakfast',
      raw_input: 'Oatmeal with blueberries and a protein shake',
      items: [
        { name: 'Oatmeal', quantity: 1, unit: 'cup', calories: 300, protein_g: 12, carbs_g: 54, fat_g: 5, sugar_g: 1, fiber_g: 8 },
        { name: 'Blueberries', quantity: 0.5, unit: 'cup', calories: 40, protein_g: 0.5, carbs_g: 10, fat_g: 0.3, sugar_g: 7, fiber_g: 1.8 },
        { name: 'Protein Shake', quantity: 1, unit: 'serving', calories: 150, protein_g: 25, carbs_g: 5, fat_g: 3, sugar_g: 2, fiber_g: 0.5 },
      ],
    },
    {
      meal_type: 'lunch',
      raw_input: 'Grilled chicken salad with avocado',
      items: [
        { name: 'Grilled Chicken Breast', quantity: 150, unit: 'g', calories: 250, protein_g: 46, carbs_g: 0, fat_g: 5, sugar_g: 0, fiber_g: 0 },
        { name: 'Mixed Greens', quantity: 2, unit: 'cups', calories: 20, protein_g: 2, carbs_g: 3, fat_g: 0.5, sugar_g: 1, fiber_g: 1.5 },
        { name: 'Avocado', quantity: 0.5, unit: 'medium', calories: 120, protein_g: 1.5, carbs_g: 6, fat_g: 11, sugar_g: 0.5, fiber_g: 5 },
      ],
    },
    {
      meal_type: 'dinner',
      raw_input: 'Salmon with roasted vegetables and quinoa',
      items: [
        { name: 'Salmon Fillet', quantity: 150, unit: 'g', calories: 350, protein_g: 34, carbs_g: 0, fat_g: 22, sugar_g: 0, fiber_g: 0 },
        { name: 'Roasted Vegetables', quantity: 1, unit: 'cup', calories: 80, protein_g: 3, carbs_g: 15, fat_g: 1, sugar_g: 5, fiber_g: 4 },
        { name: 'Quinoa', quantity: 0.75, unit: 'cup', calories: 170, protein_g: 6, carbs_g: 30, fat_g: 3, sugar_g: 0.5, fiber_g: 2.5 },
      ],
    },
    {
      meal_type: 'snack',
      raw_input: 'Greek yogurt with honey',
      items: [
        { name: 'Greek Yogurt', quantity: 150, unit: 'g', calories: 100, protein_g: 10, carbs_g: 7, fat_g: 0.7, sugar_g: 5, fiber_g: 0 },
        { name: 'Honey', quantity: 1, unit: 'teaspoon', calories: 21, protein_g: 0, carbs_g: 6, fat_g: 0, sugar_g: 6, fiber_g: 0 },
      ],
    },
  ];

  for (let daysAgo = 7; daysAgo >= 1; daysAgo--) {
    const date = getDateString(daysAgo);
    console.log(`Seeding food entries for ${date}...`);
    for (const meal of meals) {
      const entryResult = insertEntry.run(userId, date, meal.meal_type, meal.raw_input);
      const entryId = entryResult.lastInsertRowid as number;
      for (const item of meal.items) {
        insertItem.run(
          entryId,
          item.name,
          item.quantity,
          item.unit,
          item.calories,
          item.protein_g,
          item.carbs_g,
          item.fat_g,
          item.sugar_g,
          item.fiber_g,
        );
      }
    }
  }
  console.log('Created 7 days of food log entries');

  // 4. Activity log entries for the same 7 days
  const insertActivity = db.prepare(`
    INSERT INTO activity_log (user_id, date, raw_input, activity_name, duration_minutes, calories_burned, met_value, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  type ActivityDay = {
    activity_name: string;
    raw_input: string;
    duration_minutes: number;
    calories_burned: number;
    met_value: number;
  };

  const activities: ActivityDay[] = [
    { activity_name: 'Morning Run', raw_input: '30 minute run', duration_minutes: 30, calories_burned: 320, met_value: 9.8 },
    { activity_name: 'Walking', raw_input: '45 minute walk', duration_minutes: 45, calories_burned: 180, met_value: 3.5 },
    { activity_name: 'Strength Training', raw_input: '45 minute weight training', duration_minutes: 45, calories_burned: 270, met_value: 5.0 },
    { activity_name: 'Cycling', raw_input: '30 minute bike ride', duration_minutes: 30, calories_burned: 250, met_value: 7.5 },
    { activity_name: 'Morning Run', raw_input: '35 minute run', duration_minutes: 35, calories_burned: 370, met_value: 9.8 },
    { activity_name: 'Yoga', raw_input: '60 minute yoga session', duration_minutes: 60, calories_burned: 200, met_value: 3.0 },
    { activity_name: 'Strength Training', raw_input: '50 minute weight training', duration_minutes: 50, calories_burned: 300, met_value: 5.0 },
  ];

  for (let daysAgo = 7; daysAgo >= 1; daysAgo--) {
    const date = getDateString(daysAgo);
    const activity = activities[7 - daysAgo];
    insertActivity.run(
      userId,
      date,
      activity.raw_input,
      activity.activity_name,
      activity.duration_minutes,
      activity.calories_burned,
      activity.met_value,
      'manual',
    );
    console.log(`Seeded activity "${activity.activity_name}" for ${date}`);
  }
  console.log('Created 7 days of activity log entries');

  // 5. Weight log entries (check for existing data first)
  const existingWeight = db.prepare('SELECT id FROM weight_log LIMIT 1').get();
  if (!existingWeight) {
    const insertWeight = db.prepare(`
      INSERT INTO weight_log (user_id, date, weight_lbs)
      VALUES (?, ?, ?)
    `);

    const weightData: Array<{ daysAgo: number; weight_lbs: number }> = [
      { daysAgo: 7, weight_lbs: 186.2 },
      { daysAgo: 6, weight_lbs: 185.8 },
      { daysAgo: 5, weight_lbs: 185.5 },
      { daysAgo: 4, weight_lbs: 185.9 },
      { daysAgo: 3, weight_lbs: 185.1 },
      { daysAgo: 2, weight_lbs: 184.8 },
      { daysAgo: 1, weight_lbs: 184.5 },
    ];

    for (const { daysAgo, weight_lbs } of weightData) {
      const dayDate = new Date();
      dayDate.setDate(dayDate.getDate() - daysAgo);
      const dateStr = dayDate.toISOString().split('T')[0];
      insertWeight.run(userId, dateStr, weight_lbs);
      console.log(`Seeded weight ${weight_lbs} lbs for ${dateStr}`);
    }
    console.log('Created 7 days of weight log entries');
  } else {
    console.log('Weight log already has data, skipping.');
  }

  // 6. Workout performance entries (check for existing data first)
  const existingWorkout = db.prepare('SELECT id FROM workout_performances LIMIT 1').get();
  if (!existingWorkout) {
    const insertWorkout = db.prepare(`
      INSERT INTO workout_performances (user_id, date, exercise_name, exercise_type, distance_miles, time_seconds, weight_lbs, reps, sets, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    type WorkoutEntry = {
      daysAgo: number;
      exercise_name: string;
      exercise_type: 'run' | 'lift' | 'cardio';
      distance_miles?: number;
      time_seconds?: number;
      weight_lbs?: number;
      reps?: number;
      sets?: number;
      notes?: string;
    };

    const workouts: WorkoutEntry[] = [
      { daysAgo: 7, exercise_name: 'Bench Press', exercise_type: 'lift', weight_lbs: 175, reps: 5, sets: 3 },
      { daysAgo: 6, exercise_name: '1 Mile Run', exercise_type: 'run', distance_miles: 1, time_seconds: 510 },
      { daysAgo: 5, exercise_name: 'Back Squat', exercise_type: 'lift', weight_lbs: 225, reps: 5, sets: 3 },
      { daysAgo: 4, exercise_name: 'Bench Press', exercise_type: 'lift', weight_lbs: 180, reps: 5, sets: 3 },
      { daysAgo: 3, exercise_name: '2 Mile Run', exercise_type: 'run', distance_miles: 2, time_seconds: 1080 },
      { daysAgo: 2, exercise_name: 'Deadlift', exercise_type: 'lift', weight_lbs: 275, reps: 3, sets: 3 },
      { daysAgo: 1, exercise_name: '1 Mile Run', exercise_type: 'run', distance_miles: 1, time_seconds: 498 },
    ];

    for (const w of workouts) {
      const dayDate = new Date();
      dayDate.setDate(dayDate.getDate() - w.daysAgo);
      const dateStr = dayDate.toISOString().split('T')[0];
      insertWorkout.run(
        userId,
        dateStr,
        w.exercise_name,
        w.exercise_type,
        w.distance_miles ?? null,
        w.time_seconds ?? null,
        w.weight_lbs ?? null,
        w.reps ?? null,
        w.sets ?? null,
        w.notes ?? null,
      );
      console.log(`Seeded workout "${w.exercise_name}" for ${dateStr}`);
    }
    console.log('Created 7 workout performance entries');
  } else {
    console.log('Workout performances already has data, skipping.');
  }

  console.log('Seed complete!');
  db.close();
}

seed();
