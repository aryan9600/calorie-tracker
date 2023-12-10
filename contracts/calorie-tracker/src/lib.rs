#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, vec, Address, Env, Map, String, Vec};

#[contracttype]
pub enum DataKey {
    Counter(Address),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Op {
    Add,
    Subtract,
}

#[contract]
pub struct CalorieTracker;

#[contractimpl]
impl CalorieTracker {
    // Adds the provided calories to the user's calorie count.
    pub fn add(env: Env, user: Address, calories: u32, date: String) -> i32 {
        user.require_auth();

        let key = DataKey::Counter(user.clone());
        let val: Option<Map<String, Vec<(u32, Op)>>> = env.storage().persistent().get(&key);
        let mut total_calories: i32 = 0;
        if let Some(mut calorie_records) = val {
            let res: Option<Vec<(u32, Op)>> = calorie_records.get(date.clone());
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
                env.storage().persistent().set(&key, &calorie_records);
            } else {
                let calorie_vals = vec![&env, (calories, Op::Add)];
                calorie_records.set(date, calorie_vals);
                env.storage().persistent().set(&key, &calorie_records);
                total_calories = calories as i32;
            }
        } else {
            let mut calorie_records = Map::new(&env);
            let calorie_vals = vec![&env, (calories, Op::Add)];
            calorie_records.set(date, calorie_vals);
            env.storage().persistent().set(&key, &calorie_records);
            total_calories = calories as i32;
        }
        total_calories
    }

    pub fn subtract(env: Env, user: Address, calories: u32, date: String) -> i32 {
        user.require_auth();

        let key = DataKey::Counter(user.clone());
        let val: Option<Map<String, Vec<(u32, Op)>>> = env.storage().persistent().get(&key);
        let mut total_calories: i32 = 0;
        if let Some(mut calorie_records) = val {
            let res: Option<Vec<(u32, Op)>> = calorie_records.get(date.clone());
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
                env.storage().persistent().set(&key, &calorie_records);
            } else {
                let calorie_vals = vec![&env, (calories, Op::Subtract)];
                calorie_records.set(date, calorie_vals);
                env.storage().persistent().set(&key, &calorie_records);
                total_calories = calories as i32;
            }
        } else {
            let mut calorie_records = Map::new(&env);
            let calorie_vals = vec![&env, (calories, Op::Subtract)];
            calorie_records.set(date, calorie_vals);
            env.storage().persistent().set(&key, &calorie_records);
            total_calories = calories as i32;
        }
        total_calories
    }

    pub fn get(env: Env, user: Address, dates: Vec<String>) -> Map<String, i32> {
        user.require_auth();
        let key = DataKey::Counter(user.clone());

        let mut total_calories: Map<String, i32> = Map::new(&env);
        let val: Option<Map<String, Vec<(u32, Op)>>> = env.storage().persistent().get(&key);
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
