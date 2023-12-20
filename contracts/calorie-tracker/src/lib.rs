#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, vec, Address, Env, Map, String, Vec};

// DataKey has only one variant user information in the form of an Address.
#[contracttype]
pub enum DataKey {
    Counter(Address),
}

// Op is an enum with two variants:
// * Add represents an addition.
// * Subtract represents an subtraction
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Op {
    Add,
    Subtract,
}

// The main contract type.
#[contract]
pub struct CalorieTracker;

#[contractimpl]
impl CalorieTracker {
    // Figures out which user is requesting the transaction, fetches all records for the particular
    // user and then adds the provided calorie count with an `Op::Add` for the provided date. If its
    // a new user, creates the map for user and stores the provided info. It returns the total
    // calorie count for the user on the provided date.
    pub fn add(env: Env, user: Address, calories: u32, date: String) -> i32 {
        // We need the user to be authenticted.
        user.require_auth();

        let key = DataKey::Counter(user.clone());
        // The user's calorie records.
        let val: Option<Map<String, Vec<(u32, Op)>>> = env.storage().instance().get(&key);
        // The total calorie count for the provided date for the user.
        let mut total_calories: i32 = 0;

        env.storage().instance().extend_ttl(103680, 120960);
        if let Some(mut calorie_records) = val {
            // Get the calorie records for the provided date.
            let res: Option<Vec<(u32, Op)>> = calorie_records.get(date.clone());
            // Append the calorie count with Op::Add, then loop through each record and apply each
            // operation to the calorie count and the total calorie count.
            if let Some(mut calorie_vals) = res {
                calorie_vals.push_back((calories, Op::Add));
                calorie_vals.iter().for_each(|val| {
                    if val.1 == Op::Add {
                        total_calories += val.0 as i32;
                    } else {
                        total_calories -= val.0 as i32;
                    }
                });
                calorie_records.set(date, calorie_vals);
                env.storage().instance().set(&key, &calorie_records);
            // If this is the first calorie record for this date, then create a new list and record
            // it.
            } else {
                let calorie_vals = vec![&env, (calories, Op::Add)];
                calorie_records.set(date, calorie_vals);
                env.storage().instance().set(&key, &calorie_records);
                total_calories = calories as i32;
            }
        // If this is a new user, then create the map which will contain all their records and
        // store it.
        } else {
            let mut calorie_records = Map::new(&env);
            let calorie_vals = vec![&env, (calories, Op::Add)];
            calorie_records.set(date, calorie_vals);
            env.storage().instance().set(&key, &calorie_records);
            total_calories = calories as i32;
        }
        total_calories
    }

    // Figures out which user is requesting the transaction, fetches all records for the particular
    // user and then adds the provided calorie count with an `Op::Subtract` for the provided date. If its
    // a new user, creates the map for user and stores the provided info. It returns the total
    // calorie count for the user on the provided date.
    pub fn subtract(env: Env, user: Address, calories: u32, date: String) -> i32 {
        // We need the user to be authenticted.
        user.require_auth();

        env.storage().instance().extend_ttl(103680, 120960);
        let key = DataKey::Counter(user.clone());
        // The user's calorie records.
        let val: Option<Map<String, Vec<(u32, Op)>>> = env.storage().instance().get(&key);
        // The total calorie count for the provided date for the user.
        let mut total_calories: i32 = 0;
        if let Some(mut calorie_records) = val {
            let res: Option<Vec<(u32, Op)>> = calorie_records.get(date.clone());
            // Append the calorie count with Op::Subtract, then loop through each record and apply
            // each operation to the calorie count and the total calorie count.
            if let Some(mut calorie_vals) = res {
                calorie_vals.push_back((calories, Op::Subtract));
                calorie_vals.iter().for_each(|val| {
                    if val.1 == Op::Add {
                        total_calories += val.0 as i32;
                    } else {
                        total_calories -= val.0 as i32;
                    }
                });
                calorie_records.set(date, calorie_vals);
                env.storage().instance().set(&key, &calorie_records);
            // If this is the first calorie record for this date, then create a new list and record
            // it.
            } else {
                let calorie_vals = vec![&env, (calories, Op::Subtract)];
                calorie_records.set(date, calorie_vals);
                env.storage().instance().set(&key, &calorie_records);
                total_calories = calories as i32;
            }
        // If this is a new user, then create the map which will contain all their records and
        // store it.
        } else {
            let mut calorie_records = Map::new(&env);
            let calorie_vals = vec![&env, (calories, Op::Subtract)];
            calorie_records.set(date, calorie_vals);
            env.storage().instance().set(&key, &calorie_records);
            total_calories = calories as i32;
        }

        total_calories
    }

    // Accepts a list of dates and returns the total calorie count for each date for the user.
    pub fn get(env: Env, user: Address, dates: Vec<String>) -> Map<String, i32> {
        user.require_auth();
        let key = DataKey::Counter(user.clone());

        env.storage().instance().extend_ttl(103680, 120960);
        let mut total_calories: Map<String, i32> = Map::new(&env);
        let val: Option<Map<String, Vec<(u32, Op)>>> = env.storage().instance().get(&key);
        if let Some(calorie_records) = val {
            for date in dates {
                let mut calories: i32 = 0;
                let res: Option<Vec<(u32, Op)>> = calorie_records.get(date.clone());
                if let Some(calorie_vals) = res {
                    calorie_vals.iter().for_each(|val| {
                        if val.1 == Op::Add {
                            calories += val.0 as i32;
                        } else {
                            calories -= val.0 as i32;
                        }
                    });
                }
                total_calories.set(date.clone(), calories);
            }
        }
        total_calories
    }
}
