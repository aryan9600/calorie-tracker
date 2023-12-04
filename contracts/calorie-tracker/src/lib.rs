#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env};

#[contracttype]
pub enum DataKey {
    Counter(Address),
}

#[contract]
pub struct CalorieTracker;

#[contractimpl]
impl CalorieTracker {
    // Adds the provided calories to the user's calorie count.
    pub fn add(env: Env, user: Address, calories: u32) -> u32 {
        user.require_auth();
        let key = DataKey::Counter(user.clone());

        let mut current_calories: u32 = env.storage().persistent().get(&key).unwrap_or_default();
        current_calories += calories;
        env.storage().persistent().set(&key, &current_calories);

        current_calories
    }

    pub fn subtract(env: Env, user: Address, calories: u32) -> u32 {
        user.require_auth();
        let key = DataKey::Counter(user.clone());

        let mut current_calories: u32 = env.storage().persistent().get(&key).unwrap_or_default();
        current_calories -= calories;
        env.storage().persistent().set(&key, &current_calories);

        current_calories
    }

    pub fn get(env: Env, user: Address) -> u32 {
        user.require_auth();
        let key = DataKey::Counter(user.clone());

        let calories: u32 = env.storage().persistent().get(&key).unwrap_or_default();
        calories
    }
}
